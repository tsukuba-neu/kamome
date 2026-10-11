import {
  fetchGuildId,
  fetchMessages,
  postMessageToChannel,
  addReaction,
} from "./services/discord";
import { extractEventsFromMessage } from "./services/gemini";
import {
  syncEvents,
  getEventsForDate,
  extractSourceUrl,
} from "./services/calendar";
import { setLastRunTime } from "./config";
import { formatDate } from "./utils/date";
import { removeEmoji } from "./utils/string";
import { TransientError } from "./utils/errors";

declare const global: {
  syncDiscordEventsToCalendar: () => void;
  sendDailyReminders: () => void;
};

/**
 * 一時エラーはログのみで正常終了させ、それ以外のエラーは再スローしてGAS実行失敗として報告する
 */
function runWithErrorHandling(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    if (error instanceof TransientError) {
      console.warn(`${name} aborted due to transient error: ${error.message}`);
      return;
    }
    throw error;
  }
}

/**
 * 定期実行用: DiscordメッセージからイベントをGoogleカレンダーに同期
 * GASトリガーから呼び出される
 *
 * メッセージを古い順に1件ずつ処理し、完了したメッセージの投稿時刻まで LAST_RUN_TIME を進める。
 * 途中で失敗した場合、未完了のメッセージは次回実行時に再試行される。
 */
global.syncDiscordEventsToCalendar = function (): void {
  runWithErrorHandling("Sync", () => {
    console.log("Starting Discord to Calendar sync...");

    // 1. Discordからメッセージ取得
    const messages = fetchMessages();
    console.log(`Fetched ${messages.length} messages`);

    if (messages.length === 0) {
      console.log("No new messages to process");
      return;
    }

    const guildId = fetchGuildId();

    for (const message of messages) {
      // 2. Geminiでイベント抽出
      const events = extractEventsFromMessage(message, guildId);
      console.log(
        `Extracted ${events.length} events from message ${message.id}`,
      );

      if (events.length > 0) {
        // 3. カレンダーに同期
        syncEvents(events);

        // 4. イベントが抽出されたメッセージにリアクションを追加
        addReaction(message.id, "👍");
        addReaction(message.id, "🦢");
      }

      // 5. 処理済みメッセージの投稿時刻まで最終実行時刻を進める
      setLastRunTime(new Date(message.timestamp));
    }

    console.log("Sync completed");
  });
};

/**
 * 時間指定実行用: 今日/明日のイベントをDiscordにリマインド
 * 15:00を境に当日/翌日を判定
 */
global.sendDailyReminders = function (): void {
  runWithErrorHandling("Daily reminders", sendDailyRemindersImpl);
};

function sendDailyRemindersImpl(): void {
  console.log("Starting daily reminders...");

  const now = new Date();
  const currentHour = now.getHours();

  // 15:00以降は翌日、それ以前は当日
  const targetDate = new Date(now);
  if (currentHour >= 15) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const events = getEventsForDate(targetDate);

  if (events.length === 0) {
    console.log("No events to remind");
    return;
  }

  // リマインドメッセージを構築
  const dateStr = formatDate(
    targetDate,
    `[${formatDate(targetDate, "YYMMDD")}](https://scrapbox.io/neu/${formatDate(targetDate, "YYMMDD")})${formatDate(targetDate, "W")}`,
  );
  const eventList = events
    .map((e) => {
      const time = e.isAllDayEvent()
        ? "☀️ "
        : formatDate(e.getStartTime(), "HH:mm");
      const location = e.getLocation();
      const locationStr = location ? `@ ${location}` : "";

      // Extract source URL from description
      const sourceUrl = extractSourceUrl(e.getDescription());
      const title = removeEmoji(e.getTitle()).trim() || e.getTitle();
      const titleString = sourceUrl ? `[${title}](${sourceUrl})` : title;

      return `- ${time} ${titleString} ${locationStr}`;
    })
    .join("\n");

  const message = `## 📆 ${dateStr}\n${eventList}`;

  postMessageToChannel(message);
  console.log("Reminders sent");
}

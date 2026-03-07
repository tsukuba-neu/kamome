import {
  fetchMessages,
  postMessageToChannel,
  addReaction,
} from "./services/discord";
import { extractEvents } from "./services/gemini";
import {
  syncEvents,
  getEventsForDate,
  extractSourceUrl,
} from "./services/calendar";
import { setLastRunTime } from "./config";
import { formatDate, formatTime } from "./utils/date";

declare const global: {
  syncDiscordEventsToCalendar: () => void;
  sendDailyReminders: () => void;
};

/**
 * 定期実行用: DiscordメッセージからイベントをGoogleカレンダーに同期
 * GASトリガーから呼び出される
 */
global.syncDiscordEventsToCalendar = function (): void {
  console.log("Starting Discord to Calendar sync...");

  // 1. Discordからメッセージ取得
  const messages = fetchMessages();
  console.log(`Fetched ${messages.length} messages`);

  if (messages.length === 0) {
    console.log("No new messages to process");
    setLastRunTime(new Date());
    return;
  }

  // 2. Geminiでイベント抽出
  const events = extractEvents(messages);
  console.log(`Extracted ${events.length} events`);

  // 3. カレンダーに同期
  if (events.length > 0) {
    syncEvents(events);

    // 4. イベントが抽出されたメッセージに+1リアクションを追加
    const processedMessageIds = new Set(events.map((e) => e.sourceMessage.id));
    for (const messageId of processedMessageIds) {
      addReaction(messageId, "🐟️");
    }
  }

  // 5. 最終実行時刻を更新
  setLastRunTime(new Date());

  console.log("Sync completed");
};

/**
 * 時間指定実行用: 今日/明日のイベントをDiscordにリマインド
 * 15:00を境に当日/翌日を判定
 */
global.sendDailyReminders = function (): void {
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
  const dateStr = formatDate(targetDate);
  const eventList = events
    .map((e) => {
      const time = e.isAllDayEvent()
        ? "☀️ "
        : formatTime(e.getStartTime() as unknown as Date);
      const location = e.getLocation();
      const locationStr = location ? ` @ ${location}` : "";

      // Extract source URL from description
      const sourceUrl = extractSourceUrl(e.getDescription());
      const titleString = sourceUrl
        ? ` [${e.getTitle()}](${sourceUrl})`
        : e.getTitle();

      return `- ${time} ${titleString}${locationStr}`;
    })
    .join("\n");

  const message = `## 📆 ${dateStr}\n${eventList}`;

  const isSent = postMessageToChannel(message);
  if (isSent) {
    console.log("Reminders sent");
  }
};

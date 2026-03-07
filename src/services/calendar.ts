import type { EventWithSource } from "../types";
import { getConfig } from "../config";
import { getDayStart, getDayEnd } from "../utils/date";

/**
 * 元メッセージURLを含む説明欄を構築
 */
function buildDescription(event: EventWithSource): string | undefined {
  const parts: string[] = [];

  if (event.description) {
    parts.push(event.description);
    parts.push(`\n---\n`);
  }

  // Add source message link with marker for parsing (if available)
  if (event.sourceMessageUrl) {
    parts.push(`Source: ${event.sourceMessageUrl}`);
  }

  parts.push(event.sourceMessage.content);

  return parts.length > 0 ? parts.join("\n") : undefined;
}

/**
 * カレンダーイベントの説明欄から元メッセージURLを抽出
 */
export function extractSourceUrl(description: string | null): string | null {
  if (!description) return null;

  const match = description.match(
    /Source: (https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+)/,
  );
  return match ? match[1] : null;
}

/**
 * イベントをGoogleカレンダーに登録（重複排除付き）
 */
export function syncEvents(events: EventWithSource[]): void {
  const config = getConfig();
  const calendar = CalendarApp.getCalendarById(config.calendarId);

  if (!calendar) {
    console.log(`Calendar not found: ${config.calendarId}`);
    return;
  }

  for (const event of events) {
    try {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      // 重複チェック: 同日の開始時刻とタイトルが一致する場合スキップ
      if (isDuplicate(calendar, event.title, startTime)) {
        console.log(`Skipping duplicate event: ${event.title}`);
        continue;
      }

      // Build description with source link
      const description = buildDescription(event);

      // イベント作成
      const calendarEvent = calendar.createEvent(
        event.title,
        startTime,
        endTime,
        {
          location: event.location ?? undefined,
          description: description,
        },
      );

      // Enhanced logging with start/end times
      console.log(
        `Created event: ${event.title} (${startTime.toISOString()}-${endTime.toISOString()}) [https://www.google.com/calendar/event?eid=${calendarEvent.getId()}]`,
      );
    } catch (error) {
      console.log(`Failed to create event "${event.title}": ${error}`);
    }
  }
}

/**
 * 重複チェック
 */
function isDuplicate(
  calendar: GoogleAppsScript.Calendar.Calendar,
  title: string,
  startTime: Date,
): boolean {
  const dayStart = getDayStart(startTime);
  const dayEnd = getDayEnd(startTime);

  const existingEvents = calendar.getEvents(dayStart, dayEnd);

  return existingEvents.some((e) => {
    const sameTitle = e.getTitle() === title;
    const sameStartTime = e.getStartTime().getTime() === startTime.getTime();
    return sameTitle && sameStartTime;
  });
}

/**
 * 指定日のイベントを取得
 */
export function getEventsForDate(
  targetDate: Date,
): GoogleAppsScript.Calendar.CalendarEvent[] {
  const config = getConfig();
  const calendar = CalendarApp.getCalendarById(config.calendarId);

  if (!calendar) {
    console.log(`Calendar not found: ${config.calendarId}`);
    return [];
  }

  const dayStart = getDayStart(targetDate);
  const dayEnd = getDayEnd(targetDate);

  return calendar.getEvents(dayStart, dayEnd);
}

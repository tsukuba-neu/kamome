import type { Event } from "../types";
import { getConfig } from "../config";
import { getDayStart, getDayEnd } from "../utils/date";

/**
 * イベントをGoogleカレンダーに登録（重複排除付き）
 */
export function syncEvents(events: Event[]): void {
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

      // イベント作成
      const calendarEvent = calendar.createEvent(
        event.title,
        startTime,
        endTime,
        {
          location: event.location ?? undefined,
          description: event.description ?? undefined,
        },
      );

      console.log(`Created event: ${event.title} (${calendarEvent.getId()})`);
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

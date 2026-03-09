import type { Event, EventWithSource } from "../types";
import { getConfig } from "../config";
import { getDayStart, getDayEnd } from "../utils/date";
import { isDuplicateEventByGemini } from "./gemini";
import { fetchGuildId } from "./discord";

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
    /https:\/\/discord\.com\/channels\/(\d+)\/\d+\/\d+/,
  );

  // Guild IDが異なる場合は無効とする
  if (match) {
    const config = getConfig();
    const guildId = match[1];
    const expectedGuildId = fetchGuildId();
    if (guildId !== expectedGuildId) {
      console.log(
        `Guild ID mismatch: expected ${expectedGuildId}, got ${guildId}`,
      );
      return null;
    }
    return match[0];
  }
  return null;
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

  const dayEventsCache = new Map<
    string,
    GoogleAppsScript.Calendar.CalendarEvent[]
  >();

  for (const event of events) {
    try {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      const dayStart = getDayStart(startTime);
      const dayEnd = getDayEnd(startTime);
      const dayKey = dayStart.toISOString();

      if (!dayEventsCache.has(dayKey)) {
        dayEventsCache.set(dayKey, calendar.getEvents(dayStart, dayEnd));
      }

      const existingEvents = dayEventsCache.get(dayKey) ?? [];
      const existingCandidates: Event[] = existingEvents.map((e) => ({
        title: e.getTitle(),
        startTime: e.getStartTime().toISOString(),
        endTime: e.getEndTime().toISOString(),
        location: e.getLocation() || undefined,
        description: e.getDescription() || undefined,
      }));

      // Geminiによる重複チェック
      if (isDuplicateEventByGemini(event, existingCandidates)) {
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

      existingEvents.push(calendarEvent);
    } catch (error) {
      console.log(`Failed to create event "${event.title}": ${error}`);
    }
  }
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

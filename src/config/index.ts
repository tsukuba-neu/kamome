import type { AppConfig } from "../types";

const PROPERTY_KEYS = {
  DISCORD_PROXY_URL: "DISCORD_PROXY_URL",
  DISCORD_BOT_TOKEN: "DISCORD_BOT_TOKEN",
  SCHEDULE_CHANNEL_ID: "SCHEDULE_CHANNEL_ID",
  REMIND_WEBHOOK_URL: "REMIND_WEBHOOK_URL",
  CALENDAR_ID: "CALENDAR_ID",
  LAST_RUN_TIME: "LAST_RUN_TIME",
  GEMINI_API_KEY: "GEMINI_API_KEY",
} as const;

/**
 * Script Propertiesから設定を取得
 */
export function getConfig(): AppConfig {
  const props = PropertiesService.getScriptProperties();
  return {
    discordProxyUrl: props.getProperty(PROPERTY_KEYS.DISCORD_PROXY_URL) ?? "",
    discordBotToken: props.getProperty(PROPERTY_KEYS.DISCORD_BOT_TOKEN) ?? "",
    scheduleChannelId:
      props.getProperty(PROPERTY_KEYS.SCHEDULE_CHANNEL_ID) ?? "",
    remindWebhookUrl:
      props.getProperty(PROPERTY_KEYS.REMIND_WEBHOOK_URL) ?? "",
    calendarId: props.getProperty(PROPERTY_KEYS.CALENDAR_ID) ?? "",
    geminiApiKey: props.getProperty(PROPERTY_KEYS.GEMINI_API_KEY) ?? "",
  };
}

/**
 * 最終実行時刻を取得
 */
export function getLastRunTime(): Date | null {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(PROPERTY_KEYS.LAST_RUN_TIME);
  return value ? new Date(value) : null;
}

/**
 * 最終実行時刻を更新
 */
export function setLastRunTime(date: Date): void {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROPERTY_KEYS.LAST_RUN_TIME, date.toISOString());
}

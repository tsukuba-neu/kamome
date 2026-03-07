/**
 * Discordから抽出されたイベント情報
 */
export interface Event {
  title: string;
  startTime: string; // ISO 8601形式
  endTime: string; // ISO 8601形式
  location?: string;
  description?: string;
}

/**
 * Discord APIのメッセージオブジェクト（v10準拠）
 */
export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  timestamp: string; // ISO 8601形式
}

/**
 * アプリケーション設定（PropertiesServiceから取得）
 */
export interface AppConfig {
  discordProxyUrl: string;
  discordBotToken: string;
  scheduleChannelId: string;
  remindWebhookUrl: string;
  calendarId: string;
  geminiApiKey: string;
}

/**
 * Gemini API Function Calling response
 */
export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        functionCall?: {
          name: string;
          args: {
            events: Event[];
          };
        };
      }>;
    };
  }>;
}

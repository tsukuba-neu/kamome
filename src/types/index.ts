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
 * 元メッセージ情報を含むイベント（カレンダー同期用）
 */
export interface EventWithSource extends Event {
  sourceMessage: DiscordMessage;
  sourceMessageUrl?: string;
}

/**
 * Geminiから返されるイベント（messageIndex付き）
 */
export interface ExtractedEvent extends Event {
  messageIndex: number;
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
  message_snapshots: {
    message: Pick<DiscordMessage, "id" | "content" | "timestamp">;
  }[];
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
            events: ExtractedEvent[];
          };
        };
      }>;
    };
  }>;
}

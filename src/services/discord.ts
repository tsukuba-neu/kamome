import type { DiscordMessage } from "../types";
import { getConfig, getLastRunTime } from "../config";
import { fetchWithClassification } from "../utils/errors";

/**
 * Discordプロキシにリクエストを送信
 * 失敗時は TransientError（再試行可能）または Error（恒久）を投げる
 */
function requestDiscord(
  method: GoogleAppsScript.URL_Fetch.HttpMethod,
  path: string,
  context: string,
  payload?: unknown,
): GoogleAppsScript.URL_Fetch.HTTPResponse {
  const config = getConfig();
  // Cloud Run認証用のIDトークンを取得
  const idToken = ScriptApp.getIdentityToken();

  return fetchWithClassification(
    `${config.discordProxyUrl}${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Discord-Authorization": `Bot ${config.discordBotToken}`,
      },
      payload: payload === undefined ? undefined : JSON.stringify(payload),
    },
    context,
  );
}

/**
 * チャンネル情報からguild_idを取得
 */
export function fetchGuildId(): string | null {
  const config = getConfig();
  const response = requestDiscord(
    "get",
    `/v10/channels/${config.sourceChannelId}`,
    "Failed to fetch channel info",
  );

  const channel = JSON.parse(response.getContentText());
  return channel.guild_id ?? null;
}

/**
 * ユーザーが投稿した内容を持つメッセージ種別
 * スレッド作成通知（18）やピン留め通知などのシステムメッセージは対象外
 * https://discord.com/developers/docs/resources/message#message-object-message-types
 */
const USER_MESSAGE_TYPES = new Set([
  0, // DEFAULT
  19, // REPLY
]);

/**
 * LAST_RUN_TIME以降のメッセージをプロキシ経由で取得（古い順）
 * ボットメッセージとシステムメッセージは除外
 */
export function fetchMessages(): DiscordMessage[] {
  const config = getConfig();
  const lastRunTime = getLastRunTime();

  if (!lastRunTime) {
    console.log("No last run time found, aborting fetch");
    return [];
  }

  // プロキシURL構築: https://{host}/v10/channels/{channelId}/messages
  const response = requestDiscord(
    "get",
    `/v10/channels/${config.sourceChannelId}/messages`,
    "Discord proxy error",
  );

  const messages: DiscordMessage[] = JSON.parse(response.getContentText());

  // ボット・システムメッセージを除外し、LAST_RUN_TIME以降のメッセージのみ取得
  return messages
    .filter(
      (msg) =>
        USER_MESSAGE_TYPES.has(msg.type) &&
        !msg.author.bot &&
        new Date(msg.timestamp) > lastRunTime,
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

/**
 * Discord API経由でチャンネルにメッセージをPOST
 */
export function postMessageToChannel(content: string): void {
  const config = getConfig();
  requestDiscord(
    "post",
    `/v10/channels/${config.notificationChannelId}/messages`,
    "Failed to post message",
    { content },
  );
}

/**
 * メッセージにリアクションを追加
 * Discord API: PUT /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me
 */
export function addReaction(messageId: string, emoji: string): void {
  const config = getConfig();

  // URL-encode the emoji
  const encodedEmoji = encodeURIComponent(emoji);

  requestDiscord(
    "put",
    `/v10/channels/${config.sourceChannelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
    `Failed to add reaction ${emoji} to message ${messageId}`,
  );
  console.log(`Added reaction ${emoji} to message ${messageId}`);
}

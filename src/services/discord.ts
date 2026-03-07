import type { DiscordMessage } from "../types";
import { getConfig, getLastRunTime } from "../config";

/**
 * チャンネル情報からguild_idを取得
 */
export function fetchGuildId(): string | null {
  const config = getConfig();
  const url = `${config.discordProxyUrl}/v10/channels/${config.sourceChannelId}`;

  try {
    const idToken = ScriptApp.getIdentityToken();

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Discord-Authorization": `Bot ${config.discordBotToken}`,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      console.log(`Failed to fetch channel info: ${response.getContentText()}`);
      return null;
    }

    const channel = JSON.parse(response.getContentText());
    return channel.guild_id ?? null;
  } catch (error) {
    console.log(`Failed to fetch guild ID: ${error}`);
    return null;
  }
}

/**
 * LAST_RUN_TIME以降のメッセージをプロキシ経由で取得
 * ボットメッセージは除外
 */
export function fetchMessages(): DiscordMessage[] {
  const config = getConfig();
  const lastRunTime = getLastRunTime();

  if (!lastRunTime) {
    console.log("No last run time found, aborting fetch");
    return [];
  }

  // プロキシURL構築: https://{host}/v10/channels/{channelId}/messages
  const url = `${config.discordProxyUrl}/v10/channels/${config.sourceChannelId}/messages`;

  try {
    // Cloud Run認証用のIDトークンを取得
    const idToken = ScriptApp.getIdentityToken();

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Discord-Authorization": `Bot ${config.discordBotToken}`,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      console.log(`Discord proxy error: ${response.getContentText()}`);
      return [];
    }

    const messages: DiscordMessage[] = JSON.parse(response.getContentText());

    // ボットメッセージを除外し、LAST_RUN_TIME以降のメッセージのみ取得
    return messages.filter((msg) => {
      if (msg.author.bot) {
        return false;
      }
      if (lastRunTime) {
        const msgTime = new Date(msg.timestamp);
        return msgTime > lastRunTime;
      }
      return false;
    });
  } catch (error) {
    console.log(`Failed to fetch Discord messages: ${error}`);
    return [];
  }
}

/**
 * Discord API経由でチャンネルにメッセージをPOST
 */
export function postMessageToChannel(content: string): boolean {
  const config = getConfig();
  const url = `${config.discordProxyUrl}/v10/channels/${config.notificationChannelId}/messages`;

  try {
    const idToken = ScriptApp.getIdentityToken();

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Discord-Authorization": `Bot ${config.discordBotToken}`,
      },
      payload: JSON.stringify({ content }),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      return true;
    }

    console.log(
      `Failed to post message: ${response.getResponseCode()} ${response.getContentText()}`,
    );
    return false;
  } catch (error) {
    console.log(`Failed to post message to Discord: ${error}`);
    return false;
  }
}

/**
 * メッセージにリアクションを追加
 * Discord API: PUT /channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me
 */
export function addReaction(messageId: string, emoji: string): boolean {
  const config = getConfig();

  // URL-encode the emoji
  const encodedEmoji = encodeURIComponent(emoji);

  const url = `${config.discordProxyUrl}/v10/channels/${config.sourceChannelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`;

  try {
    const idToken = ScriptApp.getIdentityToken();

    const response = UrlFetchApp.fetch(url, {
      method: "put",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Discord-Authorization": `Bot ${config.discordBotToken}`,
      },
      muteHttpExceptions: true,
    });

    // Discord returns 204 No Content on success
    if (response.getResponseCode() === 204) {
      console.log(`Added reaction ${emoji} to message ${messageId}`);
      return true;
    } else {
      console.log(
        `Failed to add reaction: ${response.getResponseCode()} ${response.getContentText()}`,
      );
      return false;
    }
  } catch (error) {
    console.log(`Failed to add reaction to message ${messageId}: ${error}`);
    return false;
  }
}

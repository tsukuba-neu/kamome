import type { DiscordMessage } from "../types";
import { getConfig, getLastRunTime } from "../config";

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
  const url = `${config.discordProxyUrl}/v10/channels/${config.scheduleChannelId}/messages`;

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
 * WebhookにメッセージをPOST
 */
export function postToWebhook(content: string): void {
  const config = getConfig();

  try {
    UrlFetchApp.fetch(config.remindWebhookUrl, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      payload: JSON.stringify({ content }),
      muteHttpExceptions: true,
    });
  } catch (error) {
    console.log(`Failed to post to webhook: ${error}`);
  }
}

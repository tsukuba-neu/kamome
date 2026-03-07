import type { EventWithSource, DiscordMessage, GeminiResponse } from "../types";
import { getConfig } from "../config";
import { fetchGuildId } from "./discord";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const EXTRACTION_PROMPT = `Extract event information from the following Discord messages.
Each message is prefixed with [MESSAGE_INDEX: N] where N is the message index (0-based).
For each extracted event, include the messageIndex field indicating which message it came from.
If multiple events are found in a single message, extract all of them with the same messageIndex.
Use original language in the message for title and description, but convert datetime to ISO 8601 format with timezone (+09:00).
If no events are found, call the function with an empty array.
If duration of the event is not specified, follow these rules:
- a single date without time, assume as 9:00 - 21:00.
- a single date with time, assume a default duration of 3 hours.

Messages:
`;

const EVENT_EXTRACTION_TOOL = {
  function_declarations: [
    {
      name: "register_events",
      description:
        "Register extracted event information from Discord messages to the calendar",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            description: "List of extracted events",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Event title",
                },
                startTime: {
                  type: "string",
                  description:
                    "Event start time in ISO 8601 format (e.g., 2024-01-15T19:00:00+09:00)",
                },
                endTime: {
                  type: "string",
                  description:
                    "Event end time in ISO 8601 format (e.g., 2024-01-15T21:00:00+09:00)",
                },
                location: {
                  type: "string",
                  description: "Event location (optional)",
                },
                description: {
                  type: "string",
                  description: "Event description or details (optional)",
                },
                messageIndex: {
                  type: "integer",
                  description:
                    "Index of the source message (0-based) this event was extracted from",
                },
              },
              required: ["title", "startTime", "endTime", "messageIndex"],
            },
          },
        },
        required: ["events"],
      },
    },
  ],
};

/**
 * Build Discord message URL
 */
function buildMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string,
): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Extract events from Discord messages using Gemini API with Function Calling
 * Returns events with source message information attached
 */
export function extractEvents(messages: DiscordMessage[]): EventWithSource[] {
  if (messages.length === 0) {
    return [];
  }

  const config = getConfig();
  const guildId = fetchGuildId();

  // Format messages with indices for Gemini
  const messagesText = messages
    .map((m, index) => {
      let msg = `[MESSAGE_INDEX: ${index}]\nPosted at ${m.timestamp}\n${m.content}`;

      // Include forwarded message snapshots if available
      const snapshots = m.message_snapshots;
      if (snapshots?.length > 0) {
        msg += snapshots
          .map(
            (s) =>
              `Forwarded:\nPosted at ${s.message.timestamp}\n${s.message.content}`,
          )
          .join("\n\n");
      }

      return msg;
    })
    .join("\n\n");

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: EXTRACTION_PROMPT + messagesText,
          },
        ],
      },
    ],
    tools: [EVENT_EXTRACTION_TOOL],
    tool_config: {
      function_calling_config: {
        mode: "ANY",
      },
    },
  };

  try {
    const response = UrlFetchApp.fetch(
      `${GEMINI_API_URL}?key=${config.geminiApiKey}`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true,
      },
    );

    if (response.getResponseCode() !== 200) {
      console.log(`Gemini API error: ${response.getContentText()}`);
      return [];
    }

    const data: GeminiResponse = JSON.parse(response.getContentText());
    const functionCall =
      data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (!functionCall || functionCall.name !== "register_events") {
      console.log("Unexpected response: no function call found");
      return [];
    }

    const extractedEvents = functionCall.args.events;

    // Map events to include source message info
    return extractedEvents
      .filter(
        (e) =>
          e.title &&
          e.startTime &&
          e.endTime &&
          e.messageIndex !== undefined &&
          e.messageIndex >= 0 &&
          e.messageIndex < messages.length,
      )
      .map((e) => {
        const sourceMessage = messages[e.messageIndex];
        return {
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          description: e.description,
          sourceMessage,
          sourceMessageUrl: guildId
            ? buildMessageUrl(
                guildId,
                config.sourceChannelId,
                sourceMessage.id,
              )
            : undefined,
        };
      });
  } catch (error) {
    console.log(`Failed to extract events: ${error}`);
    return [];
  }
}

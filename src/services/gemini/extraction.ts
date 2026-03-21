import type { DiscordMessage, Event, EventWithSource } from "../../types";
import { getConfig } from "../../config";
import { fetchGuildId } from "../discord";
import { buildFunctionCallRequest, callGeminiFunction } from "./client";

const EXTRACTION_PROMPT = `Extract event information from the following Discord message.
Use original language in the message for title and description, but convert datetime to ISO 8601 format with timezone (+09:00).
If no events are found, call the function with an empty array.
If duration of the event is not specified, follow these rules:
- a single date without time, assume as 9:00 - 21:00.
- a single date with time, assume a default duration of 3 hours.
If no year is specified for an event date, infer the year from the message's "Posted at" timestamp: use the same year as the posted date, unless that would place the event before the posted date, in which case use the following year.

Message:
`;

type RegisterEventsArgs = {
  events: Event[];
};

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
              },
              required: ["title", "startTime", "endTime"],
            },
          },
        },
        required: ["events"],
      },
    },
  ],
};

function buildMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string,
): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function buildExtractionPrompt(message: DiscordMessage): string {
  let formatted = `Posted at ${message.timestamp}\n${message.content}`;

  const snapshots = message.message_snapshots;
  if (snapshots?.length > 0) {
    formatted += snapshots
      .map(
        (snapshot) =>
          `\n\nForwarded:\nPosted at ${snapshot.message.timestamp}\n${snapshot.message.content}`,
      )
      .join("");
  }

  return EXTRACTION_PROMPT + formatted;
}

export function extractEvents(messages: DiscordMessage[]): EventWithSource[] {
  if (messages.length === 0) {
    return [];
  }

  const guildId = fetchGuildId();
  const config = getConfig();
  const extractedEventsWithSource: EventWithSource[] = [];

  for (const message of messages) {
    const requestBody = buildFunctionCallRequest(
      buildExtractionPrompt(message),
      EVENT_EXTRACTION_TOOL,
    );

    const result = callGeminiFunction<RegisterEventsArgs>(
      requestBody,
      "register_events",
      "Gemini extraction",
    );

    if (!result) {
      continue;
    }

    const mappedEvents = result.events
      .filter((event) => event.title && event.startTime && event.endTime)
      .map(({ title, startTime, endTime, location, description }) => {
        return {
          title,
          startTime,
          endTime,
          location,
          description,
          sourceMessage: message,
          sourceMessageUrl: guildId
            ? buildMessageUrl(guildId, config.sourceChannelId, message.id)
            : undefined,
        };
      });

    extractedEventsWithSource.push(...mappedEvents);
  }

  return extractedEventsWithSource;
}

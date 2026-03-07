import type { Event, DiscordMessage, GeminiResponse } from "../types";
import { getConfig } from "../config";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const EXTRACTION_PROMPT = `Extract event information from the following Discord messages.
If multiple events are found in a single message, extract all of them.
Use original language in the message for title and description, but convert datetime to ISO 8601 format with timezone (+09:00).
If no events are found, call the function with an empty array.
If duration of the event is not specified, follow these rules:
- a single date without time, assume it's an all-day event.
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

/**
 * Extract events from Discord messages using Gemini API with Function Calling
 */
export function extractEvents(messages: DiscordMessage[]): Event[] {
  if (messages.length === 0) {
    return [];
  }

  const config = getConfig();
  const messagesText = messages.map((m) => m.content).join("\n");

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

    const events = functionCall.args.events;
    return events.filter((e) => e.title && e.startTime && e.endTime);
  } catch (error) {
    console.log(`Failed to extract events: ${error}`);
    return [];
  }
}

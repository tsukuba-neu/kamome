import type { DuplicateJudgement, Event } from "../../types";
import { buildFunctionCallRequest, callGeminiFunction } from "./client";

const DUPLICATE_CHECK_PROMPT = `You are checking whether a target event already exists in a calendar on the same day.
Consider title wording differences, slight time shifts, and context in location/description.
Return true only when target event and one of existing events refer to the same real-world event.
If none match, return false.
`;

const DUPLICATE_CHECK_TOOL = {
  function_declarations: [
    {
      name: "judge_duplicate_event",
      description:
        "Judge whether the target event already exists among existing same-day calendar events",
      parameters: {
        type: "object",
        properties: {
          isDuplicate: {
            type: "boolean",
            description: "Whether the target event is a duplicate",
          },
          duplicateIndex: {
            type: "integer",
            description:
              "Index of matched existing event when isDuplicate is true (0-based)",
          },
          reason: {
            type: "string",
            description: "Short reason for the judgement",
          },
        },
        required: ["isDuplicate"],
      },
    },
  ],
};

function toComparableEventPayload(event: Event): {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
} {
  return {
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
  };
}

export function isDuplicateEventByGemini(
  targetEvent: Event,
  existingEvents: Event[],
): boolean {
  if (existingEvents.length === 0) {
    return false;
  }

  const requestBody = buildFunctionCallRequest(
    `${DUPLICATE_CHECK_PROMPT}

Target event:
${JSON.stringify(toComparableEventPayload(targetEvent), null, 2)}

Existing events:\n${JSON.stringify(existingEvents.map(toComparableEventPayload), null, 2)}`,
    DUPLICATE_CHECK_TOOL,
  );

  const result = callGeminiFunction<DuplicateJudgement>(
    requestBody,
    "judge_duplicate_event",
    "Gemini duplicate check",
  );

  if (!result) {
    return false;
  }

  if (result.isDuplicate) {
    console.log(
      `Duplicate detected by Gemini: ${targetEvent.title} (${result.reason ?? "no reason"})`,
    );
  }

  return result.isDuplicate;
}

import { getConfig } from "../../config";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

type GeminiFunctionCallResponse<TArgs> = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        functionCall?: {
          name: string;
          args: TArgs;
        };
      }>;
    };
  }>;
};

export function buildFunctionCallRequest(
  promptText: string,
  tool: unknown,
): {
  contents: Array<{ parts: Array<{ text: string }> }>;
  tools: unknown[];
  tool_config: {
    function_calling_config: {
      mode: "ANY";
    };
  };
} {
  return {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    tools: [tool],
    tool_config: {
      function_calling_config: {
        mode: "ANY",
      },
    },
  };
}

export function callGeminiFunction<TArgs>(
  requestBody: unknown,
  functionName: string,
  apiErrorPrefix: string,
): TArgs | null {
  const config = getConfig();

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
      console.log(`${apiErrorPrefix} API error: ${response.getContentText()}`);
      return null;
    }

    const data: GeminiFunctionCallResponse<TArgs> = JSON.parse(
      response.getContentText(),
    );

    const functionCall = data.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .find((part) => part.functionCall?.name === functionName)?.functionCall;

    if (!functionCall) {
      console.log(
        `Unexpected response: function call "${functionName}" not found`,
      );
      return null;
    }

    return functionCall.args;
  } catch (error) {
    console.log(`Failed to call Gemini (${functionName}): ${error}`);
    return null;
  }
}

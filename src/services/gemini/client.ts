import { getConfig } from "../../config";
import { fetchWithClassification, TransientError } from "../../utils/errors";

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
): TArgs {
  const config = getConfig();

  const response = fetchWithClassification(
    `${GEMINI_API_URL}?key=${config.geminiApiKey}`,
    {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(requestBody),
    },
    `${apiErrorPrefix} API error`,
  );

  let data: GeminiFunctionCallResponse<TArgs>;
  try {
    data = JSON.parse(response.getContentText());
  } catch (error) {
    throw new TransientError(
      `${apiErrorPrefix}: failed to parse response: ${error}`,
    );
  }

  const functionCall = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.functionCall?.name === functionName)?.functionCall;

  // モデル出力の揺らぎによる欠落は再試行で解消しうるため一時エラーとする
  if (!functionCall) {
    throw new TransientError(
      `${apiErrorPrefix}: function call "${functionName}" not found in response`,
    );
  }

  return functionCall.args;
}

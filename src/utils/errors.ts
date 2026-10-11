/**
 * 再試行すれば解消する可能性のあるエラー（レートリミット、サーバーエラー、通信障害など）
 * このエラーはGAS実行の失敗として報告せず、次回実行時に再試行する
 */
export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientError";
  }
}

/**
 * HTTPレスポンスのステータスを検査し、失敗時はエラーを投げる
 * 429 / 5xx は一時エラー、それ以外（401 / 403 / 404 など）は恒久エラーとして扱う
 */
export function checkResponse(
  response: GoogleAppsScript.URL_Fetch.HTTPResponse,
  context: string,
): void {
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return;
  }

  const message = `${context}: ${code} ${response.getContentText()}`;
  if (code === 429 || code >= 500) {
    throw new TransientError(message);
  }
  throw new Error(message);
}

/**
 * UrlFetchApp.fetch のラッパー
 * 通信自体の失敗（DNS / タイムアウトなど）は一時エラーとして扱い、
 * レスポンスのステータスは checkResponse で分類する
 */
export function fetchWithClassification(
  url: string,
  params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  context: string,
): GoogleAppsScript.URL_Fetch.HTTPResponse {
  // 設定不備によるURL不正は再試行しても直らないため恒久エラー
  if (!/^https?:\/\/[^/]/.test(url)) {
    throw new Error(`${context}: invalid URL "${url}"`);
  }

  let response: GoogleAppsScript.URL_Fetch.HTTPResponse;
  try {
    response = UrlFetchApp.fetch(url, { ...params, muteHttpExceptions: true });
  } catch (error) {
    throw new TransientError(`${context}: ${error}`);
  }

  checkResponse(response, context);
  return response;
}

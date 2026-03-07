# 実装指示書：Discord-to-Googleカレンダー自動連携ツール (GAS/TypeScript)

## 1. プロジェクト概要

Discordの特定チャンネルからイベント情報を取得し、Gemini API（LLM）で構造化データに変換してGoogleカレンダーに登録、およびWebhookでの定期リマインドを行うシステムを構築してください。

## 2. 環境構成と設定 (PropertiesService)

以下の設定値を `PropertiesService` から取得・管理する共通クラス/モジュールを作成してください。

- `DISCORD_PROXY_URL`: Discord API用プロキシエンドポイント
- `SCHEDULE_CHANNEL_ID`: 監視対象のチャンネルID
- `REMIND_WEBHOOK_URL`: リマインド投稿用Webhook URL
- `CALENDAR_ID`: 登録先GoogleカレンダーID
- `LAST_RUN_TIME`: 前回実行時の最終メッセージ取得日時（ISO 8601形式）
- `GEMINI_API_KEY`: Google AI StudioのAPIキー

## 3. 主要モジュールの実装仕様

### A. Discord連携 (`discord.ts`)

- `fetchMessages()`: `LAST_RUN_TIME` 以降のメッセージをプロキシ経由で取得。
- **フィルタリング:** `author.bot === true` のメッセージはループ防止のため、必ず除外すること。
- `postToWebhook(content: string)`: 指定されたWebhook URLへリマインド内容を送信。

### B. Gemini APIによる解析 (`gemini.ts`)

- `UrlFetchApp` を使用し、Gemini 1.5 FlashのREST APIを直接叩く。
- **プロンプト設計:** \* 入力されたDiscordメッセージから「タイトル」「開始時刻」「終了時刻」「場所」「詳細」を抽出する。
- 1つのメッセージに複数のイベントが含まれる場合、必ず `Array<Event>` 形式のJSONで返すよう指示する。
- 時刻はGoogleカレンダーで扱える形式に正規化させる。

### C. カレンダー同期 (`calendar.ts`)

- `syncEvents(events: Event[])`: 取得したイベントをGoogleカレンダーに登録。
- **重複排除:** 同じ日の「開始時刻」と「タイトル」が一致するイベントが既に存在する場合は、重複登録をスキップする。

## 4. メイン関数（エントリポイント）

### ① `syncDiscordEventsToCalendar` (定期実行用)

1. 前回の実行時刻を `PropertiesService` から取得。
2. Discordから新着メッセージを取得し、ボットを除外。
3. メッセージをGeminiに渡し、イベントデータを抽出。
4. カレンダーへ重複を避けて一括登録。
5. 成功後、`LAST_RUN_TIME` を最新のメッセージ時刻で更新。

### ② `sendDailyReminders` (時間指定実行用)

1. 実行時の時刻を判定。

- 15:00以降であれば「翌日」のイベント。
- 15:00以前であれば「当日」のイベント。

2. 対象日のイベントをカレンダーから全取得。
3. リマインド用テキスト（タイトル、時間、場所など）に整形。
4. Webhookを通じてDiscordへ投稿。

## 5. 技術的制約・開発スタイル

- **言語:** TypeScript。
- **ビルド:** Viteを使用してGAS用（`dist/bundle.js`等）にバンドルする。
- **エラーハンドリング:** APIの呼び出し失敗時にログ（`console.log`）を残し、処理が止まらないようにする。

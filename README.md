# 🦢 kamome

![Version](https://img.shields.io/github/package-json/v/tsukuba-neu/kamome?style=flat-square)
![tsukuba-neu](https://img.shields.io/badge/tsukuba-neu-blue?style=flat-square)
![Imagine The Future](https://img.shields.io/badge/imagine_the-future-0bf?style=flat-square)

Discord のメッセージからイベント情報を抽出し、Google カレンダーへ同期する Google Apps Script (GAS) プロジェクトです。  
Gemini APIを使って自然文から予定を抽出します。

## 主な機能

- Discord メッセージを取得してイベント抽出
- Google カレンダーへ重複を考慮して同期
- 同期対象メッセージへリアクション付与（👍 / 🐟）
- 毎日のリマインドを Discord に投稿（15:00 を境に当日/翌日を切り替え）

## エントリーポイント（GAS トリガー）

### `syncDiscordEventsToCalendar`

Discord から新規メッセージを取得し、Gemini でイベントを抽出して Google カレンダーへ同期します。同期できたイベントの元メッセージにはリアクションを付与します。

### `sendDailyReminders`

カレンダーから対象日の予定を取得し、Discord の通知チャンネルへ一覧を投稿します。実行時刻が 15:00 未満なら当日分、15:00 以降なら翌日分を通知します。

## 開発・デプロイ

```bash
npm run build
npx clasp push
```

初回のみ必要に応じて:

```bash
npx clasp login
```

## 設定値（Script Properties）

`PropertiesService.getScriptProperties()` で以下を参照します。

### `DISCORD_PROXY_URL`

Discord メッセージ取得を中継するCloud RunプロキシのURL。

Google Apps ScriptからDiscord APIを呼び出すには、何らかのプロキシが必要です。ここでは[`nandenjin/google-apps-script-discord-proxy`](https://github.com/nandenjin/google-apps-script-discord-proxy)をGoogle Cloud Runに認証付きでデプロイしたものを使用するようにしています。

- 例: `https://discord-proxy-xxxx-uc.a.run.app`

### `DISCORD_BOT_TOKEN`

Discord API 呼び出し（投稿・リアクション付与）に使う Bot トークン。

- 例: `h0AxnZuR16jkKLxzsI7qZnfcs2ZIAsXnN2sqzRHBxSkLlznrdFcuygesjgJTf`

### `SOURCE_CHANNEL_ID`

イベント抽出元となる Discord チャンネル ID。

- 例: `123456789012345678`

### `NOTIFICATION_CHANNEL_ID`

日次リマインドの投稿先 Discord チャンネル ID。

- 例: `987654321098765432`

### `CALENDAR_ID`

同期先の Google カレンダー ID。`primary` かメール形式 ID を指定します。

- 例: `team-calendar@example.com`

### `GEMINI_API_KEY`

Gemini にイベント抽出を依頼するための API キー。

- 例: `AIza...`

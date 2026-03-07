# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

kozakana is a Google Apps Script (GAS) project that syncs events from Discord messages to Google Calendar. It uses Gemini API with Function Calling to extract event information from natural language messages.

## Build & Deploy Commands

```bash
npm run build          # Build with Vite → outputs to dist/
npx clasp push         # Deploy dist/ to Google Apps Script
npx clasp login        # Authenticate with Google (one-time setup)
```

Setup requires copying `.clasp.json.template` to `.clasp.json` and setting your script ID.

## Architecture

**Entry Points** ([src/main.ts](src/main.ts)): Two GAS trigger functions exposed via `global`:
- `syncDiscordEventsToCalendar` - Fetches Discord messages → extracts events via Gemini → syncs to Calendar
- `sendDailyReminders` - Posts daily event reminders to Discord webhook (15:00 cutoff for today/tomorrow)

**Services** ([src/services/](src/services/)):
- `discord.ts` - Fetches messages via Cloud Run proxy (uses GAS identity token for auth), posts webhooks
- `gemini.ts` - Extracts structured events using Gemini Function Calling
- `calendar.ts` - Syncs events to Google Calendar with duplicate detection

**Config** ([src/config/](src/config/)): All settings via `PropertiesService.getScriptProperties()`:
- `DISCORD_PROXY_URL`, `DISCORD_BOT_TOKEN`, `SCHEDULE_CHANNEL_ID`
- `REMIND_WEBHOOK_URL`, `CALENDAR_ID`, `GEMINI_API_KEY`
- `LAST_RUN_TIME` - Tracks incremental sync state

## Key Constraints

- Uses Cloud Run proxy for Discord API (GAS can't call Discord directly due to auth limitations)
- GAS globals must be explicitly assigned to `global` object for visibility to triggers
- Vite build is non-minified to preserve function names for GAS

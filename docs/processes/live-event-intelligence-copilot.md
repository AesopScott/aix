# Live Event Intelligence Copilot

Version: 0.5.0

Created: 2026-09-03

Owner: Scott Schindler

## Purpose

Mojo needs a facilitator-side intelligence tool for Zoom Events sessions that captures spoken contributions and chat, attributes useful signals to named guests where possible, gives Scott live reiteration prompts, and exports the raw evidence and synthesis needed for the post-event intelligence brief.

The immediate target is the Friday, September 4, 2026 AI Executive Readiness Online Zoom Events session, and the same tool now covers the full upcoming 2026-2027 virtual event series.

## Current Implementation

The first shippable internal tool is a local standalone console:

- File: `tools/live-event-intelligence/index.html`
- Runtime: browser HTML, CSS, and JavaScript, with an optional local Node transcription relay
- Relay file: `tools/live-event-intelligence/server.mjs`
- Persistence: in-memory only until the operator downloads Markdown or JSON exports
- Inputs: pasted live transcript, pasted Zoom Events chat, browser speech recognition, AI Audio capture through the local relay or deployed transcription endpoint, and a speaker roster with aliases
- Outputs: live reiteration cue, follow-up synthesis lane, brief synthesis lane, speaker contribution grouping, theme counts, Markdown intelligence brief, and JSON evidence package

This tool is deliberately outside `dist/` so it is not part of the public Pages deployment by default.

Canonical paths:

- Local: `http://127.0.0.1:8766/synthesis`
- Production after deploy: `https://mojoaisummits.com/synthesis`
- Production API after deploy: `/api/synthesis/health`, `/api/synthesis/transcribe`, and `/api/synthesis/zoom-event`

The `Load Zoom Event` action calls `/api/synthesis/zoom-event`, which uses the existing CRM Integration Zoom Events server-to-server app credentials to pre-seed the event name, date, sessions, panelists, and registration roster. The endpoint returns only roster-style public attribution data and does not expose panelist join URLs.

## Live Capture Without Zoom Transcripts

Zoom Events transcripts are not available during the live session through the currently enabled API path. The live capture path for tomorrow is therefore independent of Zoom transcripts.

Primary live path:

1. Run the local relay:

   ```powershell
   $env:PORT='8766'; node tools\live-event-intelligence\server.mjs
   ```

2. Open `http://127.0.0.1:8766/synthesis`.
3. Select AI Audio.
4. Use `Zoom tab or system audio` when Chrome can share the Zoom tab/window audio, or use `Room microphone` as the fallback.
5. Keep the Current speaker selector aligned with whoever is talking.
6. Leave chunk size at 8 seconds unless latency or accuracy needs tuning.

The relay reads `OPENAI_API_KEY` from local env files, keeps the key out of the browser page, forwards short audio chunks to OpenAI transcription, returns text to the page, and does not store audio chunks.

Fallback live path:

1. Select Speech.
2. Use Start Capture for Chrome's built-in speech recognition.
3. Keep listening is enabled by default so capture restarts after Chrome pauses or times out.
4. Use Check Audio to verify the selected local input is receiving signal.

Both live paths append final recognized text into the transcript audit field and inject it into the same follow-up and brief synthesis lanes.

## Current Zoom App Findings

The existing Zoom Events server-to-server OAuth app can already read the September 4, 2026 Zoom Event inventory and its sessions through the Zoom Events API.

September 4 event:

- Event ID: `IFJnSl0ARvSv2YtZmVWxyQ`
- Event name: Mojo AI Summits: AI Executive Readiness - Sep 4 Live
- Event type: `CONFERENCE`
- Status: `PUBLISHED`
- Afternoon session ID: `b31ZIB3NRHmuiUAVx5T43Q`
- Afternoon webinar ID: `85948321461`
- Morning session and webinar references are historical only; all morning shows are canceled.

Validated existing scopes:

- `zoom_events:read:list_events:admin`
- `zoom_events:read:list_sessions:admin`
- `zoom_events:read:chat_transcripts:admin`
- `zoom_events:read:event_attendance:admin`
- `zoom_events:read:session_attendance:admin`
- `zoom_events:read:custom_report:admin`
- `cloud_recording:read:meeting_transcript:admin`
- `webinar:read:list_panelists:admin`
- `webinar:read:list_registrants:admin`
- `webinar:read:list_past_instances:admin`
- `webinar:read:list_past_participants:admin`

The Zoom Events chat transcript report endpoint is reachable with the existing app, but before the event it returns: `Chat messages are not available for download now. Please try again later.` Treat this as post-event/report-availability data, not a true live chat stream.

The app can list panelists for both September 4 webinars. The direct webinar details endpoint is blocked because the app is missing `webinar:read:webinar:admin`.

The synthesis workflow successfully opened the September 4 Zoom Events speaker/lobby surface in Chrome through an existing generic speaker-ticket panelist path. Because the webinar session was not live yet, Zoom had not exposed a live room audio surface. The engine can sit staged at `/synthesis` with the roster loaded, then capture audio once the operator joins the active webinar room or shares the live Zoom audio source to the browser.

The app does not currently have Marketplace app-management scopes, so changing the app manifest through the API is blocked. App settings must be changed in the Zoom Marketplace UI unless `marketplace:read:app:admin` and a write-equivalent Marketplace scope are added and supported for this app.

As of the September 3, 2026 UI check, the CRM Integration app is an account-level Server-to-Server OAuth app and the Feature page showed Event Subscriptions switched off. Enabling it is a Zoom app settings change and should be done intentionally with a valid HTTPS webhook receiver URL ready.

## Supported Event Presets

- Friday, September 4, 2026: AI Executive Readiness Online
- Friday, September 18, 2026: AI Data Readiness and Knowledge Strategy Online
- Friday, September 25, 2026: AI Use Cases That Survive Finance Online
- Friday, October 9, 2026: AI Agents, Automation, and Human Handoffs Online
- Friday, October 16, 2026: AI Integration and Workflow Online
- Friday, October 30, 2026: AI Vendor Strategy and Platform Decisions Online
- Friday, November 6, 2026: AI Security, Governance, and Trust Online
- Friday, November 20, 2026: AI Workforce, Talent, and Change Adoption Online
- Friday, November 27, 2026: AI Operating Model for 2027 Online
- Friday, December 4, 2026: AI Budgeting and Investment Priorities Online
- Friday, December 18, 2026: AI Workforce Readiness and Change Leadership Online
- Friday, January 8, 2027: AI Executive Operating Agenda for 2027 Online

## Tomorrow Operating Model

1. Open `http://127.0.0.1:8766/synthesis` and select the event preset.
2. Before the event, enter the expected guest roster as `Name | Company | Title | aliases`.
3. Start AI Audio from `http://127.0.0.1:8766/` and choose Zoom tab/system audio where possible.
4. During the session, keep the Current speaker selector aligned with the person speaking.
5. Keep Zoom Events chat open and paste new chat into the Chat tab.
6. Leave Auto ingest on so pasted transcript and chat are injected into the page, deduped, scored, and rendered live.
7. Watch Follow-Up Synthesis for lines Scott can reiterate in the room.
8. Watch Brief Synthesis for material likely to belong in the post-event intelligence brief.
9. Mark a cue as spoken after Scott reiterates it so the console promotes the next useful cue.
10. After the event, download both the Markdown brief and JSON evidence package.

## Attribution Rules

Attribution confidence is highest when Zoom transcript or chat lines include a speaker name that matches the roster or one of its aliases.

Voice identification is not implemented in version 0.4.0. For tomorrow, attribution comes from the manually selected current speaker plus named transcript/chat parsing.

Future attribution tiers:

- Tier 1: Zoom RTMS participant metadata and transcript events.
- Tier 2: Zoom transcript/chat speaker labels matched to CRM registration records.
- Tier 3: Manual facilitator speaker selection.
- Tier 4: Post-event human correction before publication.

## Recommended Full Architecture

Use Zoom Realtime Media Streams (RTMS) for the production version when the Zoom account has Developer Pack credits and the Zoom app is approved for the required scopes.

Production flow:

1. Zoom Events session starts.
2. RTMS start event reaches a Cloudflare Worker or other WebSocket-capable backend.
3. Backend connects to RTMS signaling and media streams.
4. Transcript, chat, active-speaker, and participant metadata events are normalized into a meeting evidence stream.
5. The synthesis worker scores contribution, risk, decision, question, action, and brief-worthy quote candidates.
6. A facilitator console receives live cues over a private channel.
7. After the event, the brief builder combines transcript evidence, chat, CRM attendee metadata, and manually approved quotes.

Cloudflare Pages Functions are not enough for the RTMS media connection because they are request/response oriented. A Worker with WebSocket support, Durable Object coordination, or a separate Node service should own the live stream.

## Near-Term Integration Path

For the September 4, 2026 event, use the current app as follows:

1. Pre-event: pull Zoom Events event/session records and panelist/registration reports to pre-seed the live console roster.
2. During event: use AI Audio capture through the local relay for live speech capture, with browser speech recognition as fallback.
3. Post-event: poll Zoom Events chat transcript reports, event attendance, session attendance, and cloud recording transcripts until available.
4. Briefing: merge post-event Zoom reports with the local JSON evidence export and apply human review before publishing attributed quotes.

Additional scope to add if available:

- `webinar:read:webinar:admin` for direct webinar detail reads.

Settings to enable when an HTTPS receiver exists:

- Event Subscriptions on the CRM Integration app.
- Webhook events that cover event/session lifecycle, attendee lifecycle, recording/transcript availability, and any Zoom Events chat transcript availability events exposed by the account.

## Privacy And Consent

This system captures event transcript and chat content, so it must be treated as a material event recording/transcript practice before public deployment.

Launch requirements:

- Update public privacy notice and event registration language before any production capture workflow is enabled.
- Make Zoom Events recording/transcript/chat capture visible to participants.
- Keep transcript evidence private to Mojo operators unless a participant has granted publication use.
- Use human approval before publishing attributed quotes.
- Store only the minimum evidence needed for the intelligence brief and operational follow-up.
- Keep downloaded JSON evidence out of Git unless deliberately redacted.

## Open Questions

- Is Zoom RTMS already enabled for the Mojo Zoom account, and are Developer Pack credits available?
- Will Zoom Events provide a live transcript/caption panel that can be copied during the session?
- Should post-event evidence be stored in Cloudflare R2, D1, Obsidian, or only local exports until the privacy language is updated?
- Who has final approval over named quotes in the intelligence brief?

## Changelog

- 0.5.0 - Added `/api/synthesis/zoom-event` for deployed roster/event bootstrap and documented the staged Zoom Events speaker/lobby pathway.
- 0.4.0 - Added live capture path independent of Zoom transcripts: local Node transcription relay, AI Audio browser mode, room mic or Zoom tab/system audio capture, chunked transcription, and speech-capture resilience.
- 0.3.0 - Added verified CRM Integration Zoom app API findings, September 4 event/session/webinar IDs, available report scopes, missing webinar detail scope, and webhook setting status.
- 0.2.0 - Added all upcoming event presets, auto-ingest behavior, and separate live lanes for follow-up synthesis and brief synthesis.
- 0.1.0 - Created tomorrow-ready local console and production RTMS architecture note.

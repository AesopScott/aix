import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  VIRTUAL_EVENTS,
  VIRTUAL_EVENT_TIMEZONE,
  zoomKey
} from "../functions/_virtual-events.js";

const root = process.cwd();
const envPaths = [
  "repository.env",
  ".env",
  ".dev.vars",
  "../mojo/.env",
  "C:/Users/scott/Code/mojo/.env"
].map((file) => path.resolve(root, file));

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const fromFile = new Map();
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    fromFile.set(match[1], match[2].replace(/^["']|["']$/g, ""));
  }
  for (const [key, value] of fromFile) {
    if (!process.env[key]) process.env[key] = value;
  }
}

envPaths.forEach(loadEnvFile);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Add it to repository.env or the shell environment.`);
  return value;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function eventBySlug(slug) {
  return VIRTUAL_EVENTS.find((event) => event.slug === slug);
}

function zoomStartTime(event) {
  return event.startAt.replace(/(?:Z|[+-]\d\d:\d\d)$/u, "");
}

function zoomMeetingPayload(event) {
  return {
    topic: `MOJO AI Summits | ${event.title}`,
    type: 2,
    start_time: zoomStartTime(event),
    duration: event.durationMinutes,
    timezone: process.env.MOJO_VIRTUAL_EVENT_TIMEZONE || VIRTUAL_EVENT_TIMEZONE,
    agenda: event.summary,
    settings: {
      approval_type: 2,
      audio: "both",
      auto_recording: "none",
      host_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      participant_video: false,
      waiting_room: true
    }
  };
}

async function zoomToken() {
  const accountId = requireEnv("ZOOM_ACCOUNT_ID");
  const clientId = requireEnv("ZOOM_CLIENT_ID");
  const clientSecret = requireEnv("ZOOM_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`, {
    method: "POST",
    headers: { authorization: `Basic ${credentials}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.reason || payload.message || "Zoom OAuth token request failed.");
  return payload.access_token;
}

async function createMeeting(token, event) {
  const userId = process.env.ZOOM_USER_ID || "me";
  const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(zoomMeetingPayload(event))
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Zoom meeting creation failed for ${event.slug}.`);
  return payload;
}

async function updateMeeting(token, meetingId, event) {
  const response = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(zoomMeetingPayload(event))
  });
  if (response.status === 204) return;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Zoom meeting update failed for ${event.slug}.`);
}

function kvPut(slug, meeting) {
  const namespaceId = namespaceIdForKv();
  if (!namespaceId) throw new Error("MOJO_SUMMITS_SETUP_STATE_ID or CLOUDFLARE_KV_NAMESPACE_ID is required for --write-kv.");
  const value = JSON.stringify({
    meetingId: String(meeting.id || ""),
    joinUrl: meeting.join_url || "",
    passcode: meeting.password || "",
    startAt: meeting.start_time || "",
    updatedAt: new Date().toISOString()
  });
  kvPutValue(slug, value);
}

function namespaceIdForKv() {
  if (process.env.MOJO_SUMMITS_SETUP_STATE_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID) {
    return process.env.MOJO_SUMMITS_SETUP_STATE_ID || process.env.CLOUDFLARE_KV_NAMESPACE_ID;
  }
  const wranglerPath = path.join(root, "wrangler.jsonc");
  if (!fs.existsSync(wranglerPath)) return "";
  const config = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
  return (config.kv_namespaces || []).find((entry) => entry.binding === "MOJO_SUMMITS_SETUP_STATE")?.id || "";
}

function kvPutValue(slug, value) {
  const namespaceId = namespaceIdForKv();
  const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || root, "mojo-zoom-kv-"));
  const tempFile = path.join(tempDir, `${slug}.json`);
  fs.writeFileSync(tempFile, value);
  const wranglerArgs = [
    "wrangler",
    "kv",
    "key",
    "put",
    zoomKey(slug),
    "--path",
    tempFile,
    "--namespace-id",
    namespaceId,
    "--remote"
  ];
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", ["npx.cmd", ...wranglerArgs].map(cmdQuote).join(" ")]
    : wranglerArgs;
  const result = spawnSync(command, args, {
    cwd: root,
    shell: false,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (result.status !== 0) {
    const detail = [result.error?.message, result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`KV write failed for ${slug}.${detail ? `\n${detail}` : ""}`);
  }
}

function cmdQuote(value) {
  const text = String(value);
  if (!/[()\[\]{}^=;!'+,`~&|\s"]/u.test(text)) return text;
  return `"${text.replace(/(\\*)"/gu, '$1$1\\"').replace(/(\\+)$/u, "$1$1")}"`;
}

function writeKvFromReport(reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  for (const event of report.events || []) {
    const canonicalEvent = eventBySlug(event.slug);
    kvPutValue(event.slug, JSON.stringify({
      meetingId: event.meetingId || "",
      joinUrl: event.joinUrl || "",
      passcode: event.passcode || "",
      startAt: canonicalEvent?.startAt || event.startAt || "",
      duration: canonicalEvent?.durationMinutes || event.duration || "",
      updatedAt: new Date().toISOString()
    }));
  }
  console.log(`Wrote ${(report.events || []).length} Zoom join record(s) from ${reportPath}.`);
}

async function updateMeetingsFromReport(token, reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const updated = [];
  report.events = (report.events || []).map((record) => {
    const event = eventBySlug(record.slug);
    if (!event) return record;
    return {
      ...record,
      title: event.title,
      startAt: event.startAt,
      duration: event.durationMinutes
    };
  });

  for (const record of report.events) {
    const event = eventBySlug(record.slug);
    if (!event || !record.meetingId) continue;
    await updateMeeting(token, record.meetingId, event);
    updated.push({
      slug: record.slug,
      meetingId: record.meetingId,
      startAt: event.startAt,
      duration: event.durationMinutes
    });
  }
  report.updatedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Updated ${updated.length} existing Zoom meeting(s).`);
  return updated;
}

async function main() {
  const outPath = arg("--out") || path.join(root, "docs/processes/zoom-virtual-events.generated.json");
  if (hasFlag("--write-kv-from-report")) {
    writeKvFromReport(outPath);
    return;
  }

  const token = await zoomToken();
  if (hasFlag("--update-from-report")) {
    await updateMeetingsFromReport(token, outPath);
    if (hasFlag("--write-kv")) writeKvFromReport(outPath);
    return;
  }

  const events = arg("--event")
    ? VIRTUAL_EVENTS.filter((event) => event.slug === arg("--event"))
    : VIRTUAL_EVENTS;
  if (!events.length) throw new Error("No matching virtual events.");

  const created = [];
  for (const event of events) {
    const meeting = await createMeeting(token, event);
    created.push({
      slug: event.slug,
      title: event.title,
      meetingId: String(meeting.id || ""),
      joinUrl: meeting.join_url || "",
      startUrlCreated: Boolean(meeting.start_url),
      startAt: meeting.start_time || event.startAt,
      duration: meeting.duration || event.durationMinutes
    });
    if (hasFlag("--write-kv")) kvPut(event.slug, meeting);
  }

  fs.writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), events: created }, null, 2));
  console.log(`Created ${created.length} Zoom meeting(s). Wrote ${outPath}.`);
  if (!hasFlag("--write-kv")) {
    console.log("Run again with --write-kv to store public join URLs for the website gate.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

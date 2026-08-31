import { json } from "./_access-control.js";
import { sendMicrosoftGraphMail, sendResendMail } from "./_mail.js";

const TEAM_INDEX_KEY = "scheduling:employees:index:v1";
const EMPLOYEE_PREFIX = "scheduling:employee:";
const BOOKING_PREFIX = "scheduling:booking:";
const HOLD_PREFIX = "scheduling:hold:";
const CONNECTION_INDEX_PREFIX = "scheduling:calendar-connections:";
const CONNECTION_PREFIX = "scheduling:calendar-connection:";
const OAUTH_STATE_PREFIX = "scheduling:oauth-state:";
const HOLD_TTL_SECONDS = 10 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const BOOKING_EMAIL_RETRY_DELAYS_MS = [750, 2000, 5000];

const DEFAULT_TIMEZONE = "America/Denver";
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const ANGEL_CENTRAL_AVAILABILITY_EFFECTIVE_DATE = "2026-09-08";
const ANGEL_CENTRAL_AVAILABILITY = {
  timezone: "America/Chicago",
  dayStart: "08:30",
  dayEnd: "13:30"
};
const DEFAULT_MEETING_TYPE = {
  id: "intro",
  label: "Intro call",
  durationMinutes: 30,
  description: "A focused conversation with the Mojo team.",
  location: "Zoom"
};
const DEFAULT_BOOKING_EMAIL_SENDER = "hello@mojoaisummits.com";
const DEFAULT_PHOTOS = {
  angel: "/assets/images/angel.png",
  charlie: "/assets/images/charlie.png",
  gina: "/assets/images/gina.png",
  jodi: "/assets/images/jodi.png",
  miller: "/assets/images/MillerPixar.png",
  robert: "/assets/images/robert.png",
  ron: "/assets/images/ron.png",
  scott: "/assets/images/scott-pro3-6.png"
};
const DEFAULT_EMPLOYEES = [
  {
    slug: "miller",
    email: "miller@mojoaisummits.com",
    name: "Miller",
    title: "Director of Partnerships",
    bio: "Miller supports Mojo AI Summits partner relationships, sponsorship opportunities, and executive event growth.",
    timezone: "America/Chicago",
    meetingTypes: [
      {
        id: "intro",
        label: "Intro call",
        durationMinutes: 30,
        description: "Inviting distinguished guests to experience Mojo AI Summit's Executive Intelligence Network",
        location: "Zoom"
      }
    ]
  }
];
const WINDOWS_TIMEZONE_MAP = {
  "Dateline Standard Time": "Etc/GMT+12",
  "UTC-11": "Etc/GMT+11",
  "Aleutian Standard Time": "America/Adak",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "Alaskan Standard Time": "America/Anchorage",
  "Pacific Standard Time": "America/Los_Angeles",
  "US Mountain Standard Time": "America/Phoenix",
  "Mountain Standard Time": "America/Denver",
  "Central Standard Time": "America/Chicago",
  "Eastern Standard Time": "America/New_York",
  "US Eastern Standard Time": "America/Indianapolis",
  "Atlantic Standard Time": "America/Halifax",
  "UTC": "Etc/UTC",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Central Europe Standard Time": "Europe/Budapest",
  "Central European Standard Time": "Europe/Warsaw",
  "Romance Standard Time": "Europe/Paris",
  "E. Europe Standard Time": "Europe/Chisinau",
  "Egypt Standard Time": "Africa/Cairo",
  "South Africa Standard Time": "Africa/Johannesburg",
  "Israel Standard Time": "Asia/Jerusalem",
  "Arab Standard Time": "Asia/Riyadh",
  "India Standard Time": "Asia/Kolkata",
  "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "New Zealand Standard Time": "Pacific/Auckland"
};

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanLongText(value, max = 2000) {
  return String(value || "").trim().replace(/\r/g, "").slice(0, max);
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

function emailTokens(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/);
  return items.map(cleanEmail).filter(Boolean);
}

function cleanEmailList(value) {
  return [...new Set(emailTokens(value).filter(isValidEmail))];
}

function textTokens(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  return items.map((item) => String(item || "").trim()).filter(Boolean);
}

function cleanPhotoUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^\/[a-z0-9/_.,%+-]+\.(png|jpe?g|webp|gif)$/i.test(url)) return url.slice(0, 500);
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
}

function cleanCalendarUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url.replace(/^webcal:/i, "https:"));
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString().slice(0, 900) : "";
  } catch {
    return "";
  }
}

function cleanCalendarUrlList(value) {
  return [...new Set(textTokens(value).map(cleanCalendarUrl).filter(Boolean))].slice(0, 8);
}

function cleanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanTime(value, fallback) {
  const time = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : fallback;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function utcDateFromValue(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function cleanPositiveInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64Encode(value) {
  return bytesToBase64(new TextEncoder().encode(String(value || "")));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function encryptionKey(env) {
  const secret = tokenEncryptionSecret(env);
  if (!secret) throw new Error("Calendar token encryption secret is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptText(env, value) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(env),
    new TextEncoder().encode(String(value || ""))
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decryptText(env, value) {
  const [iv, encrypted] = String(value || "").split(".");
  if (!iv || !encrypted) throw new Error("Stored calendar token is invalid.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(env),
    base64ToBytes(encrypted)
  );
  return new TextDecoder().decode(decrypted);
}

function requireStore(env) {
  if (!env.MOJO_SUMMITS_STORAGE && !env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Scheduling storage is not configured." }, { status: 500 });
  }
  return null;
}

function schedulingObjectStore(env) {
  return env.MOJO_SUMMITS_STORAGE?.get && env.MOJO_SUMMITS_STORAGE?.put
    ? env.MOJO_SUMMITS_STORAGE
    : null;
}

function schedulingKvStore(env) {
  return env.MOJO_SUMMITS_SETUP_STATE?.get ? env.MOJO_SUMMITS_SETUP_STATE : null;
}

function withoutExpiryMetadata(value) {
  if (!value || typeof value !== "object" || !value.__expiresAt) return value;
  const { __expiresAt, ...rest } = value;
  if (new Date(__expiresAt).getTime() <= Date.now()) return null;
  return rest;
}

async function objectText(object) {
  if (!object) return null;
  return object.text();
}

async function getStoredText(env, key) {
  const object = await schedulingObjectStore(env)?.get(key).catch(() => null);
  const text = await objectText(object);
  if (text !== null) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      try {
        const wrapper = JSON.parse(trimmed);
        if (wrapper?.__value !== undefined) {
          if (wrapper.__expiresAt && new Date(wrapper.__expiresAt).getTime() <= Date.now()) {
            await deleteStoredValue(env, key).catch(() => null);
            return null;
          }
          return String(wrapper.__value);
        }
      } catch {
        return text;
      }
    }
    return text;
  }
  return schedulingKvStore(env)?.get(key).catch(() => null) || null;
}

async function getStoredJson(env, key) {
  const object = await schedulingObjectStore(env)?.get(key).catch(() => null);
  if (object) {
    let value = null;
    try {
      value = JSON.parse(await object.text());
    } catch {
      return null;
    }
    const clean = withoutExpiryMetadata(value);
    if (!clean) {
      await deleteStoredValue(env, key).catch(() => null);
      return null;
    }
    return clean;
  }
  return schedulingKvStore(env)?.get(key, "json").catch(() => null) || null;
}

async function putStoredText(env, key, value, options = {}) {
  const objectStore = schedulingObjectStore(env);
  if (objectStore) {
    const body = options.expirationTtl
      ? JSON.stringify({
          __value: String(value),
          __expiresAt: new Date(Date.now() + options.expirationTtl * 1000).toISOString()
        })
      : String(value);
    await objectStore.put(key, body, {
      httpMetadata: {
        contentType: options.expirationTtl ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"
      }
    });
    return;
  }
  await schedulingKvStore(env).put(key, String(value), options);
}

async function putStoredJson(env, key, value, options = {}) {
  const payload = options.expirationTtl
    ? {
        ...value,
        __expiresAt: new Date(Date.now() + options.expirationTtl * 1000).toISOString()
      }
    : value;
  const objectStore = schedulingObjectStore(env);
  if (objectStore) {
    await objectStore.put(key, JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
    return;
  }
  await schedulingKvStore(env).put(key, JSON.stringify(value), options);
}

async function deleteStoredValue(env, key) {
  const objectStore = schedulingObjectStore(env);
  if (objectStore) await objectStore.delete(key).catch(() => null);
  await schedulingKvStore(env)?.delete(key).catch(() => null);
}

async function listStoredJsonByPrefix(env, prefix) {
  const keys = new Set();
  const objectStore = schedulingObjectStore(env);
  if (objectStore) {
    let cursor;
    do {
      const page = await objectStore.list({ prefix, cursor }).catch(() => null);
      (page?.objects || []).forEach((object) => keys.add(object.key));
      cursor = page?.truncated ? page.cursor : undefined;
    } while (cursor);
  }

  const kv = schedulingKvStore(env);
  if (kv) {
    let cursor;
    do {
      const page = await kv.list({ prefix, cursor }).catch(() => null);
      (page?.keys || []).forEach((item) => keys.add(item.name));
      cursor = page?.list_complete === false ? page.cursor : undefined;
    } while (cursor);
  }

  const records = await Promise.all([...keys].map((key) => getStoredJson(env, key)));
  return records.filter(Boolean);
}

function requestOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function oauthRedirectUri(request) {
  return `${requestOrigin(request)}/api/scheduling/oauth/callback`;
}

function graphConfig(env) {
  const tenantId = cleanText(env.MOJO_MS_TENANT_ID || env.MOJO_MAIL_TENANT_ID || env.MICROSOFT_TENANT_ID || env.MS_TENANT_ID, 160);
  const clientId = cleanText(env.MOJO_MS_CLIENT_ID || env.MOJO_MAIL_CLIENT_ID || env.MICROSOFT_CLIENT_ID || env.MS_CLIENT_ID, 160);
  const clientSecret = String(env.MOJO_MS_CLIENT_SECRET || env.MOJO_MAIL_CLIENT_SECRET || env.MICROSOFT_CLIENT_SECRET || env.MS_CLIENT_SECRET || "");
  return {
    tenantId,
    clientId,
    clientSecret,
    configured: Boolean(tenantId && clientId && clientSecret)
  };
}

function zoomConfig(env) {
  const accountId = cleanText(env.ZOOM_ACCOUNT_ID, 200);
  const clientId = cleanText(env.ZOOM_CLIENT_ID, 200);
  const clientSecret = String(env.ZOOM_CLIENT_SECRET || "");
  const userId = cleanText(env.ZOOM_USER_ID || "me", 200);
  return {
    accountId,
    clientId,
    clientSecret,
    userId,
    configured: Boolean(accountId && clientId && clientSecret)
  };
}

export function delegatedGraphConfig(env) {
  const base = graphConfig(env);
  return {
    tenantId: cleanText(env.MOJO_MS_DELEGATED_TENANT_ID || env.MICROSOFT_DELEGATED_TENANT_ID || "organizations", 160),
    clientId: cleanText(env.MOJO_MS_DELEGATED_CLIENT_ID || env.MICROSOFT_DELEGATED_CLIENT_ID || base.clientId, 160),
    clientSecret: String(env.MOJO_MS_DELEGATED_CLIENT_SECRET || env.MICROSOFT_DELEGATED_CLIENT_SECRET || base.clientSecret || ""),
    configured: Boolean((env.MOJO_MS_DELEGATED_CLIENT_ID || base.clientId) && (env.MOJO_MS_DELEGATED_CLIENT_SECRET || base.clientSecret))
  };
}

function tokenEncryptionSecret(env) {
  return String(env.MOJO_CALENDAR_TOKEN_KEY || env.MOJO_AUTH_SECRET || "");
}

function publicEmployee(employee) {
  return {
    slug: employee.slug,
    name: employee.name,
    title: employee.title,
    bio: employee.bio,
    photoUrl: employee.photoUrl || DEFAULT_PHOTOS[employee.slug] || "",
    bookingUrl: `/book-${employee.slug}/`,
    timezone: employee.timezone,
    active: employee.active,
    meetingTypes: (employee.meetingTypes || []).map(publicMeetingType)
  };
}

function publicMeetingType(meetingType) {
  return {
    ...meetingType,
    location: /teams/i.test(meetingType?.location || "") ? "Zoom" : meetingType.location || "Zoom"
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function icsEscape(value) {
  return cleanLongText(value, 4000)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateTimeRange(start, end, timeZone) {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(start);
  const time = `${new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(start)} - ${new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(end)}`;
  return { date, time };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function availabilitySourceError(message, detail = "") {
  const error = new Error(message);
  error.status = 503;
  error.availabilitySourceError = true;
  error.detail = detail || message;
  return error;
}

function calendarCheckUnavailable(source, detail = "") {
  return availabilitySourceError(
    `Availability is temporarily unavailable because ${source} could not be checked.`,
    detail
  );
}

function availabilityErrorResponse(error) {
  if (!error?.availabilitySourceError) return null;
  return json({ error: error.message }, { status: error.status || 503 });
}

function bookingKey(record) {
  return `${BOOKING_PREFIX}${record.start.slice(0, 10)}:${record.id}`;
}

async function putBookingRecord(env, record) {
  await putStoredJson(env, bookingKey(record), record);
}

function bookingConfirmationDetails(employee, meetingType, booking, start, end, zoomMeeting = null) {
  const guestTimeZone = normalizeTimeZone(booking.guestTimeZone, "");
  const hostRange = formatDateTimeRange(start, end, employee.timezone);
  const guestRange = guestTimeZone ? formatDateTimeRange(start, end, guestTimeZone) : null;
  const location = zoomMeeting?.joinUrl || meetingType.location || "Zoom";
  const subject = `${meetingType.label} with ${employee.name}`;
  return {
    subject,
    hostName: employee.name,
    hostEmail: employee.email,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    date: guestRange?.date || hostRange.date,
    time: guestRange?.time || hostRange.time,
    hostDate: hostRange.date,
    hostTime: hostRange.time,
    guestTimeZone,
    location,
    zoomJoinUrl: zoomMeeting?.joinUrl || "",
    zoomPasscode: zoomMeeting?.passcode || "",
    zoomMeetingId: zoomMeeting?.meetingId || "",
    company: booking.company || "",
    notes: booking.notes || ""
  };
}

function bookingCalendarInvite(employee, meetingType, booking, start, end, zoomMeeting = null) {
  const details = bookingConfirmationDetails(employee, meetingType, booking, start, end, zoomMeeting);
  const attendeeEmails = new Set([booking.guestEmail]);
  const attendeeLines = [
    `ATTENDEE;CN=${icsEscape(details.guestName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${details.guestEmail}`
  ];
  if (employee.email && !attendeeEmails.has(employee.email)) {
    attendeeEmails.add(employee.email);
    attendeeLines.push(`ATTENDEE;CN=${icsEscape(details.hostName)};ROLE=CHAIR;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${details.hostEmail}`);
  }
  for (const email of employee.mirrorInviteEmails || []) {
    const clean = cleanEmail(email);
    if (!clean || attendeeEmails.has(clean)) continue;
    attendeeEmails.add(clean);
    attendeeLines.push(`ATTENDEE;CN=${icsEscape(clean)};ROLE=OPT-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${clean}`);
  }
  const description = [
    "Booked through mojoaisummits.com.",
    details.zoomJoinUrl ? `Zoom: ${details.zoomJoinUrl}` : "",
    details.zoomPasscode ? `Zoom passcode: ${details.zoomPasscode}` : "",
    details.zoomMeetingId ? `Zoom meeting ID: ${details.zoomMeetingId}` : "",
    `Host: ${details.hostName} <${details.hostEmail}>`,
    `Guest: ${details.guestName} <${details.guestEmail}>`,
    details.guestTimeZone ? `Guest time zone: ${details.guestTimeZone}` : "",
    details.company ? `Company: ${details.company}` : "",
    details.notes ? `Notes: ${details.notes}` : ""
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mojo AI Summits//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${icsEscape(`${booking.id}@mojoaisummits.com`)}`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
    `DTSTART:${formatIcsDateTime(start)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `ORGANIZER;CN=${icsEscape(details.hostName)}:mailto:${details.hostEmail}`,
    ...attendeeLines,
    `SUMMARY:${icsEscape(details.subject)}`,
    `LOCATION:${icsEscape(details.location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    details.zoomJoinUrl ? `URL:${icsEscape(details.zoomJoinUrl)}` : "",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}

function bookingConfirmationText(employee, meetingType, booking, start, end, zoomMeeting = null) {
  const details = bookingConfirmationDetails(employee, meetingType, booking, start, end, zoomMeeting);
  const calendarLine = booking.graphEventId
    ? "A Microsoft calendar invitation has been sent from the host calendar."
    : "A calendar invite is attached to this email.";
  return [
    `Hi ${details.guestName},`,
    "",
    `Your ${meetingType.label} with ${details.hostName} is confirmed.`,
    "",
    "Booking details",
    `Date: ${details.date}`,
    `Time: ${details.time}`,
    details.guestTimeZone && details.hostTime !== details.time ? `Mojo time: ${details.hostDate}, ${details.hostTime}` : "",
    `Host: ${details.hostName} <${details.hostEmail}>`,
    `Location: ${details.location}`,
    details.zoomJoinUrl ? `Zoom: ${details.zoomJoinUrl}` : "",
    details.zoomPasscode ? `Zoom passcode: ${details.zoomPasscode}` : "",
    details.zoomMeetingId ? `Zoom meeting ID: ${details.zoomMeetingId}` : "",
    "",
    calendarLine,
    "",
    "Mojo AI Summits"
  ].filter((line) => line !== "").join("\n");
}

function bookingConfirmationHtml(employee, meetingType, booking, start, end, zoomMeeting = null) {
  const details = bookingConfirmationDetails(employee, meetingType, booking, start, end, zoomMeeting);
  const calendarLine = booking.graphEventId
    ? "A Microsoft calendar invitation has been sent from the host calendar."
    : "A calendar invite is attached to this email.";
  const rows = [
    ["Date", details.date],
    ["Time", details.time],
    details.guestTimeZone && details.hostTime !== details.time ? ["Mojo time", `${details.hostDate}, ${details.hostTime}`] : null,
    ["Host", `${details.hostName} <${details.hostEmail}>`],
    ["Location", details.location],
    details.zoomPasscode ? ["Zoom passcode", details.zoomPasscode] : null,
    details.zoomMeetingId ? ["Zoom meeting ID", details.zoomMeetingId] : null
  ].filter(Boolean).map(([label, value]) => {
    const cleanValue = escapeHtml(value);
    const renderedValue = /^https?:\/\//i.test(value)
      ? `<a href="${cleanValue}">${cleanValue}</a>`
      : cleanValue;
    return `<tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb;width:130px">${escapeHtml(label)}</th><td style="padding:8px 10px;border:1px solid #d8dee9">${renderedValue}</td></tr>`;
  }).join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.55;max-width:680px">
      <p>Hi ${escapeHtml(details.guestName)},</p>
      <p>Your <strong>${escapeHtml(meetingType.label)}</strong> with <strong>${escapeHtml(details.hostName)}</strong> is confirmed.</p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 20px">
        ${rows}
      </table>
      ${details.zoomJoinUrl ? `<p><a href="${escapeHtml(details.zoomJoinUrl)}">Open Zoom</a></p>` : ""}
      <p>${escapeHtml(calendarLine)}</p>
      <p style="margin-top:24px">Mojo AI Summits</p>
    </div>
  `;
}

async function sendBookingConfirmation(env, employee, meetingType, booking, start, end, zoomMeeting = null) {
  const sender = cleanEmail(env.MOJO_BOOKING_EMAIL_SENDER || env.MOJO_SCHEDULING_EMAIL_SENDER || env.MOJO_INVITE_EMAIL_SENDER || employee.email || DEFAULT_BOOKING_EMAIL_SENDER);
  const attachCalendarInvite = !booking.graphEventId;
  const calendarInvite = attachCalendarInvite
    ? bookingCalendarInvite(employee, meetingType, booking, start, end, zoomMeeting)
    : "";
  const hostRecipients = employee.email && employee.email !== booking.guestEmail
    ? [{ address: employee.email, name: employee.name }]
    : [];
  const mirrorRecipients = [...new Set((employee.mirrorInviteEmails || [])
    .map(cleanEmail)
    .filter((email) => email && email !== booking.guestEmail && email !== employee.email))]
    .map((email) => ({ address: email, name: email }));
  const message = {
    sender,
    to: [{ address: booking.guestEmail, name: booking.guestName }],
    cc: hostRecipients,
    bcc: mirrorRecipients,
    replyTo: [{ address: employee.email, name: employee.name }],
    subject: `Confirmed: ${meetingType.label} with ${employee.name}`,
    text: bookingConfirmationText(employee, meetingType, booking, start, end, zoomMeeting),
    html: bookingConfirmationHtml(employee, meetingType, booking, start, end, zoomMeeting),
    attachments: attachCalendarInvite
      ? [{
          name: "mojo-ai-summits-booking.ics",
          contentType: "text/calendar; method=REQUEST; charset=utf-8",
          contentBytes: base64Encode(calendarInvite)
        }]
      : [],
    saveToSentItems: true
  };
  let provider = "microsoft-graph";
  let graphError = "";
  try {
    await sendMicrosoftGraphMail(env, message);
  } catch (error) {
    graphError = cleanText(error?.message || "Microsoft Graph booking confirmation failed.", 400);
    await sendResendMail(env, message);
    provider = "resend";
  }

  return {
    attempted: true,
    sent: true,
    sender,
    provider,
    graphError,
    hostRecipients: hostRecipients.map((recipient) => recipient.address),
    mirrorRecipients: mirrorRecipients.map((recipient) => recipient.address),
    calendarInviteAttached: attachCalendarInvite,
    microsoftCalendarEventCreated: Boolean(booking.graphEventId)
  };
}

function meetingTypeForBooking(employee, meetingTypeId) {
  return employee.meetingTypes.find((type) => type.id === cleanSlug(meetingTypeId)) || employee.meetingTypes[0] || DEFAULT_MEETING_TYPE;
}

function zoomMeetingFromBooking(record = {}) {
  return record.zoomJoinUrl || record.zoomMeetingId
    ? {
        meetingId: record.zoomMeetingId || "",
        zoomUserId: record.zoomUserId || "",
        joinUrl: record.zoomJoinUrl || record.onlineMeetingUrl || "",
        passcode: record.zoomPasscode || ""
      }
    : null;
}

async function deliverBookingConfirmation(env, record, { maxAttempts = 1, delays = [] } = {}) {
  const employee = await getEmployee(env, record.employeeSlug);
  if (!employee || employee.active === false) {
    return {
      ...record,
      confirmationEmailSent: false,
      calendarInviteSent: false,
      confirmationEmailError: "Booking host is no longer available.",
      confirmationEmailLastAttemptAt: new Date().toISOString()
    };
  }

  const meetingType = meetingTypeForBooking(employee, record.meetingTypeId);
  const start = new Date(record.start);
  const end = new Date(record.end);
  const zoomMeeting = zoomMeetingFromBooking(record);
  let next = { ...record };
  let lastError = "";
  const attempts = Math.max(1, maxAttempts);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const confirmationEmail = await sendBookingConfirmation(env, employee, meetingType, next, start, end, zoomMeeting);
      next = {
        ...next,
        calendarInviteSent: Boolean(next.graphEventId) || (confirmationEmail.sent === true && confirmationEmail.calendarInviteAttached === true),
        confirmationEmailSent: confirmationEmail.sent === true,
        confirmationEmailError: "",
        confirmationEmailProvider: confirmationEmail.provider || "",
        confirmationEmailGraphError: confirmationEmail.graphError || "",
        hostNotificationRecipients: confirmationEmail.hostRecipients || [],
        mirrorNotificationRecipients: confirmationEmail.mirrorRecipients || [],
        confirmationEmailAttemptCount: (Number(next.confirmationEmailAttemptCount) || 0) + attempt,
        confirmationEmailLastAttemptAt: new Date().toISOString()
      };
      await putBookingRecord(env, next);
      return { record: next, sent: true, attempts: attempt };
    } catch (error) {
      lastError = cleanText(error?.message || "Booking confirmation email failed.", 400);
      if (attempt < attempts) await sleep(delays[attempt - 1] || 0);
    }
  }

  next = {
    ...next,
    calendarInviteSent: false,
    confirmationEmailSent: false,
    confirmationEmailError: lastError,
    confirmationEmailAttemptCount: (Number(next.confirmationEmailAttemptCount) || 0) + attempts,
    confirmationEmailLastAttemptAt: new Date().toISOString()
  };
  await putBookingRecord(env, next);
  return { record: next, sent: false, attempts, error: lastError };
}

function sanitizeMeetingType(input = {}) {
  const id = cleanSlug(input.id || input.label || DEFAULT_MEETING_TYPE.id) || DEFAULT_MEETING_TYPE.id;
  return {
    id,
    label: cleanText(input.label || DEFAULT_MEETING_TYPE.label, 120),
    durationMinutes: cleanPositiveInteger(input.durationMinutes, DEFAULT_MEETING_TYPE.durationMinutes, 15, 240),
    description: cleanText(input.description || DEFAULT_MEETING_TYPE.description, 280),
    location: cleanText(input.location || DEFAULT_MEETING_TYPE.location, 120)
  };
}

export function sanitizeEmployee(input = {}) {
  const email = cleanEmail(input.email);
  const slug = cleanSlug(input.slug || input.name || email);
  const busyCalendarEmails = cleanEmailList(input.busyCalendarEmails).filter((address) => address !== email);
  const authenticatedCalendarEmails = cleanEmailList(input.authenticatedCalendarEmails).filter((address) => address !== email);
  const busyCalendarUrls = cleanCalendarUrlList(input.busyCalendarUrls);
  const mirrorInviteEmails = cleanEmailList(input.mirrorInviteEmails).filter((address) => address !== email);
  const meetingTypes = Array.isArray(input.meetingTypes) && input.meetingTypes.length
    ? input.meetingTypes.map(sanitizeMeetingType)
    : [DEFAULT_MEETING_TYPE];

  return {
    slug,
    email,
    busyCalendarEmails,
    authenticatedCalendarEmails,
    busyCalendarUrls,
    mirrorInviteEmails,
    name: cleanText(input.name || email, 120),
    title: cleanText(input.title || "Mojo AI Summits", 160),
    bio: cleanText(input.bio || "", 320),
    photoUrl: cleanPhotoUrl(input.photoUrl) || DEFAULT_PHOTOS[slug] || "",
    timezone: cleanText(input.timezone || DEFAULT_TIMEZONE, 80),
    active: input.active !== false,
    workingDays: Array.isArray(input.workingDays)
      ? [...new Set(input.workingDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
      : DEFAULT_WORKING_DAYS,
    dayStart: cleanTime(input.dayStart, "09:00"),
    dayEnd: cleanTime(input.dayEnd, "17:00"),
    slotStepMinutes: cleanPositiveInteger(input.slotStepMinutes, 30, 5, 120),
    bufferBeforeMinutes: cleanPositiveInteger(input.bufferBeforeMinutes, 0, 0, 240),
    bufferAfterMinutes: cleanPositiveInteger(input.bufferAfterMinutes, 15, 0, 240),
    minNoticeHours: cleanPositiveInteger(input.minNoticeHours, 4, 0, 720),
    maxDaysAhead: cleanPositiveInteger(input.maxDaysAhead, 45, 1, 365),
    meetingTypes,
    updatedAt: new Date().toISOString()
  };
}

function defaultEmployee(slug) {
  const template = DEFAULT_EMPLOYEES.find((employee) => employee.slug === cleanSlug(slug));
  return template ? sanitizeEmployee(template) : null;
}

function effectiveEmployeeForDate(employee, dateValue) {
  if (
    cleanSlug(employee?.slug) === "angel" &&
    validDate(dateValue) &&
    dateValue >= ANGEL_CENTRAL_AVAILABILITY_EFFECTIVE_DATE
  ) {
    return {
      ...employee,
      ...ANGEL_CENTRAL_AVAILABILITY
    };
  }
  return employee;
}

function mergeDefaultEmployee(employee) {
  const fallback = defaultEmployee(employee?.slug);
  if (!fallback) return employee;
  return {
    ...employee,
    title: fallback.title || employee.title
  };
}

export async function listEmployees(env, { includeInactive = false } = {}) {
  const ids = await getStoredJson(env, TEAM_INDEX_KEY);
  const employees = await Promise.all(
    (Array.isArray(ids) ? ids : []).map((slug) =>
      getStoredJson(env, `${EMPLOYEE_PREFIX}${slug}`)
    )
  );
  const bySlug = new Map(
    DEFAULT_EMPLOYEES
      .map((employee) => defaultEmployee(employee.slug))
      .filter(Boolean)
      .map((employee) => [employee.slug, employee])
  );
  employees.filter(Boolean).forEach((employee) => {
    bySlug.set(employee.slug, mergeDefaultEmployee(employee));
  });
  return [...bySlug.values()]
    .filter((employee) => employee && (includeInactive || employee.active !== false))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEmployee(env, slug) {
  const clean = cleanSlug(slug);
  if (!clean) return null;
  const stored = await getStoredJson(env, `${EMPLOYEE_PREFIX}${clean}`);
  return stored ? mergeDefaultEmployee(stored) : defaultEmployee(clean);
}

async function connectionIds(env, employeeSlug) {
  const ids = await getStoredJson(env, `${CONNECTION_INDEX_PREFIX}${cleanSlug(employeeSlug)}`);
  return Array.isArray(ids) ? ids.map(cleanSlug).filter(Boolean) : [];
}

function publicConnection(connection) {
  return {
    id: connection.id,
    provider: connection.provider,
    email: connection.email,
    expectedEmail: connection.expectedEmail || connection.email,
    displayName: connection.displayName || "",
    status: connection.status || "connected",
    connectedAt: connection.connectedAt || "",
    updatedAt: connection.updatedAt || ""
  };
}

export async function listCalendarConnections(env, employeeSlug) {
  const slug = cleanSlug(employeeSlug);
  const ids = await connectionIds(env, slug);
  const records = await Promise.all(ids.map((id) =>
    getStoredJson(env, `${CONNECTION_PREFIX}${slug}:${id}`)
  ));
  return records.filter(Boolean);
}

export async function listPublicCalendarConnections(env, employeeSlug) {
  const records = await listCalendarConnections(env, employeeSlug);
  return records.map(publicConnection);
}

async function saveCalendarConnection(env, employeeSlug, connection) {
  const slug = cleanSlug(employeeSlug);
  const id = cleanSlug(connection.id || connection.email || crypto.randomUUID());
  const ids = [...new Set([...(await connectionIds(env, slug)), id])].sort();
  const now = new Date().toISOString();
  await putStoredJson(env, `${CONNECTION_PREFIX}${slug}:${id}`, {
    ...connection,
    id,
    employeeSlug: slug,
    provider: connection.provider || "microsoft",
    status: "connected",
    connectedAt: connection.connectedAt || now,
    updatedAt: now
  });
  await putStoredJson(env, `${CONNECTION_INDEX_PREFIX}${slug}`, ids);
  return id;
}

export async function saveEmployee(env, input, actor = "") {
  const employee = sanitizeEmployee(input);
  if (!employee.slug) throw new Error("Enter an employee slug or name.");
  if (!isValidEmail(employee.email)) throw new Error("Enter a valid employee calendar email.");
  const invalidBusyEmail = emailTokens(input.busyCalendarEmails).find((address) => !isValidEmail(address));
  if (invalidBusyEmail) throw new Error(`Fix the busy calendar email: ${invalidBusyEmail}`);
  const invalidAuthenticatedEmail = emailTokens(input.authenticatedCalendarEmails).find((address) => !isValidEmail(address));
  if (invalidAuthenticatedEmail) throw new Error(`Fix the authenticated calendar email: ${invalidAuthenticatedEmail}`);
  const invalidMirrorEmail = emailTokens(input.mirrorInviteEmails).find((address) => !isValidEmail(address));
  if (invalidMirrorEmail) throw new Error(`Fix the blind calendar invite email: ${invalidMirrorEmail}`);
  const invalidBusyUrl = textTokens(input.busyCalendarUrls).find((url) => !cleanCalendarUrl(url));
  if (invalidBusyUrl) throw new Error(`Fix the busy calendar URL: ${invalidBusyUrl}`);
  if (input.photoUrl && !cleanPhotoUrl(input.photoUrl)) throw new Error("Enter a valid profile photo URL.");
  if (minutesFromTime(employee.dayEnd) <= minutesFromTime(employee.dayStart)) {
    throw new Error("Working day end time must be later than the start time.");
  }

  const ids = await getStoredJson(env, TEAM_INDEX_KEY);
  const nextIds = [...new Set([...(Array.isArray(ids) ? ids : []), employee.slug])].sort();
  await putStoredJson(env, `${EMPLOYEE_PREFIX}${employee.slug}`, {
    ...employee,
    updatedBy: cleanEmail(actor)
  });
  await putStoredJson(env, TEAM_INDEX_KEY, nextIds);
  return employee;
}

function partsInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function normalizeTimeZone(value, fallback = DEFAULT_TIMEZONE) {
  const candidate = String(value || "").trim();
  const normalized = WINDOWS_TIMEZONE_MAP[candidate] || candidate || fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
    return normalized;
  } catch {
    return fallback;
  }
}

function zonedTimeToUtc(dateValue, timeValue, timeZone) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const trial = new Date(desiredUtc);
  const actual = partsInZone(trial, normalizeTimeZone(timeZone));
  const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
  return new Date(desiredUtc + (desiredUtc - actualUtc));
}

function localDateKey(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function weekdayForLocalDate(dateValue, timeZone) {
  return zonedTimeToUtc(dateValue, "12:00", timeZone).toLocaleString("en-US", {
    timeZone,
    weekday: "short"
  });
}

function weekdayIndex(dateValue, timeZone) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayForLocalDate(dateValue, timeZone));
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  return utcDateKey(utcDateFromValue(value)) === value;
}

function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function busyIntervalsFromSchedule(scheduleItems = [], employee) {
  return scheduleItems
    .map((item) => {
      const startValue = item.start?.dateTime;
      const endValue = item.end?.dateTime;
      if (!startValue || !endValue) return null;
      const start = new Date(startValue.endsWith("Z") ? startValue : `${startValue}Z`);
      const end = new Date(endValue.endsWith("Z") ? endValue : `${endValue}Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return {
        start: new Date(start.getTime() - employee.bufferBeforeMinutes * 60000),
        end: new Date(end.getTime() + employee.bufferAfterMinutes * 60000)
      };
    })
    .filter(Boolean);
}

async function graphAccessToken(env) {
  const config = graphConfig(env);
  if (!config.configured) throw new Error("Microsoft Graph scheduling credentials are not configured.");

  const body = new URLSearchParams();
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Microsoft Graph token request failed.");
  }
  return payload.access_token;
}

async function zoomAccessToken(env) {
  const config = zoomConfig(env);
  if (!config.configured) throw new Error("Zoom scheduling credentials are not configured yet.");
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(config.accountId)}`,
    {
      method: "POST",
      headers: { authorization: `Basic ${credentials}` }
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.reason || payload.message || "Zoom OAuth token request failed.");
  return payload.access_token;
}

function zoomStartTime(start) {
  return start.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizeZoomUserId(value) {
  return cleanText(value, 200).toLowerCase();
}

function zoomUserForEmployee(config, employee) {
  return cleanText(employee.zoomUserId || employee.zoomUserEmail || employee.email || config.userId, 200);
}

function zoomUserForBooking(config, booking) {
  return cleanText(booking.zoomUserId || config.userId, 200);
}

async function createZoomMeeting(env, employee, meetingType, booking, start, end) {
  const token = await zoomAccessToken(env);
  const config = zoomConfig(env);
  const targetUserId = zoomUserForEmployee(config, employee);
  const createForUser = async (userId) => fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      topic: `MOJO AI Summits | ${meetingType.label}: ${booking.guestName}`,
      type: 2,
      start_time: zoomStartTime(start),
      duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      timezone: "UTC",
      agenda: [
        `Booked through mojoaisummits.com.`,
        `Host: ${employee.name} <${employee.email}>`,
        `Guest: ${booking.guestName} <${booking.guestEmail}>`,
        booking.guestTimeZone ? `Guest time zone: ${booking.guestTimeZone}` : "",
        booking.company ? `Company: ${booking.company}` : ""
      ].filter(Boolean).join("\n"),
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
    })
  });

  const response = await createForUser(targetUserId);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Zoom meeting creation failed.");
  if (cleanEmail(payload.host_email) && cleanEmail(payload.host_email) !== cleanEmail(employee.email)) {
    await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(payload.id)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` }
    }).catch(() => null);
    throw new Error("Zoom created the meeting under the wrong host.");
  }
  return {
    meetingId: String(payload.id || ""),
    joinUrl: payload.join_url || "",
    passcode: payload.password || "",
    startAt: payload.start_time || start.toISOString(),
    zoomUserId: payload.host_email || payload.host_id || targetUserId
  };
}

async function deleteZoomMeeting(env, meetingId) {
  if (!meetingId) return;
  try {
    const token = await zoomAccessToken(env);
    await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` }
    });
  } catch {
    // If calendar creation fails, avoid making the user wait on best-effort Zoom cleanup.
  }
}

async function exchangeDelegatedToken(env, request, params) {
  const config = delegatedGraphConfig(env);
  if (!config.configured) throw new Error("Microsoft delegated calendar OAuth is not configured.");
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: params.grantType
  });
  if (request) body.set("redirect_uri", oauthRedirectUri(request));
  if (params.code) body.set("code", params.code);
  if (params.refreshToken) body.set("refresh_token", params.refreshToken);
  if (params.scope) body.set("scope", params.scope);

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Microsoft delegated token request failed.");
  }
  return payload;
}

async function delegatedGraphGet(accessToken, path) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || "Microsoft delegated Graph request failed.");
  return payload;
}

async function delegatedAccessToken(env, request, connection) {
  const refreshToken = await decryptText(env, connection.refreshToken);
  const payload = await exchangeDelegatedToken(env, request, {
    grantType: "refresh_token",
    refreshToken,
    scope: "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read"
  });
  if (payload.refresh_token && payload.refresh_token !== refreshToken) {
    await saveCalendarConnection(env, connection.employeeSlug, {
      ...connection,
      refreshToken: await encryptText(env, payload.refresh_token)
    });
  }
  return payload.access_token;
}

export async function beginMicrosoftCalendarOAuth(env, request, { slug, email = "", actor = "" } = {}) {
  const employee = await getEmployee(env, slug);
  if (!employee) return { response: json({ error: "Choose a saved employee profile first." }, { status: 404 }) };
  const expectedEmail = cleanEmail(email);
  if (expectedEmail && !isValidEmail(expectedEmail)) {
    return { response: json({ error: "Choose a valid calendar email to connect." }, { status: 400 }) };
  }
  const config = delegatedGraphConfig(env);
  if (!config.configured) {
    return { response: json({ error: "Microsoft delegated calendar OAuth is not configured." }, { status: 503 }) };
  }

  const state = crypto.randomUUID();
  await putStoredJson(env, `${OAUTH_STATE_PREFIX}${state}`, {
    slug: employee.slug,
    expectedEmail,
    actor: cleanEmail(actor),
    createdAt: new Date().toISOString()
  }, { expirationTtl: OAUTH_STATE_TTL_SECONDS });

  const authorize = new URL(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize`);
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", oauthRedirectUri(request));
  authorize.searchParams.set("response_mode", "query");
  authorize.searchParams.set("scope", "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read");
  authorize.searchParams.set("state", state);
  if (expectedEmail) authorize.searchParams.set("login_hint", expectedEmail);
  authorize.searchParams.set("prompt", "select_account");
  return Response.redirect(authorize.toString(), 302);
}

export async function finishMicrosoftCalendarOAuth(env, request, query) {
  const state = cleanText(query.state, 120);
  const code = String(query.code || "");
  if (!state || !code) return Response.redirect(`${requestOrigin(request)}/schedule-admin/?calendar=missing-code`, 302);

  const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
  const stateRecord = await getStoredJson(env, stateKey);
  await deleteStoredValue(env, stateKey);
  if (!stateRecord?.slug) return Response.redirect(`${requestOrigin(request)}/schedule-admin/?calendar=expired`, 302);

  const tokenPayload = await exchangeDelegatedToken(env, request, {
    grantType: "authorization_code",
    code,
    scope: "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read"
  });
  if (!tokenPayload.refresh_token) throw new Error("Microsoft did not return an offline calendar token.");

  const me = await delegatedGraphGet(tokenPayload.access_token, "/me?$select=displayName,mail,userPrincipalName");
  const email = cleanEmail(me.mail || me.userPrincipalName);
  if (!isValidEmail(email)) throw new Error("Microsoft did not return a usable calendar account email.");
  if (stateRecord.expectedEmail && email !== stateRecord.expectedEmail) {
    return Response.redirect(`${requestOrigin(request)}/schedule-admin/?calendar=mismatch&expected=${encodeURIComponent(stateRecord.expectedEmail)}&actual=${encodeURIComponent(email)}`, 302);
  }

  await saveCalendarConnection(env, stateRecord.slug, {
    id: stateRecord.expectedEmail || email,
    provider: "microsoft",
    email,
    expectedEmail: stateRecord.expectedEmail || email,
    displayName: cleanText(me.displayName || email, 160),
    refreshToken: await encryptText(env, tokenPayload.refresh_token),
    connectedBy: stateRecord.actor || ""
  });
  return Response.redirect(`${requestOrigin(request)}/schedule-admin/?calendar=connected`, 302);
}

async function graphSchedule(env, employee, start, end, durationMinutes) {
  const token = await graphAccessToken(env);
  const schedules = [...new Set([employee.email, ...(employee.busyCalendarEmails || [])])];
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(employee.email)}/calendar/getSchedule`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schedules,
        startTime: { dateTime: start.toISOString(), timeZone: "UTC" },
        endTime: { dateTime: end.toISOString(), timeZone: "UTC" },
        availabilityViewInterval: durationMinutes
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Microsoft Graph availability lookup failed.");
  }
  const scheduleError = (payload.value || []).find((schedule) => schedule.error);
  if (scheduleError) {
    throw new Error(`Microsoft Graph could not read availability for ${scheduleError.scheduleId || "one calendar"}.`);
  }
  return (payload.value || []).flatMap((schedule) => schedule.scheduleItems || []);
}

function parseIcalProperty(line) {
  const index = line.indexOf(":");
  if (index < 0) return null;
  const keyPart = line.slice(0, index);
  const value = line.slice(index + 1);
  const [name, ...paramParts] = keyPart.split(";");
  const params = {};
  paramParts.forEach((part) => {
    const [key, ...rest] = part.split("=");
    if (!key || !rest.length) return;
    params[key.toUpperCase()] = rest.join("=").replace(/^"|"$/g, "");
  });
  return { name: name.toUpperCase(), params, value };
}

function parseIcalDate(value, params = {}, fallbackTimeZone = DEFAULT_TIMEZONE) {
  const raw = String(value || "").trim();
  const timeZone = normalizeTimeZone(params.TZID, fallbackTimeZone);
  if (/^\d{8}$/.test(raw)) {
    return zonedTimeToUtc(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, "00:00", timeZone);
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00", utc] = match;
  if (utc) return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return zonedTimeToUtc(`${year}-${month}-${day}`, `${hour}:${minute}`, timeZone);
}

function parseRrule(value) {
  return Object.fromEntries(String(value || "").split(";").map((part) => {
    const [key, ...rest] = part.split("=");
    return [key?.toUpperCase(), rest.join("=")];
  }).filter(([key, valuePart]) => key && valuePart));
}

function expandIcalEvent(event, rangeStart, rangeEnd) {
  const duration = event.end.getTime() - event.start.getTime();
  if (duration <= 0) return [];
  const blocked = [];
  const addOccurrence = (occurrenceStart) => {
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
    if (event.exdates.has(occurrenceStart.toISOString())) return;
    if (overlaps(occurrenceStart, occurrenceEnd, rangeStart, rangeEnd)) {
      blocked.push({ start: occurrenceStart, end: occurrenceEnd });
    }
  };

  if (!event.rrule) {
    addOccurrence(event.start);
    return blocked;
  }

  const rule = parseRrule(event.rrule);
  const freq = rule.FREQ;
  const interval = cleanPositiveInteger(rule.INTERVAL, 1, 1, 365);
  const count = rule.COUNT ? cleanPositiveInteger(rule.COUNT, 1, 1, 2000) : 2000;
  const until = rule.UNTIL ? parseIcalDate(rule.UNTIL, {}, event.timezone) : null;
  const byDayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byDays = rule.BYDAY
    ? rule.BYDAY.split(",").map((day) => byDayMap[day.slice(-2)]).filter((day) => Number.isInteger(day))
    : [event.start.getUTCDay()];

  let emitted = 0;
  for (let dayOffset = 0; emitted < count && dayOffset < 1460; dayOffset += 1) {
    const occurrenceStart = new Date(event.start.getTime() + dayOffset * 86400000);
    if (occurrenceStart > rangeEnd) break;
    if (until && occurrenceStart > until) break;

    let matches = false;
    if (freq === "DAILY") {
      matches = dayOffset % interval === 0;
    } else if (freq === "WEEKLY") {
      matches = Math.floor(dayOffset / 7) % interval === 0 && byDays.includes(occurrenceStart.getUTCDay());
    } else {
      matches = dayOffset === 0;
    }

    if (!matches) continue;
    emitted += 1;
    addOccurrence(occurrenceStart);
  }

  return blocked;
}

function busyIntervalsFromIcal(text, employee, rangeStart, rangeEnd) {
  const lines = String(text || "").replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const intervals = [];
  let current = null;

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      current = { exdates: new Set(), timezone: employee.timezone };
      return;
    }
    if (line === "END:VEVENT") {
      if (current?.start && current?.end && current.status !== "CANCELLED" && current.transp !== "TRANSPARENT") {
        expandIcalEvent(current, rangeStart, rangeEnd).forEach((interval) => {
          intervals.push({
            start: new Date(interval.start.getTime() - employee.bufferBeforeMinutes * 60000),
            end: new Date(interval.end.getTime() + employee.bufferAfterMinutes * 60000)
          });
        });
      }
      current = null;
      return;
    }
    if (!current) return;

    const property = parseIcalProperty(line);
    if (!property) return;
    if (property.name === "DTSTART") current.start = parseIcalDate(property.value, property.params, employee.timezone);
    if (property.name === "DTEND") current.end = parseIcalDate(property.value, property.params, employee.timezone);
    if (property.name === "STATUS") current.status = property.value.toUpperCase();
    if (property.name === "TRANSP") current.transp = property.value.toUpperCase();
    if (property.name === "RRULE") current.rrule = property.value;
    if (property.name === "EXDATE") {
      property.value.split(",").forEach((value) => {
        const exdate = parseIcalDate(value, property.params, employee.timezone);
        if (exdate) current.exdates.add(exdate.toISOString());
      });
    }
  });

  return intervals;
}

function calendarFeedLabel(url, index) {
  try {
    const parsed = new URL(String(url || "").replace(/^webcal:/i, "https:"));
    const parts = parsed.pathname.split("/").filter(Boolean);
    const pathHint = parts.length ? `/${parts.slice(0, 2).join("/")}${parts.length > 2 ? "/..." : ""}` : "";
    return `${parsed.hostname}${pathHint}`;
  } catch {
    return `Calendar feed ${index + 1}`;
  }
}

async function calendarFeedBusyDetails(employee, start, end) {
  const urls = employee.busyCalendarUrls || [];
  if (!urls.length) return { intervals: [], feeds: [] };

  const calendars = await Promise.all(urls.map(async (url, index) => {
    const base = {
      index: index + 1,
      label: calendarFeedLabel(url, index),
      connected: false,
      status: "not-checked",
      httpStatus: null,
      bytes: 0,
      busyEventCount: 0,
      error: "",
      intervals: []
    };

    try {
      const response = await fetch(url, {
        headers: { accept: "text/calendar,text/plain,*/*" }
      });
      if (!response.ok) {
        return {
          ...base,
          status: "fetch-failed",
          httpStatus: response.status,
          error: `Feed returned HTTP ${response.status}.`
        };
      }
      const text = await response.text();
      if (text.length > 2000000) {
        return {
          ...base,
          connected: true,
          status: "too-large",
          httpStatus: response.status,
          bytes: text.length,
          error: "Feed is larger than the scheduling safety limit."
        };
      }
      const intervals = busyIntervalsFromIcal(text, employee, start, end);
      return {
        ...base,
        connected: true,
        status: intervals.length ? "busy-events-found" : "connected-no-busy-events",
        httpStatus: response.status,
        bytes: text.length,
        busyEventCount: intervals.length,
        intervals
      };
    } catch (error) {
      return {
        ...base,
        status: "fetch-error",
        error: error?.message || "Unable to fetch the feed."
      };
    }
  }));

  return {
    intervals: calendars.flatMap((feed) => feed.intervals),
    feeds: calendars
  };
}

async function calendarFeedBusyIntervals(employee, start, end) {
  return (await calendarFeedBusyDetails(employee, start, end)).intervals;
}

function activeCalendarConnections(connections = []) {
  return connections.filter((connection) => connection.provider === "microsoft" && connection.status !== "disabled");
}

async function connectedCalendarBusyDetails(env, employee, start, end) {
  const connections = await listCalendarConnections(env, employee.slug);
  const activeConnections = activeCalendarConnections(connections);
  const expectedEmails = [...new Set((employee.authenticatedCalendarEmails || []).map(cleanEmail).filter(isValidEmail))];
  const connectedEmails = new Set(activeConnections.flatMap((connection) => [
    cleanEmail(connection.email),
    cleanEmail(connection.expectedEmail),
    cleanEmail(connection.id)
  ]).filter(isValidEmail));
  const missingConnections = expectedEmails.filter((email) => !connectedEmails.has(email));
  if (missingConnections.length) {
    throw availabilitySourceError(
      "Availability is temporarily unavailable because a configured Microsoft calendar is not connected.",
      `Missing connected Microsoft calendar records for ${missingConnections.join(", ")}.`
    );
  }
  if (!activeConnections.length) return { intervals: [], checked: false, connectionCount: 0 };

  const calendars = await Promise.all(activeConnections.map(async (connection) => {
    try {
      const accessToken = await delegatedAccessToken(env, null, connection);
      const params = new URLSearchParams({
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        "$select": "start,end,showAs,isCancelled"
      });
      const payload = await delegatedGraphGet(accessToken, `/me/calendarView?${params.toString()}`);
      return (payload.value || [])
        .filter((event) => event && event.isCancelled !== true && event.showAs !== "free")
        .map((event) => ({
          start: event.start,
          end: event.end
        }));
    } catch (error) {
      throw calendarCheckUnavailable(
        "a connected Microsoft calendar",
        error?.message || "Connected Microsoft calendar lookup failed."
      );
    }
  }));

  return {
    intervals: busyIntervalsFromSchedule(calendars.flat(), employee),
    checked: true,
    connectionCount: activeConnections.length
  };
}

async function connectedCalendarBusyIntervals(env, employee, start, end) {
  return (await connectedCalendarBusyDetails(env, employee, start, end)).intervals;
}

function failedCalendarFeeds(feedDetails) {
  return (feedDetails.feeds || []).filter((feed) =>
    !["busy-events-found", "connected-no-busy-events"].includes(feed.status)
  );
}

async function sharedZoomBusyIntervals(env, start, end, zoomUserId = "") {
  const config = zoomConfig(env);
  const targetZoomUserId = normalizeZoomUserId(zoomUserId || config.userId);
  const dateKeys = new Set();
  for (let cursor = addUtcDays(start, -1); cursor <= addUtcDays(end, 1); cursor = addUtcDays(cursor, 1)) {
    dateKeys.add(utcDateKey(cursor));
  }

  const records = [];
  await Promise.all([...dateKeys].map(async (dateKey) => {
    records.push(...(await listStoredJsonByPrefix(env, `${BOOKING_PREFIX}${dateKey}:`)));
  }));
  records.push(...(await listStoredJsonByPrefix(env, HOLD_PREFIX)));

  return records
    .filter((record) => record.status !== "cancelled")
    .filter((record) => normalizeZoomUserId(zoomUserForBooking(config, record)) === targetZoomUserId)
    .map((record) => ({
      start: record.start,
      end: record.end
    }))
    .filter((interval) => interval.start && interval.end)
    .filter((interval) => overlaps(start, end, new Date(interval.start), new Date(interval.end)))
    .map((interval) => ({
      start: new Date(interval.start),
      end: new Date(interval.end)
    }));
}

async function hasSharedZoomConflict(env, start, end, zoomUserId = "") {
  return (await sharedZoomBusyIntervals(env, start, end, zoomUserId)).length > 0;
}

async function availabilityContext(env, employee, start, end, meetingType) {
  const zoom = zoomConfig(env);
  const employeeZoomUserId = zoomUserForEmployee(zoom, employee);
  const graph = graphConfig(env);
  let source = "local-rules";
  let warning = graph.configured ? "" : "Live calendar sync is limited, so slots only reflect saved working hours.";
  let busyIntervals = [];

  if (!graph.configured && (employee.busyCalendarEmails || []).length) {
    throw availabilitySourceError(
      "Availability is temporarily unavailable because Microsoft calendar sync is not configured.",
      "Same-tenant busy calendar emails are configured, but Microsoft Graph app credentials are unavailable."
    );
  }

  if (graph.configured) {
    try {
      const scheduleItems = await graphSchedule(env, employee, start, end, meetingType.durationMinutes);
      busyIntervals = busyIntervalsFromSchedule(scheduleItems, employee);
      source = "microsoft-graph";
      warning = "";
    } catch (error) {
      throw calendarCheckUnavailable("Microsoft calendar sync", error?.message || "Microsoft Graph availability lookup failed.");
    }
  }

  if ((employee.busyCalendarUrls || []).length) {
    const feedDetails = await calendarFeedBusyDetails(employee, start, end);
    const feedFailures = failedCalendarFeeds(feedDetails);
    if (feedFailures.length) {
      throw calendarCheckUnavailable(
        "a published calendar feed",
        feedFailures.map((feed) => `${feed.label}: ${feed.error || feed.status}`).join("; ")
      );
    }
    busyIntervals = [...busyIntervals, ...feedDetails.intervals];
    source = graph.configured ? "microsoft-graph+calendar-feeds" : "calendar-feeds";
    warning = graph.configured ? "" : "Live calendar sync is limited, so slots only reflect saved working hours and calendar feeds.";
  }

  const connectedCalendarDetails = await connectedCalendarBusyDetails(env, employee, start, end);
  if (connectedCalendarDetails.checked) {
    busyIntervals = [...busyIntervals, ...connectedCalendarDetails.intervals];
    source = `${source}+connected-calendars`;
  }

  const sharedZoomIntervals = await sharedZoomBusyIntervals(env, start, end, employeeZoomUserId);
  if (sharedZoomIntervals.length) {
    busyIntervals = [...busyIntervals, ...sharedZoomIntervals];
    source = `${source}+shared-zoom`;
  }

  return { source, warning, busyIntervals };
}

function buildCandidateSlots(employee, dateValue, meetingType, busyIntervals = []) {
  if (!employee.workingDays.includes(weekdayIndex(dateValue, employee.timezone))) return [];

  const now = new Date();
  const minStart = new Date(now.getTime() + employee.minNoticeHours * 3600000);
  const maxStart = new Date(now.getTime() + employee.maxDaysAhead * 86400000);
  const slots = [];
  const dayStart = minutesFromTime(employee.dayStart);
  const dayEnd = minutesFromTime(employee.dayEnd);

  for (let minute = dayStart; minute + meetingType.durationMinutes <= dayEnd; minute += employee.slotStepMinutes) {
    const start = zonedTimeToUtc(dateValue, timeFromMinutes(minute), employee.timezone);
    const end = new Date(start.getTime() + meetingType.durationMinutes * 60000);
    if (start < minStart || start > maxStart) continue;
    if (localDateKey(start, employee.timezone) !== dateValue) continue;
    if (busyIntervals.some((busy) => overlaps(start, end, busy.start, busy.end))) continue;
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: employee.timezone,
        hour: "numeric",
        minute: "2-digit"
      }).format(start)
    });
  }

  return slots;
}

export async function availability(env, query) {
  let employee = await getEmployee(env, query.host || query.employee || query.slug);
  if (!employee || employee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const dateValue = String(query.date || "");
  if (!validDate(dateValue)) {
    return { response: json({ error: "Choose a date in YYYY-MM-DD format." }, { status: 400 }) };
  }
  employee = effectiveEmployeeForDate(employee, dateValue);
  const meetingType = employee.meetingTypes.find((type) => type.id === cleanSlug(query.type)) || employee.meetingTypes[0];

  const dayStart = zonedTimeToUtc(dateValue, employee.dayStart, employee.timezone);
  const dayEnd = zonedTimeToUtc(dateValue, employee.dayEnd, employee.timezone);
  let source;
  let warning;
  let busyIntervals;
  try {
    ({ source, warning, busyIntervals } = await availabilityContext(env, employee, dayStart, dayEnd, meetingType));
  } catch (error) {
    const response = availabilityErrorResponse(error);
    if (response) return { response };
    throw error;
  }

  return {
    employee: publicEmployee(employee),
    meetingType: publicMeetingType(meetingType),
    date: dateValue,
    source,
    warning,
    slots: buildCandidateSlots(employee, dateValue, meetingType, busyIntervals)
  };
}

export async function availabilitySummary(env, query) {
  const baseEmployee = await getEmployee(env, query.host || query.employee || query.slug);
  if (!baseEmployee || baseEmployee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const startValue = String(query.start || "");
  const endValue = String(query.end || startValue);
  if (!validDate(startValue) || !validDate(endValue)) {
    return { response: json({ error: "Choose a valid date range in YYYY-MM-DD format." }, { status: 400 }) };
  }
  if (startValue > endValue) {
    return { response: json({ error: "The availability range start must be before the end date." }, { status: 400 }) };
  }

  const dates = [];
  for (let cursor = utcDateFromValue(startValue); cursor <= utcDateFromValue(endValue); cursor = addUtcDays(cursor, 1)) {
    dates.push(utcDateKey(cursor));
    if (dates.length > 62) {
      return { response: json({ error: "Availability summaries are limited to 62 days." }, { status: 400 }) };
    }
  }

  const rangeEmployees = dates.map((date) => effectiveEmployeeForDate(baseEmployee, date));
  const selectedType = cleanSlug(query.type);
  const firstMeetingType = rangeEmployees[0].meetingTypes.find((type) => type.id === selectedType) || rangeEmployees[0].meetingTypes[0];
  const starts = rangeEmployees.map((employee, index) =>
    zonedTimeToUtc(dates[index], employee.dayStart, employee.timezone).getTime()
  );
  const ends = rangeEmployees.map((employee, index) =>
    zonedTimeToUtc(dates[index], employee.dayEnd, employee.timezone).getTime()
  );
  const rangeStart = new Date(Math.min(...starts));
  const rangeEnd = new Date(Math.max(...ends));
  let source;
  let warning;
  let busyIntervals;
  try {
    ({ source, warning, busyIntervals } = await availabilityContext(env, baseEmployee, rangeStart, rangeEnd, firstMeetingType));
  } catch (error) {
    const response = availabilityErrorResponse(error);
    if (response) return { response };
    throw error;
  }

  const days = dates.map((date, index) => {
    const employee = rangeEmployees[index];
    const meetingType = employee.meetingTypes.find((type) => type.id === selectedType) || employee.meetingTypes[0];
    const slots = buildCandidateSlots(employee, date, meetingType, busyIntervals);
    return {
      date,
      slotCount: slots.length,
      slotStarts: slots.map((slot) => slot.start)
    };
  });

  return {
    employee: publicEmployee(baseEmployee),
    meetingType: publicMeetingType(firstMeetingType),
    start: startValue,
    end: endValue,
    source,
    warning,
    days
  };
}

export async function calendarFeedDiagnostics(env, query) {
  let employee = await getEmployee(env, query.host || query.employee || query.slug);
  if (!employee || employee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const dateValue = String(query.date || "");
  if (!validDate(dateValue)) {
    return { response: json({ error: "Choose a date in YYYY-MM-DD format." }, { status: 400 }) };
  }
  employee = effectiveEmployeeForDate(employee, dateValue);
  const meetingType = employee.meetingTypes.find((type) => type.id === cleanSlug(query.type)) || employee.meetingTypes[0];
  const zoom = zoomConfig(env);
  const employeeZoomUserId = zoomUserForEmployee(zoom, employee);

  const dayStart = zonedTimeToUtc(dateValue, employee.dayStart, employee.timezone);
  const dayEnd = zonedTimeToUtc(dateValue, employee.dayEnd, employee.timezone);
  const graph = graphConfig(env);
  const sourceWarnings = [];
  let baseBusyIntervals = [];

  if (graph.configured) {
    try {
      const scheduleItems = await graphSchedule(env, employee, dayStart, dayEnd, meetingType.durationMinutes);
      baseBusyIntervals = [...baseBusyIntervals, ...busyIntervalsFromSchedule(scheduleItems, employee)];
    } catch (error) {
      sourceWarnings.push(error?.message || "Microsoft Graph availability lookup failed.");
    }
  }

  try {
    baseBusyIntervals = [...baseBusyIntervals, ...(await connectedCalendarBusyIntervals(env, employee, dayStart, dayEnd))];
  } catch (error) {
    sourceWarnings.push(error?.message || "Connected calendar availability lookup failed.");
  }

  try {
    baseBusyIntervals = [...baseBusyIntervals, ...(await sharedZoomBusyIntervals(env, dayStart, dayEnd, employeeZoomUserId))];
  } catch (error) {
    sourceWarnings.push(error?.message || "Shared Zoom booking lookup failed.");
  }

  const feedDetails = await calendarFeedBusyDetails(employee, dayStart, dayEnd);
  const baselineSlots = buildCandidateSlots(employee, dateValue, meetingType, baseBusyIntervals);
  const finalSlots = buildCandidateSlots(employee, dateValue, meetingType, [...baseBusyIntervals, ...feedDetails.intervals]);
  const finalSlotStarts = new Set(finalSlots.map((slot) => slot.start));
  const baseBlocked = (slot) => baseBusyIntervals.some((busy) =>
    overlaps(new Date(slot.start), new Date(slot.end), busy.start, busy.end)
  );
  const feedBlocked = (slot, intervals = feedDetails.intervals) => intervals.some((busy) =>
    overlaps(new Date(slot.start), new Date(slot.end), busy.start, busy.end)
  );
  const removedSlots = baselineSlots
    .filter((slot) => !finalSlotStarts.has(slot.start) && !baseBlocked(slot) && feedBlocked(slot))
    .map((slot) => ({
      start: slot.start,
      end: slot.end,
      label: slot.label
    }));

  const feeds = feedDetails.feeds.map((feed) => ({
    index: feed.index,
    label: feed.label,
    connected: feed.connected,
    status: feed.status,
    httpStatus: feed.httpStatus,
    bytes: feed.bytes,
    busyEventCount: feed.busyEventCount,
    slotsRemoved: baselineSlots.filter((slot) =>
      !finalSlotStarts.has(slot.start) && !baseBlocked(slot) && feedBlocked(slot, feed.intervals)
    ).length,
    error: feed.error
  }));

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    employee: publicEmployee(employee),
    meetingType: publicMeetingType(meetingType),
    date: dateValue,
    timezone: employee.timezone,
    feedCount: feeds.length,
    connectedFeedCount: feeds.filter((feed) => feed.connected).length,
    busyEventCount: feeds.reduce((total, feed) => total + feed.busyEventCount, 0),
    availableBeforeFeeds: baselineSlots.length,
    availableAfterFeeds: finalSlots.length,
    slotsRemovedByFeeds: removedSlots.length,
    removedSlots,
    feeds,
    warnings: sourceWarnings
  };
}

async function createGraphEvent(env, employee, meetingType, booking, start, end, zoomMeeting) {
  const token = await graphAccessToken(env);
  const subject = `${meetingType.label}: ${booking.guestName}`;
  const mirrorInviteEmails = [...new Set((employee.mirrorInviteEmails || [])
    .map(cleanEmail)
    .filter((email) => email && email !== booking.guestEmail && email !== employee.email))];
  const attendees = [
    {
      emailAddress: {
        address: booking.guestEmail,
        name: booking.guestName
      },
      type: "required"
    },
    ...mirrorInviteEmails.map((email) => ({
      emailAddress: {
        address: email,
        name: email
      },
      type: "optional"
    }))
  ];
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(employee.email)}/calendar/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        subject,
        body: {
          contentType: "Text",
          content: [
            `Booked through mojoaisummits.com.`,
            zoomMeeting?.joinUrl ? `Zoom: ${zoomMeeting.joinUrl}` : "",
            zoomMeeting?.passcode ? `Zoom passcode: ${zoomMeeting.passcode}` : "",
            zoomMeeting?.meetingId ? `Zoom meeting ID: ${zoomMeeting.meetingId}` : "",
            `Guest: ${booking.guestName} <${booking.guestEmail}>`,
            booking.guestTimeZone ? `Guest time zone: ${booking.guestTimeZone}` : "",
            booking.company ? `Company: ${booking.company}` : "",
            booking.notes ? `Notes: ${booking.notes}` : ""
          ].filter(Boolean).join("\n")
        },
        start: { dateTime: start.toISOString(), timeZone: "UTC" },
        end: { dateTime: end.toISOString(), timeZone: "UTC" },
        location: { displayName: zoomMeeting?.joinUrl || meetingType.location || "Zoom" },
        attendees,
        hideAttendees: mirrorInviteEmails.length > 0
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Microsoft Graph event creation failed.");
  }
  return payload;
}

export async function createBooking(env, input = {}) {
  const graph = graphConfig(env);
  const zoom = zoomConfig(env);

  let employee = await getEmployee(env, input.host || input.employee || input.slug);
  if (!employee || employee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const meetingType = employee.meetingTypes.find((type) => type.id === cleanSlug(input.type)) || employee.meetingTypes[0];
  const employeeZoomUserId = zoomUserForEmployee(zoom, employee);
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { response: json({ error: "Choose a valid slot." }, { status: 400 }) };

  const dateValue = localDateKey(start, employee.timezone);
  employee = effectiveEmployeeForDate(employee, dateValue);
  const available = await availability(env, {
    host: employee.slug,
    type: meetingType.id,
    date: dateValue
  });
  if (available.response) return { response: available.response };

  const slot = available.slots.find((candidate) => candidate.start === start.toISOString());
  if (!slot) return { response: json({ error: "That slot is no longer available." }, { status: 409 }) };

  const guestName = cleanText(input.guestName || input.name, 120);
  const guestEmail = cleanEmail(input.guestEmail || input.email);
  if (!guestName) return { response: json({ error: "Enter your name." }, { status: 400 }) };
  if (!isValidEmail(guestEmail)) return { response: json({ error: "Enter a valid email address." }, { status: 400 }) };

  const end = new Date(start.getTime() + meetingType.durationMinutes * 60000);
  if (await hasSharedZoomConflict(env, start, end, employeeZoomUserId)) {
    return { response: json({ error: "That Zoom time is no longer available. Choose another time." }, { status: 409 }) };
  }

  const holdKey = `${HOLD_PREFIX}zoom:${normalizeZoomUserId(employeeZoomUserId)}:${start.toISOString()}`;
  await putStoredJson(env, holdKey, {
    id: crypto.randomUUID(),
    employeeSlug: employee.slug,
    employeeEmail: employee.email,
    zoomUserId: employeeZoomUserId,
    meetingTypeId: meetingType.id,
    start: start.toISOString(),
    end: end.toISOString(),
    status: "held",
    createdAt: new Date().toISOString()
  }, { expirationTtl: HOLD_TTL_SECONDS });

  const booking = {
    id: crypto.randomUUID(),
    employeeSlug: employee.slug,
    employeeEmail: employee.email,
    meetingTypeId: meetingType.id,
    guestName,
    guestEmail,
    company: cleanText(input.company, 160),
    notes: cleanLongText(input.notes, 1200),
    guestTimeZone: cleanText(input.guestTimeZone || input.timezone, 80),
    start: start.toISOString(),
    end: end.toISOString(),
    timezone: employee.timezone,
    status: "confirmed",
    createdAt: new Date().toISOString()
  };

  try {
    const zoomMeeting = zoom.configured
      ? await createZoomMeeting(env, employee, meetingType, booking, start, end)
      : null;
    let event = null;
    if (!graph.configured) {
      await deleteZoomMeeting(env, zoomMeeting?.meetingId);
      return {
        response: json({
          error: "Booking is temporarily unavailable because Microsoft calendar write is not configured."
        }, { status: 503 })
      };
    }
    try {
      event = await createGraphEvent(env, employee, meetingType, booking, start, end, zoomMeeting);
      if (!event?.id) throw new Error("Microsoft Graph event creation did not return an event id.");
    } catch (error) {
      await deleteZoomMeeting(env, zoomMeeting?.meetingId);
      throw error;
    }
    let record = {
      ...booking,
      graphEventId: event?.id || "",
      graphWebLink: event?.webLink || "",
      graphCalendarEventCreated: Boolean(event?.id),
      zoomMeetingId: zoomMeeting?.meetingId || "",
      zoomUserId: zoomMeeting?.zoomUserId || employeeZoomUserId,
      zoomJoinUrl: zoomMeeting?.joinUrl || "",
      zoomPasscode: zoomMeeting?.passcode || "",
      onlineMeetingUrl: zoomMeeting?.joinUrl || "",
      calendarInviteSent: false,
      confirmationEmailSent: false,
      confirmationEmailError: "",
      confirmationEmailProvider: "",
      confirmationEmailGraphError: "",
      confirmationEmailAttemptCount: 0,
      confirmationEmailLastAttemptAt: "",
      hostNotificationRecipients: [],
      mirrorNotificationRecipients: [],
      meetingDetailsPending: !zoomMeeting?.joinUrl
    };

    await putBookingRecord(env, record);
    record = (await deliverBookingConfirmation(env, record, {
      maxAttempts: BOOKING_EMAIL_RETRY_DELAYS_MS.length + 1,
      delays: BOOKING_EMAIL_RETRY_DELAYS_MS
    })).record;

    return {
      ok: true,
      booking: {
        id: record.id,
        employee: publicEmployee(employee),
        meetingType: publicMeetingType(meetingType),
        start: record.start,
        end: record.end,
        timezone: record.timezone,
        guestTimeZone: record.guestTimeZone,
        onlineMeetingUrl: record.onlineMeetingUrl,
        calendarInviteSent: record.calendarInviteSent,
        confirmationEmailSent: record.confirmationEmailSent,
        meetingDetailsPending: record.meetingDetailsPending
      }
    };
  } finally {
    await deleteStoredValue(env, holdKey).catch(() => null);
  }
}

export async function retryFailedBookingConfirmations(env, options = {}) {
  const daysBack = cleanPositiveInteger(options.daysBack, 2, 0, 30);
  const daysAhead = cleanPositiveInteger(options.daysAhead, 120, 1, 366);
  const limit = cleanPositiveInteger(options.limit, 25, 1, 100);
  const today = utcDateFromValue(utcDateKey(new Date()));
  const dateKeys = new Set();

  for (let offset = -daysBack; offset <= daysAhead; offset += 1) {
    dateKeys.add(utcDateKey(addUtcDays(today, offset)));
  }

  const records = [];
  await Promise.all([...dateKeys].map(async (dateKey) => {
    records.push(...(await listStoredJsonByPrefix(env, `${BOOKING_PREFIX}${dateKey}:`)));
  }));

  const candidates = records
    .filter((record) =>
      record &&
      record.status !== "cancelled" &&
      isValidEmail(record.guestEmail) &&
      record.start &&
      (record.confirmationEmailSent !== true || record.calendarInviteSent !== true)
    )
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, limit);

  const results = [];
  for (const record of candidates) {
    const result = await deliverBookingConfirmation(env, record, {
      maxAttempts: BOOKING_EMAIL_RETRY_DELAYS_MS.length + 1,
      delays: BOOKING_EMAIL_RETRY_DELAYS_MS
    });
    results.push({
      id: result.record.id,
      employeeSlug: result.record.employeeSlug,
      guestEmail: result.record.guestEmail,
      start: result.record.start,
      sent: result.sent,
      attempts: result.attempts,
      error: result.sent ? "" : result.error || result.record.confirmationEmailError || ""
    });
  }

  return {
    ok: true,
    scanned: records.length,
    candidates: candidates.length,
    sent: results.filter((result) => result.sent).length,
    failed: results.filter((result) => !result.sent).length,
    results
  };
}

export { requireStore, publicEmployee, graphConfig, getStoredText, putStoredText };

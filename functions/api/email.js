import { json } from "../_access-control.js";
import {
  crmD1Primary,
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";
import { sendResendMail } from "../_mail.js";

const guestRegistrationPrefixes = [
  "crm:guest-registrant:",
  "guest-registration:"
];
const r2GuestRegistrationPrefixes = [
  "crm/registrations/guest/",
  "crm-overflow/registrations/guest/"
];
const campaignPrefix = "crm:email-campaign:";
const maxFieldLength = 4000;
const maxRecipientsPerSend = 250;
const roleOptions = [
  { value: "guest", label: "Guests" },
  { value: "featured-guest", label: "Featured Guests" },
  { value: "featured-author", label: "Featured Authors" },
  { value: "featured-sponsor", label: "Featured Sponsors" }
];

function cleanString(value, max = maxFieldLength) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value) {
  return emailAddressPart(value).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

function emailAddressPart(value) {
  const raw = cleanString(value, 240);
  const angle = raw.match(/<([^<>@\s]+@[^<>\s]+)>/);
  return cleanString(angle ? angle[1] : raw, 240);
}

function displayNamePart(value) {
  const raw = cleanString(value, 240);
  const angle = raw.match(/^(.+?)\s*<[^<>@\s]+@[^<>\s]+>$/);
  return cleanString(angle ? angle[1].replace(/^"|"$/g, "") : "", 120);
}

function splitEmails(value) {
  const raw = Array.isArray(value) ? value.join(",") : cleanString(value, 2000);
  const seen = new Set();
  return raw
    .split(/[,\n;]/)
    .map(cleanEmail)
    .filter(isEmail)
    .filter((email) => {
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}

function safeId(value = "item") {
  return cleanString(value, 240)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "item";
}

function eventTime(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const exactDate = new Date(`${value}T12:00:00`).getTime();
  if (!Number.isNaN(exactDate)) return exactDate;
  const looseDate = new Date(value).getTime();
  return Number.isNaN(looseDate) ? Number.POSITIVE_INFINITY : looseDate;
}

function cleanShowId(value, fallback = "both") {
  const raw = cleanString(value, 80).toLowerCase();
  const normalized = raw.replace(/[\s_]+/g, "-");
  const compact = raw.replace(/[^a-z0-9]/g, "");
  if (!raw) return fallback;
  if (normalized.includes("morning") || compact.includes("10am") || compact.includes("1000am") || compact === "10") return "morning";
  if (normalized.includes("afternoon") || compact.includes("1pm") || compact.includes("100pm") || compact.includes("1300") || compact === "1" || compact === "13") return "afternoon";
  if (["am", "10", "10am", "1000", "1000am"].includes(compact)) return "morning";
  if (["pm", "1", "1pm", "100", "100pm", "1300"].includes(compact)) return "afternoon";
  if (["both", "all", "bothshows"].includes(compact)) return "both";
  return fallback;
}

function showLabel(showId) {
  return {
    morning: "Morning show",
    afternoon: "Afternoon show",
    both: "Both shows"
  }[cleanShowId(showId)] || "Both shows";
}

function showTime(showId) {
  return {
    morning: "10:00 am - 11:30 am CT",
    afternoon: "1:00 pm - 2:30 pm CT",
    both: "10:00 am - 11:30 am CT and 1:00 pm - 2:30 pm CT"
  }[cleanShowId(showId)] || "";
}

function normalizeRole(value) {
  const raw = cleanString(value, 120).toLowerCase().replace(/[_-]+/g, " ");
  if (raw.includes("author")) return "featured-author";
  if (raw.includes("sponsor") || raw.includes("featured partner")) return "featured-sponsor";
  if (raw.includes("featured guest") || raw.includes("featured member")) return "featured-guest";
  return "guest";
}

function recipientRole(record = {}) {
  if (record.isFeaturedAuthor) return "featured-author";
  if (record.isFeaturedSponsor || record.isFeaturedPartner) return "featured-sponsor";
  if (record.isFeaturedGuest || record.isFeaturedMember) return "featured-guest";
  return normalizeRole(
    record.registrationRole ||
      record.guestRegistrationType ||
      record.registrationType ||
      record.role ||
      record.type
  );
}

function actualGuestRegistered(record = {}) {
  const status = cleanString(record.crmStatus || record.guestStatus || record.registrationStatus || record.status, 120)
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  if (["declined", "bad-fit", "no-show", "pending-engagement", "contacted", "invited"].includes(status)) return false;
  if (status === "registered" || status === "attended" || status === "confirmed") return true;
  return Boolean(record.usedAt || record.usedBy || record.usedByEmail || record.registrationId);
}

function normalizeGuestRegistration(key, record = {}) {
  const email = cleanEmail(
    record.email ||
      record.usedByEmail ||
      record.usedBy ||
      record.intendedGuestEmail ||
      record.invitedEmail ||
      record.guestEmail
  );
  const name = cleanString(
    record.name ||
      record.usedByName ||
      record.intendedGuestName ||
      record.invitedName ||
      record.guestName ||
      email,
    240
  );
  const eventName = cleanString(record.eventName || record.usedFor || record.title || record.eventSlug || record.eventId, 240);
  const eventSlug = cleanString(record.eventSlug || record.slug || safeId(eventName), 240);
  const eventDate = cleanString(record.eventDate || record.usedForDate || record.date || record.dateLabel, 120);
  const showId = cleanShowId(
    record.eventShowId ||
      record.showId ||
      record.eventShow ||
      record.usedForShow ||
      record.eventShowLabel ||
      record.usedForTime ||
      record.eventShowTime ||
      record.eventTime,
    "both"
  );
  return {
    key,
    id: cleanString(record.id || key, 300),
    name,
    email,
    company: cleanString(record.company || record.partnerCompany || record.organization, 240),
    title: cleanString(record.title || record.jobTitle || record.roleTitle || record.contactTitle, 240),
    role: recipientRole(record),
    roleLabel: roleOptions.find((role) => role.value === recipientRole(record))?.label || "Guests",
    eventName,
    eventSlug,
    eventDate,
    showId,
    showLabel: showLabel(showId),
    showTime: cleanString(record.eventShowTime || record.eventTime, 120) || showTime(showId),
    registeredAt: cleanString(record.createdAt || record.registeredAt || record.usedAt || record.updatedAt, 120),
    accessLink: cleanString(record.eventAccessLink || record.accessLink || record.joinUrl || record.zoomUrl || record.zoomJoinUrl, 1000),
    registered: actualGuestRegistered(record)
  };
}

async function collectKvD1GuestRegistrations(env) {
  const rows = [];
  for (const prefix of guestRegistrationPrefixes) {
    const keys = await listCrmStorageKeys(env, prefix).catch(() => []);
    for (const key of keys) {
      const record = await readCrmStorageJson(env, key).catch(() => null);
      if (!record) continue;
      rows.push(normalizeGuestRegistration(key, record));
    }
  }
  return rows;
}

async function collectR2GuestRegistrations(env) {
  if (crmD1Primary(env) || !env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get) return [];
  const rows = [];
  for (const prefix of r2GuestRegistrationPrefixes) {
    let cursor;
    do {
      const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
      if (!result) break;
      for (const object of result.objects || []) {
        const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
        const record = stored ? await stored.json().catch(() => null) : null;
        if (record) rows.push(normalizeGuestRegistration(object.key, record));
      }
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }
  return rows;
}

function rowSessionIds(row = {}) {
  const base = row.eventSlug || safeId(row.eventName || row.eventDate || "event");
  if (row.showId === "both") return [`${base}::morning`, `${base}::afternoon`];
  return [`${base}::${row.showId || "both"}`];
}

function sessionFromRow(row = {}, showId = "both") {
  const eventSlug = row.eventSlug || safeId(row.eventName || row.eventDate || "event");
  return {
    id: `${eventSlug}::${showId}`,
    eventSlug,
    eventName: row.eventName || eventSlug,
    eventDate: row.eventDate,
    showId,
    showLabel: showLabel(showId),
    showTime: showTime(showId) || row.showTime,
    sortTime: eventTime(row.eventDate),
    label: [row.eventDate, row.eventName || eventSlug, showLabel(showId)].filter(Boolean).join(" | ")
  };
}

function buildSessions(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (!row.registered || !row.email || !row.eventName) continue;
    for (const sessionId of rowSessionIds(row)) {
      const showId = sessionId.split("::").pop();
      if (!map.has(sessionId)) map.set(sessionId, { ...sessionFromRow(row, showId), count: 0 });
      map.get(sessionId).count += 1;
    }
  }
  return [...map.values()].sort((a, b) => a.sortTime - b.sortTime || a.showId.localeCompare(b.showId) || a.label.localeCompare(b.label));
}

async function registeredGuestRows(env) {
  const byIdentity = new Map();
  const kvRows = await collectKvD1GuestRegistrations(env);
  const r2Rows = await collectR2GuestRegistrations(env);
  for (const row of [...kvRows, ...r2Rows]) {
    if (!row.registered || !isEmail(row.email) || !row.eventName) continue;
    const identity = `${row.email}|${row.eventSlug}|${row.showId}`;
    const previous = byIdentity.get(identity);
    if (!previous || String(row.registeredAt).localeCompare(String(previous.registeredAt)) > 0) {
      byIdentity.set(identity, row);
    }
  }
  return [...byIdentity.values()].sort((a, b) => eventTime(a.eventDate) - eventTime(b.eventDate) || a.name.localeCompare(b.name));
}

function selectRecipients(rows = [], payload = {}) {
  const selectedSessions = new Set((Array.isArray(payload.sessionIds) ? payload.sessionIds : []).map(cleanString).filter(Boolean));
  const selectedRoles = new Set((Array.isArray(payload.roles) ? payload.roles : []).map((role) => cleanString(role, 120)).filter(Boolean));
  const recipients = new Map();

  for (const row of rows) {
    if (!selectedSessions.size || !rowSessionIds(row).some((id) => selectedSessions.has(id))) continue;
    if (selectedRoles.size && !selectedRoles.has(row.role)) continue;
    if (!isEmail(row.email)) continue;
    const existing = recipients.get(row.email);
    const sessions = rowSessionIds(row).filter((id) => selectedSessions.has(id));
    if (existing) {
      existing.sessions.push(...sessions.filter((id) => !existing.sessions.includes(id)));
      continue;
    }
    recipients.set(row.email, {
      name: row.name || row.email,
      email: row.email,
      company: row.company,
      title: row.title,
      role: row.role,
      roleLabel: row.roleLabel,
      sessions,
      eventNames: [row.eventName].filter(Boolean),
      accessLink: row.accessLink
    });
  }

  return [...recipients.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildSenderOptions(rows = [], env = {}) {
  const defaultEmail = cleanEmail(env.MOJO_RESEND_FROM || env.MOJO_INVITE_EMAIL_SENDER);
  const byEmailRole = new Map();
  for (const row of rows) {
    if (!row.registered || !isEmail(row.email) || row.role === "guest") continue;
    const key = `${row.email}|${row.role}`;
    if (byEmailRole.has(key)) continue;
    byEmailRole.set(key, {
      id: key,
      label: [row.name || row.email, row.roleLabel].filter(Boolean).join(" | "),
      name: row.name || row.email,
      email: row.email,
      role: row.role,
      roleLabel: row.roleLabel,
      fromName: row.name || "MOJO AI Summits",
      fromEmail: defaultEmail,
      replyTo: row.email
    });
  }
  return [...byEmailRole.values()].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
}

function defaults(env = {}) {
  const sender = cleanString(env.MOJO_RESEND_FROM || env.MOJO_INVITE_EMAIL_SENDER, 240);
  const fromEmail = cleanEmail(sender);
  return {
    fromName: displayNamePart(sender) || "MOJO AI Summits",
    fromEmail,
    replyTo: fromEmail,
    cc: "",
    bcc: ""
  };
}

function textToHtml(text = "") {
  return cleanString(text, 20000)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split("\n").map((line) => line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")).join("<br>"))
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("\n");
}

function senderAddress(payload = {}, env = {}) {
  const email = cleanEmail(payload.fromEmail) || cleanEmail(env.MOJO_RESEND_FROM || env.MOJO_INVITE_EMAIL_SENDER);
  const name = cleanString(payload.fromName || "MOJO AI Summits", 120);
  if (!isEmail(email)) throw new Error("A valid From email is required.");
  return name ? `${name} <${email}>` : email;
}

function campaignPayload(payload = {}, recipients = [], actor = "") {
  const subject = cleanString(payload.subject, 300);
  const message = cleanString(payload.message, 20000);
  if (!subject) throw new Error("Subject is required.");
  if (!message) throw new Error("Message is required.");
  if (!recipients.length) throw new Error("No registered guests match those selections.");
  if (recipients.length > maxRecipientsPerSend) throw new Error(`Select ${maxRecipientsPerSend} or fewer recipients at a time.`);
  return {
    subject,
    message,
    recipients,
    fromName: cleanString(payload.fromName || "MOJO AI Summits", 120),
    fromEmail: cleanEmail(payload.fromEmail),
    replyTo: splitEmails(payload.replyTo),
    cc: splitEmails(payload.cc),
    bcc: splitEmails(payload.bcc),
    actor
  };
}

async function emailState(env) {
  const rows = await registeredGuestRows(env);
  return {
    ok: true,
    roles: roleOptions,
    sessions: buildSessions(rows),
    senderOptions: buildSenderOptions(rows, env),
    defaults: defaults(env),
    totalRegisteredGuests: new Set(rows.map((row) => row.email)).size
  };
}

async function preview(env, payload = {}) {
  const rows = await registeredGuestRows(env);
  const recipients = selectRecipients(rows, payload);
  return {
    ...await emailState(env),
    recipients,
    recipientCount: recipients.length
  };
}

async function sendCampaign(env, payload = {}, actor = "") {
  const rows = await registeredGuestRows(env);
  const recipients = selectRecipients(rows, payload);
  const campaign = campaignPayload(payload, recipients, actor);
  const sender = senderAddress(campaign, env);
  const replyTo = campaign.replyTo.length ? campaign.replyTo : [campaign.fromEmail].filter(Boolean);
  const html = textToHtml(campaign.message);
  const sent = [];
  const failed = [];

  for (const recipient of recipients) {
    try {
      const result = await sendResendMail(env, {
        sender,
        to: recipient.email,
        replyTo,
        cc: campaign.cc,
        bcc: campaign.bcc,
        subject: campaign.subject,
        text: campaign.message,
        html
      });
      sent.push({ email: recipient.email, name: recipient.name, id: result.id || "" });
    } catch (error) {
      failed.push({ email: recipient.email, name: recipient.name, error: error.message || "Send failed." });
    }
  }

  const campaignId = `${Date.now()}-${crypto.randomUUID()}`;
  await writeCrmStorageJson(env, `${campaignPrefix}${campaignId}`, {
    id: campaignId,
    type: "guest-email-campaign",
    subject: campaign.subject,
    from: sender,
    replyTo,
    cc: campaign.cc,
    bcc: campaign.bcc,
    sessionIds: Array.isArray(payload.sessionIds) ? payload.sessionIds.map(cleanString).filter(Boolean) : [],
    roles: Array.isArray(payload.roles) ? payload.roles.map(cleanString).filter(Boolean) : [],
    recipientCount: recipients.length,
    sentCount: sent.length,
    failedCount: failed.length,
    sent,
    failed,
    createdAt: new Date().toISOString(),
    createdBy: actor
  }).catch(() => null);

  return {
    ...await emailState(env),
    ok: failed.length === 0,
    recipientCount: recipients.length,
    sentCount: sent.length,
    failedCount: failed.length,
    sent,
    failed
  };
}

function requireEmailAccess(data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };
  return {
    response: json({ error: "Sign in with a Mojo AI Summits account approved for email." }, { status: 401 })
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet({ env, data }) {
  const access = requireEmailAccess(data);
  if (access.response) return access.response;
  return json(await emailState(env));
}

export async function onRequestPost({ request, env, data }) {
  const access = requireEmailAccess(data);
  if (access.response) return access.response;
  const payload = await request.json().catch(() => ({}));
  try {
    if (payload.action === "send") return json(await sendCampaign(env, payload, access.email));
    return json(await preview(env, payload));
  } catch (error) {
    const status = /required|valid|No registered guests|Select/.test(error.message || "") ? 400 : 500;
    return json({ error: error.message || "Email request failed." }, { status });
  }
}

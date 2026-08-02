import { sendMicrosoftGraphMail } from "./_mail.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const acceptedPhoneStatuses = new Set(["verified", "pending_sms_setup"]);
const blockedEmailDomains = new Set(["gmail.com", "googlemail.com"]);
const registrationObjectPrefix = "crm/registrations";
const inviteUsageObjectPrefix = "crm/invite-usage";
const guestConfirmationSubject = "Your Mojo AI Summits registration is confirmed";
const guestConfirmationSenderName = "Angel Mosley";
const guestConfirmationSenderEmail = "Angel@mojoaisummits.com";
const guestContactEmail = "guest@mojoaisummits.com";
const memberContactEmail = "member@mojoaisummits.com";
const membershipUrl = "https://mojoaisummits.com/membership";
const briefsUrl = "https://mojoaisummits.com/briefs";
const virtualSeriesUrl = "https://mojoaisummits.com/virtual/";

const registrationConfig = {
  member: {
    label: "member",
    crmType: "member-registrant",
    source: "member-registration",
    legacyPrefix: "member-registration:",
    crmPrefix: "crm:member-registrant:",
    strictEnv: "MOJO_MEMBER_INVITE_CODES_STRICT"
  },
  guest: {
    label: "guest",
    crmType: "guest-registrant",
    source: "guest-registration",
    legacyPrefix: "guest-registration:",
    crmPrefix: "crm:guest-registrant:",
    strictEnv: "MOJO_GUEST_INVITE_CODES_STRICT"
  },
  partner: {
    label: "partner",
    crmType: "partner-registrant",
    source: "partner-registration",
    legacyPrefix: "partner-registration:",
    crmPrefix: "crm:partner-registrant:",
    strictEnv: "MOJO_PARTNER_INVITE_CODES_STRICT",
    strict: true
  }
};

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function cleanString(value) {
  return typeof value === "string"
    ? value.trim().slice(0, maxFieldLength)
    : "";
}

function escapeHtml(value) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanBoolean(value) {
  return value === true || value === "true";
}

function cleanGuestRegistrationType(value) {
  return {
    "featured-guest": "featured-guest",
    presenter: "presenter",
    roundtable: "roundtable-leader",
    "roundtable-leader": "roundtable-leader",
    guest: "guest"
  }[cleanString(value).toLowerCase()] || "guest";
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function registrationRoleLabel(type) {
  const labels = {
    member: "Member",
    guest: "Guest",
    partner: "Partner"
  };
  return labels[type] || cleanString(type) || "Registrant";
}

function registrationRoles(type, registration = {}) {
  const guestRegistrationType = cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole);
  const roles = [];
  if (type === "guest") {
    if (cleanBoolean(registration.isPresenter) || guestRegistrationType === "presenter") roles.push("Presenter");
    if (cleanBoolean(registration.isRoundtableLeader) || guestRegistrationType === "roundtable-leader") roles.push("Round Table Leader");
    if (cleanBoolean(registration.isFeaturedGuest) || guestRegistrationType === "featured-guest") roles.push("Featured Guest");
    if (!roles.length) roles.push("Guest");
  } else {
    roles.push(registrationRoleLabel(type));
  }
  if (cleanBoolean(registration.isFeaturedMember)) roles.push("Featured Member");
  return [...new Set(roles.filter(Boolean))];
}

function eventIdentity(registration = {}) {
  return cleanString(
    registration.eventId ||
      registration.eventSlug ||
      registration.eventName ||
      registration.inviteCode ||
      registration.id ||
      registration.createdAt
  );
}

function contactEventEntry(type, registration = {}, previous = {}, now = "") {
  const roles = registrationRoles(type, registration);
  const eventId = eventIdentity(registration);
  return {
    ...previous,
    id: eventId,
    eventId,
    eventSlug: cleanString(registration.eventSlug),
    eventName: cleanString(registration.eventName) || eventId || "Registration",
    eventDate: cleanString(registration.eventDate),
    inviteCode: cleanString(registration.inviteCode),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.guestRegistrationType),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(type),
    role: roles.join(", "),
    roles,
    registeredAt: cleanString(registration.createdAt) || now,
    attended: typeof previous.attended === "boolean" ? previous.attended : cleanBoolean(registration.attended),
    attendanceStatus: cleanString(previous.attendanceStatus || registration.attendanceStatus) || "not_recorded",
    attendedAt: cleanString(previous.attendedAt || registration.attendedAt),
    attendanceNotes: cleanString(previous.attendanceNotes),
    updatedAt: now
  };
}

function contactEventKey(event = {}) {
  return cleanString(event.registrationId || event.eventId || event.eventSlug || event.eventName || event.inviteCode || event.registeredAt)
    .toLowerCase();
}

function mergeContactEvents(existingEvents, type, registration, now) {
  const map = new Map();
  for (const event of Array.isArray(existingEvents) ? existingEvents : []) {
    const key = contactEventKey(event);
    if (key) map.set(key, event);
  }

  const next = contactEventEntry(type, registration, {}, now);
  const key = contactEventKey(next);
  const previous = key ? map.get(key) || {} : {};
  if (key) map.set(key, contactEventEntry(type, registration, previous, now));

  return [...map.values()].sort((a, b) => {
    const left = cleanString(b.eventDate || b.registeredAt || b.updatedAt);
    const right = cleanString(a.eventDate || a.registeredAt || a.updatedAt);
    return left.localeCompare(right);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBlockedEmail(email) {
  const domain = email.toLowerCase().split("@").pop();
  return blockedEmailDomains.has(domain);
}

function cleanPayload(payload, type = "") {
  return {
    inviteCode: cleanString(payload?.inviteCode),
    name: cleanString(payload?.name),
    company: cleanString(payload?.company),
    title: cleanString(payload?.title),
    industry: cleanString(payload?.industry),
    email: cleanString(payload?.email).toLowerCase(),
    phone: cleanString(payload?.phone),
    phoneVerificationStatus: cleanString(payload?.phoneVerificationStatus),
    publicationUseName: cleanBoolean(payload?.publicationUseName),
    publicationUseCompany: cleanBoolean(payload?.publicationUseCompany)
  };
}

async function writeRegistrationDebug(env, type, status, details = {}) {
  if (env?.MOJO_REGISTRATION_DEBUG_WRITES !== "true") return;
  if (!env?.MOJO_SUMMITS_SETUP_STATE) return;
  const createdAt = cleanString(details.createdAt) || new Date().toISOString();
  const id = cleanString(details.id) || crypto.randomUUID();
  const entry = {
    id,
    createdAt,
    type: cleanString(type),
    status: cleanString(status),
    stage: cleanString(details.stage),
    name: cleanString(details.name),
    email: cleanString(details.email).toLowerCase(),
    company: cleanString(details.company),
    inviteCode: cleanString(details.inviteCode),
    eventName: cleanString(details.eventName),
    eventDate: cleanString(details.eventDate),
    contactKey: cleanString(details.contactKey),
    registrationKeys: Array.isArray(details.registrationKeys)
      ? details.registrationKeys.map(cleanString).filter(Boolean)
      : [],
    confirmationEmail: details.confirmationEmail && typeof details.confirmationEmail === "object"
      ? {
          attempted: details.confirmationEmail.attempted === true,
          sent: details.confirmationEmail.sent === true,
          error: cleanString(details.confirmationEmail.error)
        }
      : undefined,
    error: cleanString(details.error)
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(
    `crm:registration-debug:${createdAt}:${id}`,
    JSON.stringify(entry)
  ).catch(() => null);
}

function inviteMeta(inviteRecord) {
  const record = inviteRecord?.record || {};
  return {
    eventId: cleanString(record.eventId || record.eventSlug || record.eventName),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    eventTime: cleanString(record.eventTime),
    eventStart: cleanString(record.eventStart || record.eventStartDateTime),
    eventEnd: cleanString(record.eventEnd || record.eventEndDateTime),
    eventAccessLink: cleanString(record.eventAccessLink || record.accessLink || record.joinUrl || record.zoomUrl),
    intendedGuestName: cleanString(record.intendedGuestName || record.invitedName || record.guestName),
    invitedName: cleanString(record.invitedName || record.intendedGuestName || record.guestName),
    guestName: cleanString(record.guestName || record.intendedGuestName || record.invitedName),
    guestRegistrationType: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole),
    registrationRole: cleanGuestRegistrationType(record.registrationRole || record.guestRegistrationType),
    isPresenter: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "presenter",
    isRoundtableLeader: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "roundtable-leader",
    isFeaturedGuest: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "featured-guest",
    partnerCompany: cleanString(record.partnerCompany),
    partnerContactEmail: cleanString(record.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(record.partnerTier)
  };
}

function absoluteMojoUrl(path = "") {
  const value = cleanString(path);
  if (/^https?:\/\//i.test(value)) return value;
  if (!value) return virtualSeriesUrl;
  return `https://mojoaisummits.com/${value.replace(/^\/+/, "")}`;
}

function eventPageUrl(registration = {}) {
  const slug = cleanString(registration.eventSlug);
  if (slug) return absoluteMojoUrl(`/virtual/${slug}.php`);
  return virtualSeriesUrl;
}

function eventDetails(registration = {}) {
  const name = cleanString(registration.eventName) || "Mojo AI Summits event";
  const date = cleanString(registration.eventDate) || "To be announced";
  const time = cleanString(registration.eventTime) || "To be announced";
  const access = cleanString(registration.eventAccessLink);
  return {
    name,
    date,
    time,
    pageUrl: eventPageUrl(registration),
    accessText: access ? absoluteMojoUrl(access) : "Event access details will be sent before the session."
  };
}

function formatIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("");
}

function addUtcDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDate(value) {
  const timestamp = Date.parse(cleanString(value));
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function icsEscape(value) {
  return cleanString(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function base64Encode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildGuestCalendarInvite(registration = {}) {
  const details = eventDetails(registration);
  const start = parseDate(registration.eventStart);
  const end = parseDate(registration.eventEnd);
  const dateOnly = parseDate(registration.eventDate);
  if (!start && !dateOnly) return "";
  const uid = `${cleanString(registration.id) || crypto.randomUUID()}@mojoaisummits.com`;
  const timedLines = start
    ? [
        `DTSTART:${formatIcsDateTime(start)}`,
        `DTEND:${formatIcsDateTime(end && end > start ? end : new Date(start.getTime() + 60 * 60 * 1000))}`
      ]
    : dateOnly
      ? [
          `DTSTART;VALUE=DATE:${formatIcsDate(dateOnly)}`,
          `DTEND;VALUE=DATE:${formatIcsDate(addUtcDays(dateOnly, 1))}`
        ]
      : [];

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mojo AI Summits//Guest Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
    ...timedLines,
    `SUMMARY:${icsEscape(`Mojo AI Summits: ${details.name}`)}`,
    "LOCATION:Virtual event",
    `DESCRIPTION:${icsEscape(`Registration confirmed for ${details.name}. Event page: ${details.pageUrl}. ${details.accessText}`)}`,
    `URL:${icsEscape(details.pageUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function guestConfirmationText(registration = {}) {
  const details = eventDetails(registration);
  const name = cleanString(registration.name) || "there";
  return [
    `Hi ${name},`,
    "",
    `Your registration for ${details.name} is confirmed.`,
    "",
    "Event details",
    `Event: ${details.name}`,
    `Date: ${details.date}`,
    `Time: ${details.time}`,
    `Event page: ${details.pageUrl}`,
    `Access: ${details.accessText}`,
    "",
    "We are looking forward to having you join the conversation. A calendar invite is attached to this email.",
    "",
    `Mojo AI Summits: ${membershipUrl}`,
    "Information about membership in the Mojo AI Summits Executive Research Council, including opportunities for paid engagements.",
    "",
    `Mojo AI Summits: ${briefsUrl}`,
    "Sample & previous briefs we have written with groups like the one you will be joining.",
    "",
    `Questions? Contact ${guestContactEmail}. Existing members may contact ${memberContactEmail}.`,
    "",
    guestConfirmationSenderName,
    "Director of Engagement",
    guestConfirmationSenderEmail,
    "214-232-8324"
  ].join("\n");
}

function guestConfirmationHtml(registration = {}) {
  const details = eventDetails(registration);
  const name = cleanString(registration.name) || "there";
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.55;max-width:680px">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your registration for <strong>${escapeHtml(details.name)}</strong> is confirmed.</p>
      <h2 style="font-size:18px;margin:24px 0 10px">Event details</h2>
      <table style="border-collapse:collapse;width:100%;margin:0 0 20px">
        <tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb;width:110px">Event</th><td style="padding:8px 10px;border:1px solid #d8dee9">${escapeHtml(details.name)}</td></tr>
        <tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb">Date</th><td style="padding:8px 10px;border:1px solid #d8dee9">${escapeHtml(details.date)}</td></tr>
        <tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb">Time</th><td style="padding:8px 10px;border:1px solid #d8dee9">${escapeHtml(details.time)}</td></tr>
        <tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb">Event page</th><td style="padding:8px 10px;border:1px solid #d8dee9"><a href="${escapeHtml(details.pageUrl)}">${escapeHtml(details.pageUrl)}</a></td></tr>
        <tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb">Access</th><td style="padding:8px 10px;border:1px solid #d8dee9">${/^https?:\/\//i.test(details.accessText) ? `<a href="${escapeHtml(details.accessText)}">${escapeHtml(details.accessText)}</a>` : escapeHtml(details.accessText)}</td></tr>
      </table>
      <p>We are looking forward to having you join the conversation. A calendar invite is attached to this email.</p>
      <p><strong>Mojo AI Summits:</strong> <a href="${membershipUrl}">${membershipUrl}</a><br>Information about membership in the Mojo AI Summits Executive Research Council, including opportunities for paid engagements.</p>
      <p><strong>Mojo AI Summits:</strong> <a href="${briefsUrl}">${briefsUrl}</a><br>Sample &amp; previous briefs we have written with groups like the one you will be joining.</p>
      <p>Questions? Contact <a href="mailto:${guestContactEmail}">${guestContactEmail}</a>. Existing members may contact <a href="mailto:${memberContactEmail}">${memberContactEmail}</a>.</p>
      <p style="margin-top:24px">${guestConfirmationSenderName}<br>Director of Engagement<br><a href="mailto:${guestConfirmationSenderEmail}">${guestConfirmationSenderEmail}</a><br>214-232-8324</p>
    </div>
  `;
}

async function sendGuestRegistrationConfirmation(env, registration = {}) {
  if (!cleanString(registration.email)) return { attempted: false, sent: false, error: "Registrant email is missing." };
  const calendarInvite = buildGuestCalendarInvite(registration);

  await sendMicrosoftGraphMail(env, {
    sender: cleanString(env.MOJO_GUEST_REGISTRATION_EMAIL_SENDER || env.MOJO_INVITE_EMAIL_SENDER || guestConfirmationSenderEmail),
    to: [{ address: registration.email, name: registration.name }],
    replyTo: [
      { address: guestContactEmail, name: "Mojo AI Summits Guest Team" },
      { address: guestConfirmationSenderEmail, name: guestConfirmationSenderName }
    ],
    subject: guestConfirmationSubject,
    text: guestConfirmationText(registration),
    html: guestConfirmationHtml(registration),
    attachments: calendarInvite ? [{
      name: "mojo-ai-summits-event.ics",
      contentType: "text/calendar; method=PUBLISH; charset=utf-8",
      contentBytes: base64Encode(calendarInvite)
    }] : [],
    saveToSentItems: true
  });

  return { attempted: true, sent: true };
}

function validateRegistration(registration, type = "") {
  if (!/^\d{6}$/.test(registration.inviteCode)) return "Enter a valid six-digit invite code.";
  if (!registration.name) return "Name is required.";
  if (!registration.company) return "Company is required.";
  if (!registration.title) return "Title is required.";
  if (!registration.industry) return "Industry is required.";
  if (!registration.email) return "Company email is required.";
  if (!isValidEmail(registration.email)) return "Enter a valid email address.";
  if (isBlockedEmail(registration.email)) return "Gmail and Googlemail addresses are not accepted.";
  if (!registration.phone) return "Phone number is required.";
  if (!acceptedPhoneStatuses.has(registration.phoneVerificationStatus)) {
    return "Phone verification status is required.";
  }
  return "";
}

function normalizeRegistrationForType(type, registration) {
  if (
    type === "guest" &&
    (!registration.phoneVerificationStatus ||
      registration.phoneVerificationStatus === "unverified" ||
      registration.phoneVerificationStatus === "code_sent")
  ) {
    return {
      ...registration,
      phoneVerificationStatus: "pending_sms_setup"
    };
  }
  return registration;
}

function codeKeys(type, code) {
  return [
    `${type}-invite-code:${code}`,
    `crm:${type}-invite-code:${code}`,
    `${type}-invite:${code}`
  ];
}

async function readInviteCode(env, type, code) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) return null;

  for (const key of codeKeys(type, code)) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (record) return { key, record };
  }

  return null;
}

function safeObjectPart(value) {
  return cleanString(value).replace(/[^0-9A-Za-z.-]+/g, "-");
}

function registrationObjectKey(type, createdAt, id) {
  return `${registrationObjectPrefix}/${type}/${safeObjectPart(createdAt)}-${safeObjectPart(id)}.json`;
}

function inviteUsageObjectKey(type, code) {
  return `${inviteUsageObjectPrefix}/${type}/${cleanString(code).replace(/\D/g, "").slice(0, 6)}.json`;
}

async function readInviteUsage(env, type, code) {
  if (!env.MOJO_SUMMITS_STORAGE?.get) return null;
  const object = await env.MOJO_SUMMITS_STORAGE.get(inviteUsageObjectKey(type, code)).catch(() => null);
  return object ? object.json().catch(() => null) : null;
}

function inviteCodeError(config, inviteRecord) {
  if (!inviteRecord) return "";
  const record = inviteRecord.record || {};
  const status = cleanString(record.status).toLowerCase();
  const expiresAt = cleanString(record.expiresAt);

  if (["used", "revoked", "expired", "disabled"].includes(status)) {
    return "That invite code is invalid or has already been used.";
  }
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return "That invite code has expired.";
  }
  if (record.type && cleanString(record.type).toLowerCase() !== config.label) {
    return "That invite code is not valid for this registration page.";
  }

  return "";
}

export async function validateInviteCode(env, type, code) {
  const config = registrationConfig[type];
  const inviteCode = cleanString(code).replace(/\D/g, "").slice(0, 6);
  if (!config || !/^\d{6}$/.test(inviteCode)) {
    return { ok: false, status: 400, error: "Enter a valid six-digit invite code." };
  }

  const inviteRecord = await readInviteCode(env, type, inviteCode);
  const error = inviteCodeError(config, inviteRecord);
  if (error) return { ok: false, status: 409, error };

  const strict = config.strict === true || env[config.strictEnv] === "true";
  if (strict && !inviteRecord) {
    return { ok: false, status: 404, error: "That invite code is invalid or has already been used." };
  }

  const inviteUsage = await readInviteUsage(env, type, inviteCode);
  if (inviteUsage) {
    return { ok: false, status: 409, error: "That invite code is invalid or has already been used." };
  }

  return {
    ok: true,
    code: inviteCode,
    mode: inviteRecord ? "stored" : "format-only",
    invite: inviteMeta(inviteRecord)
  };
}

async function markInviteCodeUsed(env, type, code, registration) {
  const inviteRecord = await readInviteCode(env, type, code);
  if (!inviteRecord) return;

  await env.MOJO_SUMMITS_SETUP_STATE.put(
    inviteRecord.key,
    JSON.stringify({
      ...inviteRecord.record,
      type,
      code,
      status: "used",
      usedAt: registration.createdAt,
      usedBy: registration.name || registration.email,
      usedByName: registration.name,
      usedByEmail: registration.email,
      registrationId: registration.id
    })
  );
}

async function markInviteCodeUsedInR2(env, type, code, registration) {
  if (!env.MOJO_SUMMITS_STORAGE?.put) return null;
  const key = inviteUsageObjectKey(type, code);
  await env.MOJO_SUMMITS_STORAGE.put(
    key,
    JSON.stringify({
      type,
      code,
      status: "used",
      usedAt: registration.createdAt,
      usedBy: registration.name || registration.email,
      usedByName: registration.name,
      usedByEmail: registration.email,
      registrationId: registration.id,
      eventName: registration.eventName,
      eventDate: registration.eventDate
    }),
    {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { area: "crm", kind: "invite-usage", type }
    }
  );
  return key;
}

function contactRefsForRegistration(type, registration) {
  const email = cleanString(registration.email).toLowerCase();
  const company = cleanString(registration.partnerCompany || registration.company);
  const companySlug = slugify(company);
  if (!email || !company || !companySlug) return {};

  const companyKey = `crm:company:${companySlug}`;
  const partnerCompanyKey = `partner-company:${companySlug}`;
  return {
    contactId: email,
    contactKey: `crm:contact:${email}`,
    companyKey,
    profileKey: type === "partner" ? partnerCompanyKey : companyKey
  };
}

async function writeR2Registration(env, type, record, options = {}) {
  if (!env?.MOJO_SUMMITS_STORAGE || !record?.id) return null;
  const createdAt = cleanString(record.createdAt) || new Date().toISOString();
  const key = options.key || registrationObjectKey(type, createdAt, record.id);
  const overflow = options.overflow === true;
  await env.MOJO_SUMMITS_STORAGE.put(
    key,
    JSON.stringify({
      ...record,
      storage: overflow ? "r2-overflow" : "r2",
      overflowStorage: overflow,
      overflowReason: cleanString(options.overflowReason),
      overflowError: cleanString(options.overflowError),
      r2StoredAt: new Date().toISOString()
    }),
    {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { area: "crm", kind: overflow ? "registration-overflow" : "registration", type }
    }
  );
  return key;
}

async function mirrorRegistrationToKv(env, type, record, config) {
  if (env?.MOJO_REGISTRATION_KV_MIRROR !== "true") return {};

  const contactRefs = await upsertRegistrationContact(env, type, record, config);
  const storedRecord = {
    ...record,
    ...contactRefs
  };
  const registrationKey = `${config.crmPrefix}${record.createdAt}:${record.id}`;

  await env.MOJO_SUMMITS_SETUP_STATE.put(registrationKey, JSON.stringify(storedRecord));
  await markInviteCodeUsed(env, type, record.inviteCode, storedRecord);
  return {
    ...contactRefs,
    kvRegistrationKey: registrationKey
  };
}

export async function upsertRegistrationContact(env, type, registration, config = {}) {
  const email = cleanString(registration.email).toLowerCase();
  const company = cleanString(registration.partnerCompany || registration.company);
  const companySlug = slugify(company);
  if (!email || !company || !companySlug) return {};

  const now = registration.createdAt || new Date().toISOString();
  const companyKey = `crm:company:${companySlug}`;
  const partnerCompanyKey = `partner-company:${companySlug}`;
  const updatedBy = cleanString(config.updatedBy) || "registration";
  const contact = {
    id: email,
    email,
    name: cleanString(registration.name) || email,
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.guestRegistrationType),
    company,
    companySlug,
    companyKey,
    profileKey: type === "partner" ? partnerCompanyKey : companyKey,
    title: cleanString(registration.title),
    phone: cleanString(registration.phone),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(config.label || type),
    source: cleanString(config.source || registration.source || `${type}-registration`),
    updatedAt: now,
    updatedBy
  };
  const contactKeys = [`crm:contact:${email}`];
  const writeCompanyRollups = config.writeCompanyRollups === true || type === "partner";
  const companyKeys = writeCompanyRollups
    ? type === "partner" ? [partnerCompanyKey] : [companyKey]
    : [];

  for (const key of [...new Set(contactKeys)]) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
      ...(existing || {}),
      ...contact,
      id: email,
      name: contact.name || cleanString(existing?.name) || email,
      source: cleanString(existing?.source) || contact.source,
      createdAt: cleanString(existing?.createdAt) || now,
      events: mergeContactEvents(existing?.events, type, registration, now)
    }));
  }

  for (const key of [...new Set(companyKeys)]) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    const contacts = Array.isArray(existing?.contacts) ? existing.contacts : [];
    const contactMap = new Map(contacts.map((entry) => [
      cleanString(entry?.email).toLowerCase() || cleanString(entry?.name),
      entry
    ]));
    const previous = contactMap.get(email) || {};
    contactMap.set(email, {
      ...previous,
      ...contact,
      source: cleanString(previous.source) || contact.source
    });

    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
      ...(existing || {}),
      organizationName: cleanString(existing?.organizationName || existing?.company || company),
      company,
      companySlug,
      contacts: [...contactMap.values()],
      updatedAt: now,
      updatedBy
    }));
  }

  return {
    contactId: email,
    contactKey: `crm:contact:${email}`,
    companyKey: `crm:company:${companySlug}`,
    profileKey: type === "partner" ? partnerCompanyKey : `crm:company:${companySlug}`
  };
}

export async function handleInviteCodeValidation({ params, env }, type) {
  const result = await validateInviteCode(env, type, params?.code);
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  return json({
    ok: true,
    code: result.code,
    mode: result.mode,
    invite: result.invite
  });
}

export async function handlePublicRegistration({ request, env }, type) {
  const config = registrationConfig[type];
  if (!config) return json({ error: "Registration type is not configured." }, { status: 500 });
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Registration invite storage is not configured." }, { status: 500 });
  }
  if (!env.MOJO_SUMMITS_STORAGE) {
    return json({ error: "Registration R2 storage is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const registration = normalizeRegistrationForType(type, cleanPayload(payload, type));
  const debugBase = {
    stage: "received",
    name: registration.name,
    email: registration.email,
    company: registration.company,
    inviteCode: registration.inviteCode
  };

  try {
    const validationError = validateRegistration(registration, type);
    if (validationError) {
      await writeRegistrationDebug(env, type, "rejected", {
        ...debugBase,
        stage: "validation",
        error: validationError
      });
      return json({ error: validationError }, { status: 400 });
    }

    const inviteValidation = await validateInviteCode(env, type, registration.inviteCode);
    if (!inviteValidation.ok) {
      await writeRegistrationDebug(env, type, "rejected", {
        ...debugBase,
        stage: "invite-validation",
        error: inviteValidation.error
      });
      return json({ error: inviteValidation.error }, { status: inviteValidation.status });
    }

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const record = {
      ...registration,
      ...(inviteValidation.invite || {}),
      id,
      createdAt,
      source: config.source,
      crmType: config.crmType,
      crmStatus: "new",
      crmNotes: "",
      crmUpdatedAt: "",
      crmUpdatedBy: ""
    };
    const contactRefs = contactRefsForRegistration(type, record);
    const storedRecord = {
      ...record,
      ...contactRefs
    };
    const registrationKey = await writeR2Registration(env, type, storedRecord);
    const inviteUsageKey = await markInviteCodeUsedInR2(env, type, registration.inviteCode, storedRecord);
    const kvRefs = await mirrorRegistrationToKv(env, type, storedRecord, config).catch(() => ({}));
    const registrationKeys = [registrationKey, kvRefs.kvRegistrationKey].filter(Boolean);
    const confirmationEmail = type === "guest"
      ? await sendGuestRegistrationConfirmation(env, storedRecord).catch((error) => ({
          attempted: true,
          sent: false,
          error: cleanString(error?.message || "Guest confirmation email failed.")
        }))
      : { attempted: false, sent: false };
    await writeRegistrationDebug(env, type, "stored", {
      ...debugBase,
      ...storedRecord,
      stage: "complete",
      registrationKeys,
      inviteUsageKey,
      confirmationEmail
    });

    return json({
      ok: true,
      id,
      createdAt,
      storage: "r2",
      confirmationEmail
    }, { status: 201 });
  } catch (error) {
    await writeRegistrationDebug(env, type, "failed", {
      ...debugBase,
      stage: "exception",
      error: error.message || "Registration could not be stored."
    });
    return json({ error: error.message || "Registration could not be stored." }, { status: 500 });
  }
}

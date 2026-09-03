import {
  crmD1Primary,
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const verifiedPhonePrefix = "sms:verified-phone:";
const verifiedPhoneObjectPrefix = "sms/verified-phones/";
const phoneDebugPrefix = "crm:phone-verification-debug:";
const registrationPrefixes = [
  "crm:guest-registrant:",
  "crm:member-registrant:",
  "crm:partner-registrant:",
  "guest-registration:",
  "member-registration:",
  "partner-registration:"
];
const r2RegistrationPrefixes = [
  "crm/registrations/guest/",
  "crm/registrations/member/",
  "crm/registrations/partner/",
  "crm-overflow/registrations/guest/",
  "crm-overflow/registrations/member/",
  "crm-overflow/registrations/partner/"
];
const registrationIndexCacheKey = "sms/cache/notification-registration-index.json";
const registrationIndexCacheTtlMs = 5 * 60 * 1000;
const registrationIndexCacheMaxStaleMs = 24 * 60 * 60 * 1000;
const additionalNoticeKey = "sms:notifications:last-additional-event-notice";
const additionalNoticeCooldownMs = 30 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const staffSmsRecipients = [
  { name: "Scott", phone: "+17192446690" },
  { name: "Angel", phone: "+12142328324" },
  { name: "Miller", phone: "+19728049401" }
];
const replyTestRecipients = staffSmsRecipients.map((recipient) => ({
  ...recipient,
  role: "SMS reply test"
}));
const eventReminderStaffRecipients = staffSmsRecipients.map((recipient) => ({
  ...recipient,
  role: "Staff event reminder copy"
}));

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function cleanString(value, max = maxFieldLength) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEnvString(value) {
  return typeof value === "string" ? value.trim().slice(0, 4096) : "";
}

function cleanPhone(value) {
  const normalized = cleanString(value, 80).replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "";
  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 4) return `+${digits.slice(2)}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return normalized;
}

function isLikelyPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(cleanString(phone, 80));
}

function maskPhone(phone) {
  const digits = cleanString(phone, 80).replace(/\D/g, "");
  if (!digits) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function cleanRole(value) {
  const normalized = cleanString(value, 120).toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("featured guest")) return "Featured Guest";
  if (normalized.includes("presenter")) return "Presenter";
  if (normalized.includes("round")) return "Round Table Leader";
  if (normalized.includes("partner")) return "Partner Guest";
  if (normalized.includes("member")) return "Member";
  return "Guest";
}

function registrationRole(record = {}, type = "") {
  if (record.isFeaturedGuest) return "Featured Guest";
  if (record.isPresenter) return "Presenter";
  if (record.isRoundtableLeader) return "Round Table Leader";
  return cleanRole(record.registrationRole || record.guestRegistrationType || type);
}

function isPlaceholderEventValue(value) {
  const normalized = cleanString(value, 240).toLowerCase();
  return !normalized || normalized === "unassigned event" || normalized === "unassigned-event";
}

function realEventValue(record = {}) {
  const eventName = cleanString(record.eventName, 240);
  if (!isPlaceholderEventValue(eventName)) return eventName;
  const eventSlug = cleanString(record.eventSlug, 240);
  if (!isPlaceholderEventValue(eventSlug)) return eventSlug;
  const eventId = cleanString(record.eventId, 240);
  return cleanString(record.eventDate, 120) && !isPlaceholderEventValue(eventId) ? eventId : "";
}

function hasRealEvent(record = {}) {
  return Boolean(realEventValue(record));
}

function normalizeEventKey(record = {}) {
  const raw = realEventValue(record);
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unassigned-event";
}

function eventLabel(record = {}) {
  const eventName = cleanString(record.eventName, 240);
  if (!isPlaceholderEventValue(eventName)) return eventName;
  const eventSlug = cleanString(record.eventSlug, 240);
  if (!isPlaceholderEventValue(eventSlug)) return eventSlug;
  const eventId = cleanString(record.eventId, 240);
  return cleanString(record.eventDate, 120) && !isPlaceholderEventValue(eventId) ? eventId : "";
}

function requireSmsAccess(data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };
  return {
    response: json({ error: "Sign in with a Mojo AI Summits account to send SMS notifications." }, { status: 401 })
  };
}

function awsConfig(env) {
  return {
    region: cleanEnvString(env.AWS_REGION || env.AWS_SNS_REGION || "us-east-2"),
    accessKeyId: cleanEnvString(env.AWS_ACCESS_KEY_ID || env.AWS_Client_Access_key || env.AWS_CLIENT_ACCESS_KEY),
    secretAccessKey: cleanEnvString(env.AWS_SECRET_ACCESS_KEY || env.AWS_Client_Secret_Access_key || env.AWS_CLIENT_SECRET_ACCESS_KEY),
    sessionToken: cleanEnvString(env.AWS_SESSION_TOKEN),
    originationNumber: cleanString(env.AWS_SNS_SMS_ORIGINATION_NUMBER || env.AWS_MM_SMS_ORIGINATION_NUMBER, 80)
  };
}

function missingConfig(config, env) {
  const missing = [];
  if (!env.MOJO_SUMMITS_SETUP_STATE) missing.push("MOJO_SUMMITS_SETUP_STATE");
  if (!config.region) missing.push("AWS_REGION");
  if (!config.accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!config.originationNumber) missing.push("AWS_SNS_SMS_ORIGINATION_NUMBER");
  return missing;
}

function toHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function hmacBytes(key, value) {
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
}

async function hmacHex(key, value) {
  return toHex(await hmacBytes(key, value));
}

async function awsSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = await hmacBytes(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  return hmacBytes(kService, "aws4_request");
}

function utcStamp(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function parseAwsErrorMessage(text) {
  try {
    const data = JSON.parse(text);
    return data.message || data.Message || data.__type || "";
  } catch {
    return "";
  }
}

async function signedAwsJsonPost(config, service, target, payload) {
  const host = `${service}.${config.region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const { amzDate, dateStamp } = utcStamp();
  const body = JSON.stringify(payload);
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": target
  };
  if (config.sessionToken) headers["x-amz-security-token"] = config.sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = signedHeaderNames.join(";");
  const payloadHash = await sha256Hex(body);
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await awsSigningKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, authorization },
    body
  });
  const text = await response.text();
  if (!response.ok) throw new Error(parseAwsErrorMessage(text) || "AWS rejected the SMS request.");
  return JSON.parse(text);
}

async function sendSms(config, phone, message) {
  const result = await signedAwsJsonPost(config, "sms-voice", "PinpointSMSVoiceV2.SendTextMessage", {
    DestinationPhoneNumber: phone,
    OriginationIdentity: config.originationNumber,
    MessageBody: message,
    MessageType: "TRANSACTIONAL",
    TimeToLive: 600
  });
  return result.MessageId || "";
}

function noteLookupWarning(warnings, source, prefix, error) {
  if (!warnings) return;
  warnings.push({
    source,
    prefix,
    message: cleanString(error?.message || error, 240)
  });
}

async function listKeys(env, prefix, warnings) {
  return listCrmStorageKeys(env, prefix).catch((error) => {
    noteLookupWarning(warnings, "storage", prefix, error);
    console.warn(JSON.stringify({
      event: "sms_notification_storage_list_failed",
      prefix,
      error: cleanString(error?.message || error, 240)
    }));
    return [];
  });
}

function addRecipient(map, phone, details = {}) {
  const normalized = cleanPhone(phone);
  if (!isLikelyPhone(normalized)) return;
  const key = normalized.replace(/\D/g, "");
  const previous = map.get(key) || {};
  map.set(key, {
    phone: normalized,
    maskedPhone: maskPhone(normalized),
    sources: [...new Set([...(previous.sources || []), cleanString(details.source, 120)].filter(Boolean))],
    firstVerifiedAt: cleanString(previous.firstVerifiedAt || details.firstVerifiedAt),
    lastVerifiedAt: cleanString(details.lastVerifiedAt || previous.lastVerifiedAt),
    inviteCode: cleanString(previous.inviteCode || details.inviteCode, 80),
    name: cleanString(previous.name || details.name, 180),
    email: cleanString(previous.email || details.email, 180).toLowerCase(),
    company: cleanString(previous.company || details.company, 180),
    role: cleanString(previous.role || details.role, 120),
    eventKey: cleanString(previous.eventKey || details.eventKey, 240),
    eventName: cleanString(previous.eventName || details.eventName, 240),
    registeredAt: cleanString(previous.registeredAt || details.registeredAt, 120)
  });
}

function normalizeRegistration(key, record = {}, source = "") {
  const type = cleanString(source).includes("partner")
    ? "partner"
    : cleanString(source).includes("member")
      ? "member"
      : "guest";
  const eventKey = normalizeEventKey(record);
  return {
    key,
    id: cleanString(record.id || key, 240),
    type,
    source,
    name: cleanString(record.name || record.intendedGuestName || record.invitedName, 180),
    email: cleanString(record.email, 180).toLowerCase(),
    company: cleanString(record.company || record.partnerCompany, 180),
    title: cleanString(record.title, 180),
    phone: cleanPhone(record.phone),
    maskedPhone: maskPhone(record.phone),
    phoneVerificationStatus: cleanString(record.phoneVerificationStatus) || "unverified",
    inviteCode: cleanString(record.inviteCode, 80),
    hasEvent: hasRealEvent(record),
    eventKey,
    eventName: eventLabel(record),
    eventDate: cleanString(record.eventDate, 120),
    role: registrationRole(record, type),
    registeredAt: cleanString(record.createdAt || record.registeredAt || record.updatedAt, 120)
  };
}

async function collectRegistrations(env, warnings) {
  const map = new Map();

  for (const prefix of registrationPrefixes) {
    for (const key of await listKeys(env, prefix, warnings)) {
      const record = await readCrmStorageJson(env, key);
      if (!record) continue;
      const normalized = normalizeRegistration(key, record, prefix);
      map.set(normalized.id || key, normalized);
    }
  }

  if (!crmD1Primary(env) && env.MOJO_SUMMITS_STORAGE?.list && env.MOJO_SUMMITS_STORAGE?.get) {
    for (const prefix of r2RegistrationPrefixes) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch((error) => {
          noteLookupWarning(warnings, "r2", prefix, error);
          return null;
        });
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (!record) continue;
          const normalized = normalizeRegistration(object.key, record, prefix);
          map.set(normalized.id || object.key, normalized);
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }

  return [...map.values()].sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));
}

function registrationCacheAgeMs(payload) {
  const generatedAt = Date.parse(payload?.generatedAt || "");
  return Number.isFinite(generatedAt) ? Date.now() - generatedAt : Infinity;
}

async function readRegistrationCache(env, maxAgeMs) {
  if (!env.MOJO_SUMMITS_STORAGE?.get) return null;
  const object = await env.MOJO_SUMMITS_STORAGE.get(registrationIndexCacheKey).catch(() => null);
  const payload = object ? await object.json().catch(() => null) : null;
  if (!payload || !Array.isArray(payload.registrations)) return null;
  if (registrationCacheAgeMs(payload) > maxAgeMs) return null;
  return payload;
}

async function writeRegistrationCache(env, registrations) {
  if (!env.MOJO_SUMMITS_STORAGE?.put) return;
  await env.MOJO_SUMMITS_STORAGE.put(
    registrationIndexCacheKey,
    JSON.stringify({ generatedAt: new Date().toISOString(), registrations }),
    { httpMetadata: { contentType: "application/json" } }
  ).catch(() => null);
}

async function collectRegistrationsCached(env) {
  const fresh = await readRegistrationCache(env, registrationIndexCacheTtlMs);
  if (fresh) {
    return {
      registrations: fresh.registrations,
      source: "cache",
      generatedAt: cleanString(fresh.generatedAt, 120),
      warning: ""
    };
  }

  const stale = await readRegistrationCache(env, registrationIndexCacheMaxStaleMs);
  const warnings = [];
  const registrations = await collectRegistrations(env, warnings);
  if (warnings.length && stale && registrations.length < stale.registrations.length) {
    return {
      registrations: stale.registrations,
      source: "stale-cache",
      generatedAt: cleanString(stale.generatedAt, 120),
      warning: "Using cached event data because live registration lookup is partially unavailable."
    };
  }

  if (!warnings.length || registrations.length) {
    await writeRegistrationCache(env, registrations);
  }
  return {
    registrations,
    source: warnings.length ? "partial-live" : "live",
    generatedAt: new Date().toISOString(),
    warning: warnings.length ? "Some registration sources were unavailable; showing available event data." : ""
  };
}

function registrationsForEvent(registrations, eventKey) {
  const selectedEventKey = cleanString(eventKey, 240);
  if (!selectedEventKey) return [];
  return registrations.filter((registration) => registration.eventKey === selectedEventKey);
}

function eventSummaries(registrations) {
  const map = new Map();
  for (const registration of registrations) {
    if (!registration.hasEvent) continue;
    const previous = map.get(registration.eventKey) || {
      eventKey: registration.eventKey,
      eventName: registration.eventName,
      eventDate: registration.eventDate,
      registeredCount: 0,
      verifiedPhoneCount: 0,
      latestRegisteredAt: ""
    };
    previous.registeredCount += 1;
    if (registration.phoneVerificationStatus === "verified" && isLikelyPhone(registration.phone)) {
      previous.verifiedPhoneCount += 1;
    }
    if (registration.registeredAt > previous.latestRegisteredAt) previous.latestRegisteredAt = registration.registeredAt;
    if (!previous.eventDate && registration.eventDate) previous.eventDate = registration.eventDate;
    map.set(registration.eventKey, previous);
  }
  return [...map.values()].sort((a, b) => {
    const left = cleanString(a.eventDate || a.latestRegisteredAt || a.eventName);
    const right = cleanString(b.eventDate || b.latestRegisteredAt || b.eventName);
    return left.localeCompare(right);
  });
}

async function collectVerifiedRecipients(env) {
  const map = new Map();

  if (env.MOJO_SUMMITS_STORAGE?.list && env.MOJO_SUMMITS_STORAGE?.get) {
    let cursor;
    do {
      const result = await env.MOJO_SUMMITS_STORAGE.list({
        prefix: verifiedPhoneObjectPrefix,
        cursor,
        limit: 1000
      }).catch(() => null);
      if (!result) break;
      for (const object of result.objects || []) {
        const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
        const record = stored ? await stored.json().catch(() => null) : null;
        if (record?.status === "verified") {
          addRecipient(map, record.phone, {
            source: "verified-phone-r2",
            firstVerifiedAt: record.firstVerifiedAt,
            lastVerifiedAt: record.lastVerifiedAt,
            inviteCode: record.inviteCode
          });
        }
      }
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }

  for (const key of await listKeys(env, verifiedPhonePrefix)) {
    const record = await readCrmStorageJson(env, key);
    if (record?.status === "verified") {
      addRecipient(map, record.phone, {
        source: "verified-phone-ledger",
        firstVerifiedAt: record.firstVerifiedAt,
        lastVerifiedAt: record.lastVerifiedAt,
        inviteCode: record.inviteCode
      });
    }
  }

  for (const key of await listKeys(env, phoneDebugPrefix)) {
    const record = await readCrmStorageJson(env, key);
    if (record?.status === "verified" && record?.phone) {
      addRecipient(map, record.phone, {
        source: "phone-verification-debug",
        lastVerifiedAt: record.createdAt,
        inviteCode: record.inviteCode
      });
    }
  }

  for (const prefix of registrationPrefixes) {
    for (const key of await listKeys(env, prefix)) {
      const record = await readCrmStorageJson(env, key);
      if (record?.phoneVerificationStatus === "verified") {
        addRecipient(map, record.phone, {
          source: "verified-registration",
          lastVerifiedAt: record.createdAt || record.updatedAt,
          inviteCode: record.inviteCode
        });
      }
    }
  }

  if (!crmD1Primary(env) && env.MOJO_SUMMITS_STORAGE?.list && env.MOJO_SUMMITS_STORAGE?.get) {
    for (const prefix of r2RegistrationPrefixes) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (record?.phoneVerificationStatus === "verified") {
            addRecipient(map, record.phone, {
              source: "verified-registration-r2",
              lastVerifiedAt: record.createdAt || record.updatedAt,
              inviteCode: record.inviteCode
            });
          }
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }

  return [...map.values()].sort((a, b) => String(b.lastVerifiedAt).localeCompare(String(a.lastVerifiedAt)));
}

function collectEventRecipientsFromRegistrations(registrations, eventKey) {
  const selectedRegistrations = registrationsForEvent(registrations, eventKey);
  const map = new Map();
  for (const registration of selectedRegistrations) {
    if (registration.phoneVerificationStatus !== "verified") continue;
    addRecipient(map, registration.phone, {
      source: "event-registration",
      lastVerifiedAt: registration.registeredAt,
      inviteCode: registration.inviteCode,
      name: registration.name,
      email: registration.email,
      company: registration.company,
      role: registration.role,
      eventKey: registration.eventKey,
      eventName: registration.eventName,
      registeredAt: registration.registeredAt
    });
  }
  if (map.size) {
    const selectedEvent = selectedRegistrations.find((registration) => registration.eventName || registration.eventKey) || {};
    for (const recipient of eventReminderStaffRecipients) {
      addRecipient(map, recipient.phone, {
        source: "event-reminder-staff-copy",
        name: recipient.name,
        role: recipient.role,
        eventKey: selectedEvent.eventKey || eventKey,
        eventName: selectedEvent.eventName
      });
    }
  }
  return [...map.values()].sort((a, b) => String(a.name || a.email || a.maskedPhone).localeCompare(String(b.name || b.email || b.maskedPhone)));
}

async function collectEventRecipients(env, eventKey) {
  const { registrations } = await collectRegistrationsCached(env);
  return collectEventRecipientsFromRegistrations(registrations, eventKey);
}

function collectReplyTestRecipients() {
  const map = new Map();
  for (const recipient of replyTestRecipients) {
    addRecipient(map, recipient.phone, {
      source: "reply-test",
      name: recipient.name,
      role: recipient.role
    });
  }
  return [...map.values()];
}

function notificationType(value) {
  if (value === "additional-event-notice") return "additional-event-notice";
  if (value === "reply-test") return "reply-test";
  return "event-reminder";
}

function finalMessage(message) {
  const base = cleanString(message, 1200);
  if (/\bSTOP\b/i.test(base) && /\bHELP\b/i.test(base)) return base;
  return `${base} Reply STOP to opt out or HELP for help.`;
}

async function sendNotification(env, payload, actor) {
  const config = awsConfig(env);
  const missing = missingConfig(config, env);
  if (missing.length) throw new Error(`SMS notifications are missing configuration: ${missing.join(", ")}.`);

  const type = notificationType(payload?.type);
  const eventKey = cleanString(payload?.eventKey, 240);
  if (type === "event-reminder" && !eventKey) {
    throw new Error("Select an event before sending an upcoming event reminder.");
  }
  if (type === "additional-event-notice") {
    const last = await readCrmStorageJson(env, additionalNoticeKey);
    if (last?.sentAt && Date.now() - Date.parse(last.sentAt) < additionalNoticeCooldownMs) {
      throw new Error("Additional event notices can only be sent once per month.");
    }
  }

  const message = finalMessage(payload?.message);
  if (message.length < 12) throw new Error("Message is required.");
  if (message.length > 1300) throw new Error("Message is too long.");

  const recipients = type === "reply-test"
    ? collectReplyTestRecipients()
    : type === "event-reminder"
      ? await collectEventRecipients(env, eventKey)
      : await collectVerifiedRecipients(env);
  if (!recipients.length) throw new Error("No verified phone numbers are available.");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const results = [];
  for (const recipient of recipients) {
    try {
      const messageId = await sendSms(config, recipient.phone, message);
      results.push({ phone: recipient.maskedPhone, status: "sent", messageId });
    } catch (error) {
      results.push({ phone: recipient.maskedPhone, status: "failed", error: cleanString(error?.message || error, 400) });
    }
  }

  const sentCount = results.filter((entry) => entry.status === "sent").length;
  const failedCount = results.length - sentCount;
  const record = {
    id,
    createdAt: now,
    type,
    actor: cleanString(actor, 200),
    message,
    eventKey: type === "event-reminder" ? eventKey : "",
    eventName: type === "event-reminder" ? cleanString(recipients[0]?.eventName, 240) : "",
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    results
  };
  await writeCrmStorageJson(env, `sms:notification:${now}:${id}`, record);
  if (type === "additional-event-notice" && sentCount) {
    await writeCrmStorageJson(env, additionalNoticeKey, { sentAt: now, id, actor });
  }
  return record;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const access = requireSmsAccess(data);
  if (access.response) return access.response;
  if (!env.MOJO_SUMMITS_SETUP_STATE) return json({ error: "SMS storage is not configured." }, { status: 500 });
  const url = new URL(request.url);
  const type = notificationType(url.searchParams.get("type"));
  const eventKey = cleanString(url.searchParams.get("eventKey"), 240);
  if (type === "reply-test") {
    const recipients = collectReplyTestRecipients();
    return json({
      ok: true,
      recipients,
      events: [],
      registrations: [],
      summary: {
        total: recipients.length,
        selectedEventKey: "",
        selectedRegistrationCount: 0,
        lastAdditionalNoticeAt: ""
      }
    });
  }
  const registrationIndex = type === "event-reminder"
    ? await collectRegistrationsCached(env)
    : { registrations: [], source: "", generatedAt: "", warning: "" };
  const registrations = registrationIndex.registrations;
  const selectedRegistrations = type === "event-reminder" && eventKey
    ? registrationsForEvent(registrations, eventKey)
    : [];
  const recipients = type === "event-reminder"
      ? eventKey
        ? collectEventRecipientsFromRegistrations(registrations, eventKey)
        : []
      : await collectVerifiedRecipients(env);
  const lastAdditionalNotice = await readCrmStorageJson(env, additionalNoticeKey);
  return json({
    ok: true,
    recipients,
    events: eventSummaries(registrations),
    registrations: selectedRegistrations,
    summary: {
      total: recipients.length,
      selectedEventKey: eventKey,
      selectedRegistrationCount: selectedRegistrations.length,
      lastAdditionalNoticeAt: cleanString(lastAdditionalNotice?.sentAt),
      registrationIndexSource: cleanString(registrationIndex.source, 80),
      registrationIndexGeneratedAt: cleanString(registrationIndex.generatedAt, 120),
      registrationIndexWarning: cleanString(registrationIndex.warning, 240)
    }
  });
}

export async function onRequestPost({ request, env, data }) {
  const access = requireSmsAccess(data);
  if (access.response) return access.response;
  if (!env.MOJO_SUMMITS_SETUP_STATE) return json({ error: "SMS storage is not configured." }, { status: 500 });
  const payload = await request.json().catch(() => null);
  try {
    const result = await sendNotification(env, payload, access.email);
    return json({ ok: true, result });
  } catch (error) {
    return json({ error: error?.message || "SMS notification could not be sent." }, { status: 400 });
  }
}

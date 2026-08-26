import { sendMicrosoftGraphMail } from "../_mail.js";
import {
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const defaultSender = "Angel@mojoaisummits.com";
const defaultTopicArn = "arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies";
const defaultStaffNotificationEmails = [
  "scott@mojoaisummits.com",
  "angel@mojoaisummits.com"
];
const optOutKeywords = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const helpKeywords = new Set(["HELP", "INFO"]);
const affirmativeKeywords = new Set(["YES", "Y", "CONFIRM", "CONFIRMED", "RSVP"]);
const negativeKeywords = new Set(["NO", "N", "DECLINE"]);
const certCache = new Map();

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

function splitEmailList(value) {
  return cleanString(value, 4000)
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));
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

function phoneDigits(value) {
  return cleanPhone(value).replace(/\D/g, "");
}

function maskPhone(value) {
  const digits = phoneDigits(value);
  if (!digits) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function escapeHtml(value) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shortPreview(value, max = 240) {
  const text = cleanString(value, 2000).replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function classifyReply(keyword, body) {
  const cleanKeyword = cleanString(keyword, 80).toUpperCase();
  const firstWord = cleanString(body, 240).split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "").toUpperCase() || "";
  const token = cleanKeyword || firstWord;
  if (optOutKeywords.has(token)) return "opt-out";
  if (helpKeywords.has(token)) return "help";
  if (affirmativeKeywords.has(token)) return "affirmative";
  if (negativeKeywords.has(token)) return "negative";
  return "reply";
}

function expectedTopicArn(env) {
  return cleanString(env.SMS_INBOUND_SNS_TOPIC_ARN || env.MOJO_SMS_INBOUND_SNS_TOPIC_ARN || defaultTopicArn, 2048);
}

function validateTopic(env, topicArn) {
  const expected = expectedTopicArn(env);
  if (!expected) return;
  if (cleanString(topicArn, 2048) !== expected) {
    throw new Error("SNS topic ARN is not allowed for this endpoint.");
  }
}

function validateSigningCertUrl(urlValue, topicArn = "") {
  let url;
  try {
    url = new URL(cleanString(urlValue, 2048));
  } catch {
    throw new Error("SNS signing certificate URL is invalid.");
  }
  if (url.protocol !== "https:") throw new Error("SNS signing certificate must use HTTPS.");
  if (!/^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(url.hostname)) {
    throw new Error("SNS signing certificate host is not allowed.");
  }
  if (!/^\/SimpleNotificationService-[A-Za-z0-9]+\.pem$/.test(url.pathname)) {
    throw new Error("SNS signing certificate path is not allowed.");
  }
  const topicRegion = cleanString(topicArn).split(":")[3];
  const certRegion = url.hostname.split(".")[1];
  if (topicRegion && certRegion && topicRegion !== certRegion) {
    throw new Error("SNS signing certificate region does not match the topic.");
  }
  return url.toString();
}

function validateSnsActionUrl(urlValue, topicArn = "") {
  let url;
  try {
    url = new URL(cleanString(urlValue, 2048));
  } catch {
    throw new Error("SNS action URL is invalid.");
  }
  if (url.protocol !== "https:") throw new Error("SNS action URL must use HTTPS.");
  if (!/^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(url.hostname)) {
    throw new Error("SNS action URL host is not allowed.");
  }
  const topicRegion = cleanString(topicArn).split(":")[3];
  const actionRegion = url.hostname.split(".")[1];
  if (topicRegion && actionRegion && topicRegion !== actionRegion) {
    throw new Error("SNS action URL region does not match the topic.");
  }
  return url.toString();
}

function canonicalSnsString(message = {}) {
  const type = cleanString(message.Type);
  const fields = type === "Notification"
    ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
    : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return fields
    .filter((field) => message[field] !== undefined && message[field] !== null && message[field] !== "")
    .map((field) => `${field}\n${message[field]}\n`)
    .join("");
}

function pemToBytes(pem) {
  const base64 = cleanString(pem, 20000)
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function readDerTlv(bytes, offset) {
  if (offset >= bytes.length) throw new Error("Malformed SNS signing certificate.");
  const tag = bytes[offset];
  let lengthByte = bytes[offset + 1];
  let headerLength = 2;
  let length = lengthByte;
  if (lengthByte & 0x80) {
    const count = lengthByte & 0x7f;
    if (!count || count > 4) throw new Error("Malformed SNS signing certificate.");
    length = 0;
    for (let index = 0; index < count; index += 1) {
      length = (length << 8) | bytes[offset + 2 + index];
    }
    headerLength += count;
  }
  const start = offset + headerLength;
  const end = start + length;
  if (end > bytes.length) throw new Error("Malformed SNS signing certificate.");
  return { tag, offset, headerLength, start, end, next: end };
}

function certificateSpkiBytes(certificateBytes) {
  const certificate = readDerTlv(certificateBytes, 0);
  if (certificate.tag !== 0x30) throw new Error("SNS signing certificate is not an X.509 certificate.");
  const tbs = readDerTlv(certificateBytes, certificate.start);
  if (tbs.tag !== 0x30) throw new Error("SNS signing certificate is malformed.");
  let cursor = tbs.start;
  const first = readDerTlv(certificateBytes, cursor);
  if (first.tag === 0xa0) cursor = first.next;
  for (let skipped = 0; skipped < 5; skipped += 1) {
    cursor = readDerTlv(certificateBytes, cursor).next;
  }
  const spki = readDerTlv(certificateBytes, cursor);
  if (spki.tag !== 0x30) throw new Error("SNS signing certificate public key is malformed.");
  return certificateBytes.slice(spki.offset, spki.next);
}

async function snsSigningKey(message) {
  const certUrl = validateSigningCertUrl(message.SigningCertURL, message.TopicArn);
  const signatureVersion = cleanString(message.SignatureVersion) === "1" ? "1" : "2";
  const cacheKey = `${certUrl}#${signatureVersion}`;
  if (!certCache.has(cacheKey)) {
    certCache.set(cacheKey, (async () => {
      const response = await fetch(certUrl);
      if (!response.ok) throw new Error("SNS signing certificate could not be downloaded.");
      const certPem = await response.text();
      const spki = certificateSpkiBytes(pemToBytes(certPem));
      const hash = signatureVersion === "1" ? "SHA-1" : "SHA-256";
      return crypto.subtle.importKey(
        "spki",
        spki,
        { name: "RSASSA-PKCS1-v1_5", hash },
        false,
        ["verify"]
      );
    })());
  }
  return certCache.get(cacheKey);
}

async function verifySnsSignature(message) {
  if (!message || cleanString(message.SignatureVersion) && !["1", "2"].includes(cleanString(message.SignatureVersion))) {
    throw new Error("SNS signature version is not supported.");
  }
  const signature = cleanString(message.Signature, 10000);
  if (!signature) throw new Error("SNS signature is missing.");
  const key = await snsSigningKey(message);
  const canonical = canonicalSnsString(message);
  const signatureBytes = Uint8Array.from(atob(signature), (char) => char.charCodeAt(0));
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signatureBytes,
    new TextEncoder().encode(canonical)
  );
  if (!ok) throw new Error("SNS signature verification failed.");
}

async function listKeys(env, prefix) {
  return listCrmStorageKeys(env, prefix);
}

async function findMatchingContact(env, fromPhone) {
  const target = phoneDigits(fromPhone);
  if (!target) return null;
  const keys = await listKeys(env, "crm:contact:");
  for (const key of keys) {
    const record = await readCrmStorageJson(env, key);
    if (!record || phoneDigits(record.phone) !== target) continue;
    return {
      key,
      email: cleanString(record.email || key.replace(/^crm:contact:/, ""), 240).toLowerCase(),
      name: cleanString(record.name || record.intendedGuestName || record.invitedName || record.guestName, 240),
      company: cleanString(record.company || record.partnerCompany, 240),
      title: cleanString(record.title, 240),
      record
    };
  }
  return null;
}

async function appendContactActivity(env, contact, inbound) {
  if (!contact?.key || !contact?.record) return null;
  const now = inbound.createdAt;
  const activity = [{
    id: inbound.id,
    createdAt: now,
    type: "sms",
    owner: "AWS SNS inbound SMS",
    text: `SMS reply (${inbound.classification}) from ${inbound.fromMasked}: ${inbound.messagePreview}`
  }, ...(Array.isArray(contact.record.activity) ? contact.record.activity : [])].slice(0, 100);
  const updated = {
    ...contact.record,
    id: cleanString(contact.record.id || contact.email || contact.key, 240),
    email: contact.email || cleanString(contact.record.email, 240).toLowerCase(),
    name: cleanString(contact.record.name) || contact.name || contact.email || "Name not recorded",
    activity,
    lastContactDate: now.slice(0, 10),
    lastSmsReplyAt: now,
    lastSmsReplyPreview: inbound.messagePreview,
    lastSmsReplyClassification: inbound.classification,
    smsReplyCount: Number(contact.record.smsReplyCount || 0) + 1,
    crmUpdatedAt: now,
    crmUpdatedBy: "sms-inbound"
  };
  await writeCrmStorageJson(env, contact.key, updated);
  return {
    key: contact.key,
    email: updated.email,
    name: updated.name,
    company: cleanString(updated.company, 240),
    title: cleanString(updated.title, 240)
  };
}

function notificationRecipients(env) {
  const configured = splitEmailList(
    env.MOJO_SMS_INBOUND_NOTIFICATION_RECIPIENTS ||
      env.MOJO_SMS_REPLY_NOTIFICATION_RECIPIENTS ||
      env.MOJO_REGISTRATION_NOTIFICATION_RECIPIENTS ||
      env.MOJO_REGISTRATION_STAFF_EMAILS
  );
  return (configured.length ? configured : defaultStaffNotificationEmails).map((address) => ({ address }));
}

function notificationRows(inbound, contact = {}) {
  return [
    ["Reply type", inbound.classification],
    ["Message", inbound.messageBody],
    ["From", inbound.fromMasked],
    ["To", inbound.toMasked],
    ["Keyword", inbound.messageKeyword],
    ["Matched contact", contact?.name || ""],
    ["Email", contact?.email || ""],
    ["Company", contact?.company || ""],
    ["Title", contact?.title || ""],
    ["CRM lookup", contact?.lookupError || contact?.activityError || ""],
    ["Inbound message ID", inbound.inboundMessageId],
    ["SNS message ID", inbound.snsMessageId],
    ["Received at", inbound.createdAt]
  ].map(([label, value]) => [label, cleanString(value) || "Not provided"]);
}

function notificationText(inbound, contact) {
  const rows = notificationRows(inbound, contact);
  return [
    "A Mojo AI Summits SMS reply was received.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    contact?.key ? "This reply was added to the matching CRM contact activity." : "No matching CRM contact was found by phone number."
  ].join("\n");
}

function notificationHtml(inbound, contact) {
  const rows = notificationRows(inbound, contact)
    .map(([label, value]) => {
      return `<tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb;width:170px">${escapeHtml(label)}</th><td style="padding:8px 10px;border:1px solid #d8dee9;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`;
    })
    .join("");
  const footer = contact?.key
    ? "This reply was added to the matching CRM contact activity."
    : "No matching CRM contact was found by phone number.";
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.55;max-width:760px">
      <p>A Mojo AI Summits SMS reply was received.</p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 20px">
        ${rows}
      </table>
      <p>${escapeHtml(footer)}</p>
    </div>
  `;
}

async function sendStaffNotification(env, inbound, contact) {
  const recipients = notificationRecipients(env);
  if (!recipients.length) return { attempted: false, sent: false, error: "No SMS reply notification recipients are configured." };
  const sender = cleanString(
    env.MOJO_SMS_INBOUND_NOTIFICATION_SENDER ||
      env.MOJO_SMS_REPLY_NOTIFICATION_SENDER ||
      env.MOJO_REGISTRATION_NOTIFICATION_SENDER ||
      env.MOJO_INVITE_EMAIL_SENDER ||
      defaultSender,
    240
  );
  await sendMicrosoftGraphMail(env, {
    sender,
    to: recipients,
    replyTo: contact?.email ? [{ address: contact.email, name: contact.name }] : [],
    subject: `SMS reply from ${contact?.name || inbound.fromMasked || "unknown number"}`,
    text: notificationText(inbound, contact),
    html: notificationHtml(inbound, contact),
    saveToSentItems: true
  });
  return { attempted: true, sent: true, sender, recipients: recipients.map((entry) => entry.address) };
}

function parseInboundPayload(message) {
  const parsed = JSON.parse(cleanString(message.Message, 20000));
  const fromPhone = cleanPhone(parsed.originationNumber);
  const toPhone = cleanPhone(parsed.destinationNumber);
  const body = cleanString(parsed.messageBody, 2000);
  if (!fromPhone || !body) throw new Error("SNS notification does not contain an inbound SMS reply.");
  return {
    inboundMessageId: cleanString(parsed.inboundMessageId, 240),
    previousPublishedMessageId: cleanString(parsed.previousPublishedMessageId, 240),
    messageKeyword: cleanString(parsed.messageKeyword, 80),
    messageBody: body,
    messagePreview: shortPreview(body),
    fromPhone,
    fromMasked: maskPhone(fromPhone),
    toPhone,
    toMasked: maskPhone(toPhone)
  };
}

async function storeSubscriptionEvent(env, message, status, extra = {}) {
  const now = new Date().toISOString();
  const id = randomId();
  const record = {
    id,
    createdAt: now,
    type: cleanString(message.Type, 80),
    topicArn: cleanString(message.TopicArn, 2048),
    snsMessageId: cleanString(message.MessageId, 240),
    status,
    ...extra
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(`sms:inbound:sns:${now}:${id}`, JSON.stringify(record));
  return record;
}

async function handleSubscriptionConfirmation(env, message) {
  const subscribeUrl = validateSnsActionUrl(message.SubscribeURL, message.TopicArn);
  let confirmed = false;
  let error = "";
  try {
    const response = await fetch(subscribeUrl);
    confirmed = response.ok;
    if (!response.ok) error = `Subscription confirmation returned HTTP ${response.status}.`;
  } catch (caught) {
    error = cleanString(caught?.message || caught, 400);
  }
  const record = await storeSubscriptionEvent(env, message, confirmed ? "confirmed" : "confirmation-failed", { confirmed, error });
  return json({ ok: true, type: "SubscriptionConfirmation", confirmed, id: record.id });
}

async function handleNotification(env, message) {
  const inboundSms = parseInboundPayload(message);
  const now = new Date().toISOString();
  const id = inboundSms.inboundMessageId || cleanString(message.MessageId, 240) || randomId();
  const dedupeKey = `sms:inbound:id:${id}`;
  const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(dedupeKey, "json").catch(() => null);
  if (existing?.recordKey) return json({ ok: true, duplicate: true, id, recordKey: existing.recordKey });

  const baseInbound = {
    id,
    createdAt: now,
    snsMessageId: cleanString(message.MessageId, 240),
    topicArn: cleanString(message.TopicArn, 2048),
    subscriptionArn: cleanString(message.SubscriptionArn, 2048),
    classification: classifyReply(inboundSms.messageKeyword, inboundSms.messageBody),
    ...inboundSms
  };

  let contact = null;
  let crmContact = null;
  let crmLookupError = "";
  let crmActivityError = "";
  try {
    contact = await findMatchingContact(env, baseInbound.fromPhone);
  } catch (error) {
    crmLookupError = cleanString(error?.message || error, 400);
    console.warn(JSON.stringify({
      event: "sms_inbound_contact_lookup_failed",
      id,
      error: crmLookupError
    }));
  }
  try {
    crmContact = await appendContactActivity(env, contact, baseInbound);
  } catch (error) {
    crmActivityError = cleanString(error?.message || error, 400);
    console.warn(JSON.stringify({
      event: "sms_inbound_contact_activity_failed",
      id,
      error: crmActivityError
    }));
  }
  if (!crmContact && (crmLookupError || crmActivityError)) {
    crmContact = {
      lookupError: crmLookupError,
      activityError: crmActivityError
    };
  }
  const recordKey = `sms:inbound:message:${id}`;
  const notification = { attempted: false, sent: false };
  const record = {
    ...baseInbound,
    fromPhone: undefined,
    toPhone: undefined,
    crmContact,
    notification
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(recordKey, JSON.stringify(record));
  await env.MOJO_SUMMITS_SETUP_STATE.put(dedupeKey, JSON.stringify({ id, createdAt: now, recordKey }), { expirationTtl: 30 * 24 * 60 * 60 });
  if (baseInbound.classification === "opt-out") {
    await env.MOJO_SUMMITS_SETUP_STATE.put(`sms:opt-out:${phoneDigits(baseInbound.fromPhone)}`, JSON.stringify({
      phone: baseInbound.fromMasked,
      createdAt: now,
      source: recordKey,
      keyword: baseInbound.messageKeyword || baseInbound.messageBody.split(/\s+/)[0] || "STOP"
    }));
  }

  try {
    record.notification = await sendStaffNotification(env, baseInbound, crmContact);
  } catch (error) {
    record.notification = {
      attempted: true,
      sent: false,
      error: cleanString(error?.message || error, 400)
    };
  }
  await env.MOJO_SUMMITS_SETUP_STATE.put(recordKey, JSON.stringify(record));

  return json({
    ok: true,
    id,
    recordKey,
    classification: baseInbound.classification,
    crmContactMatched: Boolean(crmContact?.key),
    notificationSent: record.notification.sent === true
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) return json({ error: "SMS inbound storage is not configured." }, { status: 500 });
  const raw = await request.text();
  try {
    const message = JSON.parse(raw);
    validateTopic(env, message.TopicArn);
    await verifySnsSignature(message);
    const type = cleanString(message.Type, 80);
    if (type === "SubscriptionConfirmation") return handleSubscriptionConfirmation(env, message);
    if (type === "Notification") return handleNotification(env, message);
    if (type === "UnsubscribeConfirmation") {
      const record = await storeSubscriptionEvent(env, message, "unsubscribe-confirmation");
      return json({ ok: true, type, id: record.id });
    }
    return json({ error: "SNS message type is not supported." }, { status: 400 });
  } catch (error) {
    return json({ error: error?.message || "SMS inbound message could not be processed." }, { status: 400 });
  }
}

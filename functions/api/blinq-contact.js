import {
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-api-key"
};

const maxFieldLength = 2000;
const contactPrefix = "crm:contact:";
const companyPrefix = "crm:company:";
const partnerCompanyPrefix = "partner-company:";
const source = "blinq-zapier";

const classificationAliases = new Map([
  ["guest", "potential-guest"],
  ["potential guest", "potential-guest"],
  ["potential-guest", "potential-guest"],
  ["featured guest", "featured-guest"],
  ["featured-guest", "featured-guest"],
  ["speaker", "speaker"],
  ["presenter", "speaker"],
  ["roundtable leader", "roundtable-leader"],
  ["round table leader", "roundtable-leader"],
  ["roundtable-leader", "roundtable-leader"],
  ["partner", "partner-candidate"],
  ["potential partner", "partner-candidate"],
  ["partner candidate", "partner-candidate"],
  ["partner-candidate", "partner-candidate"],
  ["strategic partner", "strategic-partner-contact"],
  ["strategic partner contact", "strategic-partner-contact"],
  ["strategic-partner-contact", "strategic-partner-contact"]
]);

const classificationLabels = {
  "potential-guest": "Potential Guest",
  "featured-guest": "Featured Guest",
  speaker: "Speaker",
  "roundtable-leader": "Roundtable Leader",
  "partner-candidate": "Partner Candidate",
  "strategic-partner-contact": "Strategic Partner Contact"
};

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

function cleanEmail(value) {
  return cleanString(value, 240).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

function cleanPhone(value) {
  const normalized = cleanString(value, 80).replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "";
  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return normalized;
}

function cleanUrl(value) {
  const raw = cleanString(value, 1000);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function cleanClassification(payload = {}) {
  const raw = cleanString(
    payload.classification ||
      payload.relationship_type ||
      payload.relationshipType ||
      payload.contact_type ||
      payload.contactType ||
      payload.crm_type ||
      payload.crmType ||
      payload.type,
    120
  ).toLowerCase().replace(/[_-]+/g, " ");
  return classificationAliases.get(raw) || "potential-guest";
}

function splitName(name = "") {
  const parts = cleanString(name, 240).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : ""
  };
}

function slugify(value = "") {
  return cleanString(value, 240)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isPartnerClassification(classification = "") {
  return ["partner-candidate", "strategic-partner-contact"].includes(classification);
}

async function parsePayload(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return request.json().catch(() => null);
}

function configuredSecrets(env = {}) {
  return [
    env.MOJO_BLINQ_ZAPIER_API_KEY,
    env.MOJO_ZAPIER_CRM_API_KEY,
    env.BLINQ_ZAPIER_API_KEY
  ].map((value) => cleanString(value, 500)).filter(Boolean);
}

function submittedSecret(request) {
  const authorization = cleanString(request.headers.get("authorization"), 600);
  if (/^bearer\s+/i.test(authorization)) return authorization.replace(/^bearer\s+/i, "").trim();
  const headerKey = cleanString(request.headers.get("x-api-key"), 600);
  if (headerKey) return headerKey;

  const url = new URL(request.url);
  return cleanString(
    url.searchParams.get("token")
      || url.searchParams.get("api_key")
      || url.searchParams.get("apikey")
      || url.searchParams.get("key"),
    600
  );
}

function requireApiKey(request, env = {}) {
  const validSecrets = configuredSecrets(env);
  if (!validSecrets.length) {
    return {
      ok: false,
      status: 500,
      error: "Blinq Zapier CRM API key is not configured."
    };
  }
  if (!validSecrets.includes(submittedSecret(request))) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized."
    };
  }
  return { ok: true };
}

function normalizePayload(payload = {}) {
  const classification = cleanClassification(payload);
  const name = cleanString(payload.name || payload.full_name || payload.fullName, 240);
  const email = cleanEmail(payload.email);
  const title = cleanString(payload.job_title || payload.jobTitle || payload.title, 240);
  const company = cleanString(payload.company || payload.company_name || payload.companyName, 240);
  const phone = cleanPhone(payload.phone);
  const profilePhoto = cleanUrl(payload.profile_photo || payload.profilePhoto || payload.photoUrl || payload.photo_url);
  const linkedinProfileUrl = cleanUrl(
    payload.linkedin_profile_url ||
      payload.linkedinProfileUrl ||
      payload.linkedin_url ||
      payload.linkedinUrl ||
      payload.profile_url ||
      payload.profileUrl
  );
  const notes = cleanString(payload.notes || payload.note || payload.crm_notes || payload.crmNotes, 4000);
  const eventSlug = cleanString(payload.event_slug || payload.eventSlug, 240);
  const eventName = cleanString(payload.event_name || payload.eventName, 240);
  const relationshipOwner = cleanEmail(payload.relationship_owner || payload.relationshipOwner || payload.owner);
  const nextAction = cleanString(payload.next_action || payload.nextAction || "follow-up", 80);

  return {
    name,
    email,
    title,
    company,
    phone,
    profilePhoto,
    linkedinProfileUrl,
    classification,
    classificationLabel: classificationLabels[classification],
    notes,
    eventSlug,
    eventName,
    relationshipOwner,
    nextAction
  };
}

function validateContact(contact = {}) {
  if (!contact.name) return "name is required.";
  if (!contact.title) return "job_title is required.";
  if (!contact.company) return "company is required.";
  if (!contact.email) return "email is required.";
  if (!isEmail(contact.email)) return "email must be a valid email address.";
  if (!contact.profilePhoto) return "profile_photo must be a valid http or https URL.";
  return "";
}

function activityForCapture(contact, id, now, rawPayload = {}) {
  return {
    id,
    type: "qualification",
    source,
    title: `Blinq contact captured as ${contact.classificationLabel}`,
    note: contact.notes,
    createdAt: now,
    createdBy: "zapier",
    classification: contact.classification,
    classificationLabel: contact.classificationLabel,
    eventSlug: contact.eventSlug,
    eventName: contact.eventName,
    relationshipOwner: contact.relationshipOwner,
    nextAction: contact.nextAction,
    blinqFields: Object.keys(rawPayload || {}).sort()
  };
}

function mergeActivity(existing = [], activity) {
  return [
    activity,
    ...(Array.isArray(existing) ? existing.filter((entry) => entry?.id !== activity.id) : [])
  ].slice(0, 100);
}

function eventForCapture(contact, id, now) {
  return {
    id,
    eventId: `blinq:${id}`,
    eventSlug: contact.eventSlug,
    eventName: contact.eventName || "Blinq contact capture",
    eventDate: now,
    registrationId: id,
    registrationType: contact.classificationLabel,
    registrationRole: contact.classification,
    guestRegistrationType: isPartnerClassification(contact.classification) ? "" : contact.classification,
    partnerRegistrationType: isPartnerClassification(contact.classification) ? contact.classification : "",
    role: contact.classificationLabel,
    status: "confirmed",
    registrationStatus: "confirmed",
    registeredAt: now
  };
}

function mergeEvents(existing = [], event) {
  return [
    ...(Array.isArray(existing) ? existing.filter((entry) => entry?.eventId !== event.eventId) : []),
    event
  ].slice(-100);
}

async function upsertCompanyRollup(env, contact, contactKey, now) {
  const companySlug = slugify(contact.company);
  if (!companySlug) return {};
  const key = isPartnerClassification(contact.classification)
    ? `${partnerCompanyPrefix}${companySlug}`
    : `${companyPrefix}${companySlug}`;
  const existing = await readCrmStorageJson(env, key).catch(() => null);
  const contacts = Array.isArray(existing?.contacts) ? existing.contacts : [];
  const contactMap = new Map(contacts.map((entry) => [cleanEmail(entry?.email) || cleanString(entry?.name), entry]));
  const previous = contactMap.get(contact.email) || {};
  contactMap.set(contact.email, {
    ...previous,
    id: contact.email,
    key: contactKey,
    email: contact.email,
    name: contact.name,
    title: contact.title,
    phone: contact.phone,
    photoUrl: contact.profilePhoto,
    linkedinProfileUrl: contact.linkedinProfileUrl,
    classification: contact.classification,
    registrationType: contact.classificationLabel,
    source
  });

  await writeCrmStorageJson(env, key, {
    ...(existing || {}),
    organizationName: cleanString(existing?.organizationName || existing?.company || contact.company),
    company: contact.company,
    companySlug,
    tier: isPartnerClassification(contact.classification)
      ? cleanString(existing?.tier) || contact.classificationLabel
      : cleanString(existing?.tier),
    contacts: [...contactMap.values()],
    updatedAt: now,
    updatedBy: source
  });

  return { companyKey: `${companyPrefix}${companySlug}`, profileKey: key, companySlug };
}

async function upsertBlinqContact(env, contact, rawPayload = {}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const nameParts = splitName(contact.name);
  const key = `${contactPrefix}${contact.email}`;
  const existing = await readCrmStorageJson(env, key).catch(() => null);
  const companyRefs = await upsertCompanyRollup(env, contact, key, now);
  const activity = activityForCapture(contact, id, now, rawPayload);
  const event = eventForCapture(contact, id, now);

  const record = {
    ...(existing || {}),
    id: contact.email,
    key,
    email: contact.email,
    name: contact.name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    company: contact.company,
    title: contact.title,
    phone: contact.phone,
    phoneVerificationStatus: contact.phone ? "verified" : cleanString(existing?.phoneVerificationStatus),
    photoUrl: contact.profilePhoto,
    profilePhotoUrl: contact.profilePhoto,
    linkedinProfileUrl: contact.linkedinProfileUrl || cleanString(existing?.linkedinProfileUrl || existing?.linkedinUrl, 500),
    classification: contact.classification,
    registrationType: contact.classificationLabel,
    registrationRole: contact.classification,
    guestRegistrationType: isPartnerClassification(contact.classification) ? cleanString(existing?.guestRegistrationType) : contact.classification,
    partnerRegistrationType: isPartnerClassification(contact.classification) ? contact.classification : cleanString(existing?.partnerRegistrationType),
    lifecycleStage: isPartnerClassification(contact.classification) ? "guest" : "guest",
    contactStatus: isPartnerClassification(contact.classification) ? "partner candidate" : "potential guest",
    nextAction: contact.nextAction,
    relationshipOwner: contact.relationshipOwner || cleanString(existing?.relationshipOwner),
    emailPermission: cleanString(existing?.emailPermission) || "transactional-only",
    source: cleanString(existing?.source) || source,
    captureSource: source,
    capturedAt: now,
    capturedBy: "zapier",
    blinqPayload: rawPayload,
    createdAt: cleanString(existing?.createdAt) || now,
    updatedAt: now,
    updatedBy: source,
    crmUpdatedAt: now,
    crmUpdatedBy: source,
    activity: mergeActivity(existing?.activity, activity),
    events: mergeEvents(existing?.events, event),
    ...companyRefs
  };

  await writeCrmStorageJson(env, key, record);
  return {
    id,
    contactKey: key,
    email: contact.email,
    created: !existing,
    classification: contact.classification,
    profileKey: companyRefs.profileKey || "",
    companyKey: companyRefs.companyKey || ""
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env }) {
  const auth = requireApiKey(request, env);
  if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

  return json({
    ok: true,
    source,
    endpoint: "/api/blinq-contact",
    accepts: ["POST"],
    requiredFields: ["name", "job_title", "company", "email", "profile_photo"],
    optionalFields: ["phone"]
  });
}

export async function onRequestPost({ request, env }) {
  const auth = requireApiKey(request, env);
  if (!auth.ok) return json({ error: auth.error }, { status: auth.status });

  if (!env.MOJO_SUMMITS_SETUP_STATE && !env.MOJO_SUMMITS_DB && !env.mojo_ai_summits_crm) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const payload = await parsePayload(request);
  if (!payload || typeof payload !== "object") {
    return json({ error: "Expected a JSON or form payload." }, { status: 400 });
  }

  const contact = normalizePayload(payload);
  const validationError = validateContact(contact);
  if (validationError) return json({ error: validationError }, { status: 400 });

  const result = await upsertBlinqContact(env, contact, payload);
  return json({ ok: true, source, ...result }, { status: result.created ? 201 : 200 });
}

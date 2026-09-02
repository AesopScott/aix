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
const guestMatrixProspectPrefix = "crm:guest-matrix-prospect:";
const partnerMatrixProspectPrefix = "crm:partner-matrix-prospect:";
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

function fieldKey(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function payloadValue(payload = {}, ...names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(payload, name) && payload[name] != null) return payload[name];
  }
  const normalized = new Map(
    Object.entries(payload || {}).map(([key, value]) => [fieldKey(key), value])
  );
  for (const name of names) {
    const value = normalized.get(fieldKey(name));
    if (value != null) return value;
  }
  return "";
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
    payloadValue(
      payload,
      "classification",
      "relationship_type",
      "relationshipType",
      "relationship type",
      "contact_type",
      "contactType",
      "contact type",
      "crm_type",
      "crmType",
      "crm type",
      "type"
    ),
    120
  ).toLowerCase().replace(/[_-]+/g, " ");
  return classificationAliases.get(raw) || "potential-guest";
}

function cleanBoolean(value) {
  if (value === true || value === false) return value;
  const normalized = String(value ?? "").trim().slice(0, 40).toLowerCase();
  if (["true", "yes", "y", "1", "on"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "off"].includes(normalized)) return false;
  return false;
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

function safeFileSegment(value = "", fallback = "file") {
  const clean = String(value || "")
    .trim()
    .replace(/@/g, "-at-")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return clean || fallback;
}

function isPartnerClassification(classification = "") {
  return ["partner-candidate", "strategic-partner-contact"].includes(classification);
}

function matrixProspectPrefix(classification = "") {
  return isPartnerClassification(classification) ? partnerMatrixProspectPrefix : guestMatrixProspectPrefix;
}

function matrixProspectType(classification = "") {
  return isPartnerClassification(classification) ? "partner-matrix-prospect" : "guest-matrix-prospect";
}

function matrixRegistrationRole(classification = "") {
  return {
    "potential-guest": "guest",
    "featured-guest": "featured-guest",
    speaker: "presenter",
    "roundtable-leader": "roundtable-leader",
    "partner-candidate": "partner-candidate",
    "strategic-partner-contact": "partner-candidate"
  }[classification] || "guest";
}

function cleanMatrixStatus(value = "", fallback = "pending-engagement") {
  const normalized = cleanString(value, 120).toLowerCase().replace(/[\s_]+/g, "-");
  const aliases = {
    new: "pending-engagement",
    pending: "pending-engagement",
    tracking: "pending-engagement",
    accepted: "confirmed",
    waitlist: "alternate",
    waitlisted: "alternate"
  };
  const status = aliases[normalized] || normalized;
  return [
    "scott-engagement",
    "pending-engagement",
    "contacted",
    "confirmed",
    "declined",
    "bad-fit",
    "invited",
    "registered",
    "alternate",
    "attended",
    "no-show"
  ].includes(status) ? status : fallback;
}

function cleanMatrixOption(value = "", allowed = [], fallback = "") {
  const normalized = cleanString(value, 120).toLowerCase().replace(/[\s_]+/g, "-");
  return allowed.includes(normalized) ? normalized : fallback;
}

function cleanStarRating(value, fallback = 1) {
  const rating = Number.parseInt(value, 10);
  if ([1, 2, 3].includes(rating)) return rating;
  return [1, 2, 3].includes(fallback) ? fallback : 1;
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

async function readBlinqStorageJson(env, key) {
  const record = await readCrmStorageJson(env, key).catch(() => null);
  if (!record || typeof record !== "string") return record;
  return JSON.parse(record);
}

function normalizePayload(payload = {}) {
  const classification = cleanClassification(payload);
  const firstName = cleanString(payloadValue(payload, "first_name", "firstName", "first name"), 120);
  const lastName = cleanString(payloadValue(payload, "last_name", "lastName", "last name"), 120);
  const joinedName = cleanString([firstName, lastName].filter(Boolean).join(" "), 240);
  const name = cleanString(payloadValue(payload, "name", "full_name", "fullName", "full name", "display_name", "displayName", "display name") || joinedName, 240);
  const email = cleanEmail(payloadValue(payload, "email", "email_address", "emailAddress", "email address", "work_email", "workEmail", "work email"));
  const title = cleanString(payloadValue(payload, "job_title", "jobTitle", "job title", "title", "position", "headline"), 240);
  const company = cleanString(payloadValue(payload, "company", "company_name", "companyName", "company name", "organization", "organisation"), 240);
  const phone = cleanPhone(payloadValue(payload, "phone", "mobile", "mobile_phone", "mobilePhone", "mobile phone", "phone_number", "phoneNumber", "phone number"));
  const profilePhoto = cleanUrl(
    payloadValue(
      payload,
      "profile_photo",
      "profilePhoto",
      "profile photo",
      "profile_photo_url",
      "profilePhotoUrl",
      "profile photo url",
      "photoUrl",
      "photo_url",
      "photo url",
      "avatar",
      "avatar_url",
      "avatarUrl",
      "avatar url"
    )
  );
  const linkedinProfileUrl = cleanUrl(
    payloadValue(
      payload,
      "linkedin",
      "linkedIn",
      "LinkedIn",
      "linkedin_profile",
      "linkedinProfile",
      "linkedInProfile",
      "linkedin profile",
      "LinkedIn Profile",
      "linkedin_profile_url",
      "linkedinProfileUrl",
      "linkedInProfileUrl",
      "linkedin profile url",
      "LinkedIn Profile URL",
      "linkedin_url",
      "linkedinUrl",
      "linkedInUrl",
      "linkedin url",
      "LinkedIn URL",
      "profile_url",
      "profileUrl",
      "profile url"
    )
  );
  const notes = cleanString(payloadValue(payload, "notes", "note", "crm_notes", "crmNotes", "crm notes", "matrix_notes", "matrixNotes", "matrix notes"), 4000);
  const eventSlug = cleanString(payloadValue(payload, "event_slug", "eventSlug", "event slug"), 240);
  const eventName = cleanString(payloadValue(payload, "event_name", "eventName", "event name"), 240);
  const eventId = cleanString(payloadValue(payload, "event_id", "eventId", "event id"), 240);
  const eventDate = cleanString(payloadValue(payload, "event_date", "eventDate", "event date"), 120);
  const eventTime = cleanString(payloadValue(payload, "event_time", "eventTime", "event time"), 120);
  const eventShowId = cleanString(payloadValue(payload, "event_show_id", "eventShowId", "event show id", "show_id", "showId", "show id"), 80);
  const relationshipOwner = cleanEmail(payloadValue(payload, "relationship_owner", "relationshipOwner", "relationship owner", "owner"));
  const nextAction = cleanString(payloadValue(payload, "next_action", "nextAction", "next action") || "follow-up", 80);
  const linkedinConnectionStatus = cleanString(payloadValue(payload, "linkedin_connection_status", "linkedinConnectionStatus", "linkedin connection status", "connection_status", "connectionStatus", "connection status"), 120);
  const registrationRequestStatus = cleanString(payloadValue(payload, "registration_request_status", "registrationRequestStatus", "registration request status", "invite_stage", "inviteStage", "invite stage", "invite_status", "inviteStatus", "invite status"), 120);
  const crmStatus = cleanString(payloadValue(payload, "crm_status", "crmStatus", "crm status", "guest_status", "guestStatus", "guest status", "partner_status", "partnerStatus", "partner status", "registration_status", "registrationStatus", "registration status"), 120);
  const matrixInterestRating = payloadValue(payload, "matrix_interest_rating", "matrixInterestRating", "matrix interest rating", "participation_interest_rating", "participationInterestRating", "participation interest rating", "interest_rating", "interestRating", "interest rating");
  const potentialSponsor = cleanBoolean(payloadValue(payload, "potential_sponsor", "potentialSponsor", "potential sponsor", "is_potential_sponsor", "isPotentialSponsor", "is potential sponsor", "sponsor_prospect", "sponsorProspect", "sponsor prospect"));

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
    eventId,
    eventSlug,
    eventName,
    eventDate,
    eventTime,
    eventShowId,
    relationshipOwner,
    nextAction,
    linkedinConnectionStatus,
    registrationRequestStatus,
    crmStatus,
    matrixInterestRating,
    potentialSponsor
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
  const status = cleanMatrixStatus(contact.crmStatus);
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
    status,
    registrationStatus: status,
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
  const existing = await readBlinqStorageJson(env, key).catch(() => null);
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

function matrixNotes(contact, rawPayload = {}) {
  const lines = [
    contact.notes,
    contact.nextAction ? `Next action: ${contact.nextAction}` : "",
    `Captured from Blinq/Zapier as ${contact.classificationLabel}.`,
    `Webhook fields: ${Object.keys(rawPayload || {}).sort().join(", ")}`
  ].filter(Boolean);
  return cleanString(lines.join("\n"), 4000);
}

function mergeMatrixNotes(existingNotes = "", contact, rawPayload = {}) {
  const existing = cleanString(existingNotes, 4000);
  const incoming = matrixNotes(contact, rawPayload);
  if (!existing) return incoming;
  if (!incoming || existing.includes(incoming)) return existing;
  return cleanString(`${existing}\n\n${incoming}`, 4000);
}

function matrixIdentity(contact = {}) {
  if (contact.email) return `email:${safeFileSegment(contact.email, "email")}`;
  if (contact.linkedinProfileUrl) return `linkedin:${safeFileSegment(contact.linkedinProfileUrl.toLowerCase().replace(/\/+$/, ""), "profile")}`;
  return `name:${safeFileSegment(contact.name, "person")}`;
}

async function upsertBlinqMatrixProspect(env, contact, contactKey, captureId, now, rawPayload = {}) {
  const isPartner = isPartnerClassification(contact.classification);
  const prefix = matrixProspectPrefix(contact.classification);
  const role = matrixRegistrationRole(contact.classification);
  const eventShowId = cleanString(contact.eventShowId, 80).toLowerCase().replace(/[\s_]+/g, "-");
  const hasAssignedEvent = Boolean(contact.eventId || contact.eventSlug || contact.eventName);
  const eventSegment = safeFileSegment(hasAssignedEvent ? `${contact.eventSlug || contact.eventName || contact.eventId}:${eventShowId || "both"}` : "unassigned", "unassigned");
  const key = `${prefix}${eventSegment}:${matrixIdentity(contact)}`;
  const existing = await readBlinqStorageJson(env, key).catch(() => null);
  const status = cleanMatrixStatus(contact.crmStatus || existing?.crmStatus || existing?.guestStatus || existing?.partnerStatus || existing?.registrationStatus);
  const linkedinConnectionStatus = cleanMatrixOption(
    contact.linkedinConnectionStatus || existing?.linkedinConnectionStatus,
    ["unknown", "not-connected", "connection-requested", "connected", "declined", "unreachable"],
    "unknown"
  );
  const registrationRequestStatus = cleanMatrixOption(
    contact.registrationRequestStatus || existing?.registrationRequestStatus,
    ["not-sent", "drafted", "sent", "reminder-sent", "bounced", "declined"],
    "not-sent"
  );
  const existingNotes = cleanString(existing?.preRegistrationNotes || existing?.matrixNotes || existing?.engagementNotes, 4000);
  const record = {
    ...(existing || {}),
    id: cleanString(existing?.id, 200) || captureId,
    type: matrixProspectType(contact.classification),
    matrixOnly: true,
    status: cleanString(existing?.status, 80) || "tracking",
    source,
    invitationSource: source,
    captureSource: source,
    sourceContactKey: contactKey,
    eventId: cleanString(contact.eventId || (hasAssignedEvent ? `${contact.eventSlug || contact.eventName}:${eventShowId || "both"}` : existing?.eventId), 200),
    eventSlug: contact.eventSlug || cleanString(existing?.eventSlug, 200),
    eventName: contact.eventName || cleanString(existing?.eventName, 240),
    eventDate: contact.eventDate || cleanString(existing?.eventDate, 120),
    eventTime: contact.eventTime || cleanString(existing?.eventTime, 120),
    eventShowId: eventShowId || cleanString(existing?.eventShowId, 80),
    eventShowLabel: cleanString(existing?.eventShowLabel, 120),
    eventShowTime: contact.eventTime || cleanString(existing?.eventShowTime, 120),
    name: contact.name,
    email: contact.email,
    intendedGuestName: contact.name,
    intendedGuestEmail: contact.email,
    invitedEmail: contact.email,
    guestEmail: contact.email,
    invitedName: contact.name,
    guestName: contact.name,
    partnerContactEmail: isPartner ? contact.email : "",
    partnerContactName: isPartner ? contact.name : "",
    partnerCompany: isPartner ? contact.company : cleanString(existing?.partnerCompany, 240),
    company: contact.company,
    title: contact.title,
    jobTitle: contact.title,
    phone: contact.phone || cleanString(existing?.phone, 80),
    phoneVerificationStatus: contact.phone ? "verified" : cleanString(existing?.phoneVerificationStatus),
    photoUrl: contact.profilePhoto || cleanString(existing?.photoUrl, 500),
    profilePhotoUrl: contact.profilePhoto || cleanString(existing?.profilePhotoUrl, 500),
    linkedinProfileUrl: contact.linkedinProfileUrl || cleanString(existing?.linkedinProfileUrl || existing?.linkedinUrl, 500),
    linkedinUrl: contact.linkedinProfileUrl || cleanString(existing?.linkedinUrl || existing?.linkedinProfileUrl, 500),
    enrichmentSource: cleanString(existing?.enrichmentSource || (contact.linkedinProfileUrl ? "blinq-linkedin-profile-url" : ""), 120),
    classification: contact.classification,
    classificationLabel: contact.classificationLabel,
    contactStatus: isPartner ? "partner candidate" : "potential guest",
    crmStatus: status,
    guestStatus: status,
    partnerStatus: isPartner ? status : "",
    registrationStatus: status,
    guestRegistrationType: isPartner ? cleanString(existing?.guestRegistrationType) : role,
    partnerRegistrationType: isPartner ? role : cleanString(existing?.partnerRegistrationType),
    registrationRole: role,
    potentialSponsor: !isPartner && (contact.potentialSponsor || existing?.potentialSponsor === true),
    invitedBy: cleanString(contact.relationshipOwner || existing?.invitedBy || "zapier", 180),
    relationshipOwner: contact.relationshipOwner || cleanString(existing?.relationshipOwner),
    nextAction: contact.nextAction,
    linkedinConnectionStatus,
    registrationRequestStatus,
    matrixInterestRating: cleanStarRating(contact.matrixInterestRating, cleanStarRating(existing?.matrixInterestRating, 1)),
    preRegistrationNotes: mergeMatrixNotes(existingNotes, contact, rawPayload),
    blinqPayload: rawPayload,
    blinqFields: Object.keys(rawPayload || {}).sort(),
    capturedAt: now,
    capturedBy: "zapier",
    createdAt: cleanString(existing?.createdAt) || now,
    createdBy: cleanString(existing?.createdBy) || source,
    updatedAt: now,
    updatedBy: source
  };

  await writeCrmStorageJson(env, key, record);
  return {
    matrixKey: key,
    matrixType: record.type,
    matrixCreated: !existing
  };
}

async function upsertBlinqContact(env, contact, rawPayload = {}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const nameParts = splitName(contact.name);
  const key = `${contactPrefix}${contact.email}`;
  const existing = await readBlinqStorageJson(env, key).catch(() => null);
  const companyRefs = await upsertCompanyRollup(env, contact, key, now);
  const matrixRefs = await upsertBlinqMatrixProspect(env, contact, key, id, now, rawPayload);
  const activity = activityForCapture(contact, id, now, rawPayload);
  const event = eventForCapture(contact, id, now);
  const role = matrixRegistrationRole(contact.classification);
  const status = cleanMatrixStatus(contact.crmStatus);

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
    phone: contact.phone || cleanString(existing?.phone, 80),
    phoneVerificationStatus: contact.phone ? "verified" : cleanString(existing?.phoneVerificationStatus),
    photoUrl: contact.profilePhoto,
    profilePhotoUrl: contact.profilePhoto,
    linkedinProfileUrl: contact.linkedinProfileUrl || cleanString(existing?.linkedinProfileUrl || existing?.linkedinUrl, 500),
    sourceMatrixProspectKey: matrixRefs.matrixKey,
    classification: contact.classification,
    registrationType: contact.classificationLabel,
    registrationRole: role,
    guestRegistrationType: isPartnerClassification(contact.classification) ? cleanString(existing?.guestRegistrationType) : role,
    partnerRegistrationType: isPartnerClassification(contact.classification) ? role : cleanString(existing?.partnerRegistrationType),
    lifecycleStage: "prospect",
    contactStatus: isPartnerClassification(contact.classification) ? "partner candidate" : "potential guest",
    crmStatus: status,
    guestStatus: status,
    registrationStatus: status,
    nextAction: contact.nextAction,
    relationshipOwner: contact.relationshipOwner || cleanString(existing?.relationshipOwner),
    emailPermission: cleanString(existing?.emailPermission) || "transactional-only",
    source: cleanString(existing?.source) || source,
    invitationSource: cleanString(existing?.invitationSource) || source,
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
    ...companyRefs,
    ...matrixRefs
  };

  await writeCrmStorageJson(env, key, record);
  return {
    id,
    contactKey: key,
    email: contact.email,
    created: !existing,
    classification: contact.classification,
    matrixKey: matrixRefs.matrixKey,
    matrixType: matrixRefs.matrixType,
    matrixCreated: matrixRefs.matrixCreated,
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
    optionalFields: ["phone", "classification", "linkedin_profile_url", "notes", "event_slug", "event_name", "matrix_interest_rating"]
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

import { sendMicrosoftGraphMail } from "./_mail.js";
import {
  crmD1Available,
  crmD1Primary,
  readCrmD1Json,
  readCrmStorageJson,
  writeCrmD1Json,
  writeCrmStorageJson,
  deleteCrmD1Record
} from "./_crm-d1.js";
import { zoomKey } from "./_virtual-events.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const acceptedPhoneStatuses = new Set(["verified"]);
const registrationObjectPrefix = "crm/registrations";
const registrationPhotoObjectPrefix = "crm/registration-photos";
const registrationCompanyLogoObjectPrefix = "crm/registration-company-logos";
const inviteUsageObjectPrefix = "crm/invite-usage";
const verifiedPhonePrefix = "sms:verified-phone:";
const verifiedPhoneObjectPrefix = "sms/verified-phones";
const maxRegistrationPhotoBytes = 6 * 1024 * 1024;
const allowedRegistrationPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedRegistrationLogoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const guestConfirmationSubject = "Your Mojo AI Summits registration is confirmed";
const guestConfirmationSenderName = "Angel Mosley";
const guestConfirmationSenderEmail = "Angel@mojoaisummits.com";
const guestContactEmail = "guest@mojoaisummits.com";
const memberContactEmail = "member@mojoaisummits.com";
const defaultStaffNotificationEmails = [
  "angel@mojoaisummits.com",
  "scott@mojoaisummits.com",
  "miller@mojoaisummits.com",
  "jodi@mojoaisummits.com"
];
const retiredRegistrationNotificationEmails = new Set([
  "gina@mojoaisummits.com"
]);
const defaultRegistrationConfirmationCopyEmails = [
  "angel@mojoaisummits.com",
  "scott@mojoaisummits.com"
];
const partnerStaffNotificationEmails = [
  "scott@mojoaisummits.com",
  "miller@mojoaisummits.com",
  "jodi@mojoaisummits.com"
];
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

function cleanPhone(value) {
  const normalized = cleanString(value).replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return normalized;
}

function verifiedPhoneKey(phone) {
  return `${verifiedPhonePrefix}${phone.replace(/\D/g, "")}`;
}

function verifiedPhoneObjectKey(phone) {
  return `${verifiedPhoneObjectPrefix}/${phone.replace(/\D/g, "")}.json`;
}

function cleanCampaignValue(value) {
  const clean = cleanString(value).slice(0, 160);
  if (!clean) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "";
  if (/^\+?\d[\d\s().-]{7,}$/.test(clean)) return "";
  return clean.replace(/[<>"]/g, "");
}

function cleanCampaignAttribution(payload = {}) {
  let source = payload;
  if (typeof payload?.campaignAttribution === "string") {
    try {
      source = JSON.parse(payload.campaignAttribution || "{}");
    } catch {
      source = {};
    }
  } else if (payload?.campaignAttribution && typeof payload.campaignAttribution === "object") {
    source = payload.campaignAttribution;
  }

  const attribution = {
    source: cleanCampaignValue(source.utmSource || source.utm_source || source.source),
    medium: cleanCampaignValue(source.utmMedium || source.utm_medium || source.medium),
    campaign: cleanCampaignValue(source.utmCampaign || source.utm_campaign || source.campaign),
    content: cleanCampaignValue(source.utmContent || source.utm_content || source.content),
    term: cleanCampaignValue(source.utmTerm || source.utm_term || source.term),
    landingPath: cleanCampaignValue(source.landingPath || source.pagePath || source.route),
    referrerHost: cleanCampaignValue(source.referrerHost)
  };

  Object.keys(attribution).forEach((key) => {
    if (!attribution[key]) delete attribution[key];
  });
  return attribution;
}

function cleanQuestionRankings(value) {
  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value || "[]");
    } catch {
      source = [];
    }
  }
  if (!Array.isArray(source)) return [];
  const rankings = source.map((item) => ({
    id: cleanString(item?.id).slice(0, 120),
    rank: Number(item?.rank),
    prompt: cleanString(item?.prompt).slice(0, 300),
    detail: cleanString(item?.detail).slice(0, 600)
  })).filter((item) =>
    item.id &&
    item.prompt &&
    Number.isInteger(item.rank) &&
    item.rank >= 1 &&
    item.rank <= 8
  );
  const uniqueRanks = new Set(rankings.map((item) => item.rank));
  const uniqueIds = new Set(rankings.map((item) => item.id));
  if (rankings.length !== 8 || uniqueRanks.size !== 8 || uniqueIds.size !== 8) return [];
  return rankings.sort((a, b) => a.rank - b.rank);
}

function questionRankingSummary(rankings = []) {
  return (Array.isArray(rankings) ? rankings : [])
    .slice()
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((item) => `${item.rank}. ${cleanString(item.prompt)}`)
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
}

function safeFileSegment(value, fallback = "file") {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function linkedInProfileIdentity(value = "") {
  return cleanLinkedInProfileUrl(value).toLowerCase().replace(/\/+$/, "");
}

function linkedInContactKey(value = "") {
  const identity = linkedInProfileIdentity(value);
  return identity ? `crm:contact:linkedin:${safeFileSegment(identity, "profile")}` : "";
}

function registrationPhotoPublicUrl(key) {
  const cleanKey = cleanString(key);
  return cleanKey ? `/api/crm?photo=${encodeURIComponent(cleanKey)}` : "";
}

function registrationPhotoObjectKey(type, registration, file) {
  const createdAt = cleanString(registration.createdAt).replace(/[:.]/g, "-") || Date.now().toString();
  const emailSegment = safeFileSegment(cleanString(registration.email).split("@")[0], "registrant");
  const idSegment = safeFileSegment(registration.id, crypto.randomUUID());
  const nameSegment = safeFileSegment(file?.name, "brief-photo");
  return `${registrationPhotoObjectPrefix}/${safeFileSegment(type, "registration")}/${emailSegment}/${createdAt}-${idSegment}-${nameSegment}`;
}

function registrationCompanyLogoObjectKey(type, registration, file) {
  const createdAt = cleanString(registration.createdAt).replace(/[:.]/g, "-") || Date.now().toString();
  const companySegment = safeFileSegment(registration.partnerCompany || registration.company, "company");
  const idSegment = safeFileSegment(registration.id, crypto.randomUUID());
  const nameSegment = safeFileSegment(file?.name, "company-logo");
  return `${registrationCompanyLogoObjectPrefix}/${safeFileSegment(type, "registration")}/${companySegment}/${createdAt}-${idSegment}-${nameSegment}`;
}

function isImageFile(file) {
  return file && typeof file === "object" && typeof file.arrayBuffer === "function";
}

function splitEmailList(value) {
  return cleanString(value)
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(isEmail);
}

function registrationNotificationEmails(emails = [], excludedEmails = []) {
  const excluded = new Set([
    ...retiredRegistrationNotificationEmails,
    ...excludedEmails.map((email) => cleanString(email).toLowerCase()).filter(Boolean)
  ]);
  return [...new Set(emails.map((email) => cleanString(email).toLowerCase()).filter(isEmail))]
    .filter((email) => !excluded.has(email));
}

function registrationConfirmationCopyRecipients(env = {}, registrantEmail = "") {
  const configured = splitEmailList(
    env.MOJO_REGISTRATION_CONFIRMATION_BCC ||
      env.MOJO_REGISTRATION_CONFIRMATION_COPY_EMAILS ||
      env.MOJO_GUEST_REGISTRATION_CONFIRMATION_COPY_EMAILS
  );
  return registrationNotificationEmails(
    configured.length ? configured : defaultRegistrationConfirmationCopyEmails,
    [registrantEmail]
  ).map((address) => ({ address }));
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(value).toLowerCase());
}

function invitePersonName(record = {}) {
  const name = cleanString(record.intendedGuestName || record.invitedName || record.guestName);
  return isEmail(name) ? "" : name;
}

function invitePersonEmail(record = {}) {
  const email = cleanString(record.intendedGuestEmail || record.invitedEmail || record.guestEmail).toLowerCase();
  if (isEmail(email)) return email;
  const name = cleanString(record.intendedGuestName || record.invitedName || record.guestName).toLowerCase();
  return isEmail(name) ? name : "";
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
    "partner-candidate": "partner-candidate",
    "partner candidate": "partner-candidate",
    "featured-partner": "featured-partner",
    "featured-guest": "featured-guest",
    "featured-member": "featured-member",
    "featured-author": "featured-author",
    "featured author": "featured-author",
    partner: "partner",
    presenter: "presenter",
    speaker: "presenter",
    roundtable: "roundtable-leader",
    "roundtable-leader": "roundtable-leader",
    guest: "guest"
  }[cleanString(value).toLowerCase()] || "guest";
}

function requiresSingleShowRegistrationRole(role) {
  return ["featured-guest", "featured-author", "featured-partner"].includes(cleanGuestRegistrationType(role));
}

function cleanOptionalRegistrationType(value) {
  const raw = cleanString(value);
  return raw ? cleanGuestRegistrationType(raw) : "";
}

function cleanEventShowId(value, fallback = "") {
  const raw = cleanString(value).toLowerCase();
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

function eventShowLabel(showId) {
  return {
    morning: "Morning show",
    afternoon: "Afternoon show",
    both: "Both shows"
  }[cleanEventShowId(showId)] || "";
}

function eventShowTime(showId) {
  return {
    morning: "10:00 am - 11:30 am CT",
    afternoon: "1:00 pm - 2:30 pm CT",
    both: "10:00 am - 11:30 am CT and 1:00 pm - 2:30 pm CT"
  }[cleanEventShowId(showId)] || "";
}

function eventShowSchedule(showId) {
  return {
    morning: { startHour: 10, startMinute: 0, endHour: 11, endMinute: 30 },
    afternoon: { startHour: 13, startMinute: 0, endHour: 14, endMinute: 30 },
    both: { startHour: 10, startMinute: 0, endHour: 14, endMinute: 30 }
  }[cleanEventShowId(showId)] || null;
}

function eventShowFromTime(value = "") {
  const time = cleanString(value).toLowerCase();
  if (/\b10(?::00)?\s*(a\.?m\.?|am)?\b/.test(time)) return "morning";
  if (/\b1(?::00)?\s*(p\.?m\.?|pm)\b/.test(time) || /\b13:00\b/.test(time)) return "afternoon";
  return "";
}

function eventShowKey(record = {}) {
  return cleanEventShowId(record.eventShowId || record.showId || record.eventShow || record.show, "");
}

function eventShowMetadata(showId) {
  const eventShowId = cleanEventShowId(showId);
  return eventShowId
    ? {
        eventShowId,
        eventShowLabel: eventShowLabel(eventShowId),
        eventShowTime: eventShowTime(eventShowId),
        eventTime: eventShowTime(eventShowId)
      }
    : {};
}

function resolveRegistrationShow(registration = {}, invite = {}) {
  const inviteShow = eventShowKey(invite);
  const selectedShow = eventShowKey(registration);
  if (inviteShow === "morning" || inviteShow === "afternoon") return eventShowMetadata(inviteShow);
  if (selectedShow === "morning" || selectedShow === "afternoon") return eventShowMetadata(selectedShow);
  if (inviteShow === "both") return eventShowMetadata("both");
  return eventShowMetadata(selectedShow || inviteShow || "both");
}

function registrationShowError(type, registration = {}, invite = {}) {
  if (type !== "guest" && type !== "member" && type !== "partner") return "";
  const role = cleanGuestRegistrationType(
    invite.partnerRegistrationType ||
      invite.guestRegistrationType ||
      invite.registrationRole ||
      registration.partnerRegistrationType ||
      registration.guestRegistrationType ||
      registration.registrationRole
  );
  const inviteShow = eventShowKey(invite);
  const selectedShow = cleanEventShowId(registration.eventShowId || registration.showId || registration.eventShow, "");
  const show = inviteShow === "morning" || inviteShow === "afternoon" ? inviteShow : selectedShow;
  if (requiresSingleShowRegistrationRole(role) && show !== "morning" && show !== "afternoon") {
    return `Choose either the morning show or afternoon show for ${role.replace(/-/g, " ")} registration.`;
  }
  if (show && !["morning", "afternoon", "both"].includes(show)) {
    return "Choose a valid show time.";
  }
  return "";
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
  const guestRegistrationType = cleanGuestRegistrationType(registration.partnerRegistrationType || registration.guestRegistrationType || registration.registrationRole);
  const roles = [];
  if (type === "guest") {
    if (cleanBoolean(registration.isPresenter) || guestRegistrationType === "presenter") roles.push("Presenter");
    if (cleanBoolean(registration.isRoundtableLeader) || guestRegistrationType === "roundtable-leader") roles.push("Round Table Leader");
    if (cleanBoolean(registration.isFeaturedGuest) || guestRegistrationType === "featured-guest") roles.push("Featured Guest");
    if (cleanBoolean(registration.isFeaturedAuthor) || guestRegistrationType === "featured-author") roles.push("Featured Author");
    if (!roles.length) roles.push("Guest");
  } else if (type === "partner") {
    roles.push(guestRegistrationType === "featured-partner" ? "Featured Partner" : guestRegistrationType === "partner-candidate" ? "Partner Candidate" : registrationRoleLabel(type));
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
    eventTime: cleanString(registration.eventTime),
    eventShowId: eventShowKey(registration),
    eventShowLabel: cleanString(registration.eventShowLabel) || eventShowLabel(registration.eventShowId),
    eventShowTime: cleanString(registration.eventShowTime) || cleanString(registration.eventTime),
    inviteCode: cleanString(registration.inviteCode),
    city: cleanString(registration.city, 120),
    stateCountry: cleanString(registration.stateCountry || registration.state || registration.country, 120),
    state: cleanString(registration.state || registration.stateCountry || registration.country, 120),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    linkedinProfileUrl: cleanLinkedInProfileUrl(registration.linkedinProfileUrl),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    partnerRegistrationType: cleanOptionalRegistrationType(registration.partnerRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.partnerRegistrationType || registration.guestRegistrationType),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(type),
    role: roles.join(", "),
    roles,
    registeredAt: cleanString(registration.createdAt) || now,
    attended: typeof previous.attended === "boolean" ? previous.attended : cleanBoolean(registration.attended),
    attendanceStatus: cleanString(previous.attendanceStatus || registration.attendanceStatus) || "not_recorded",
    attendedAt: cleanString(previous.attendedAt || registration.attendedAt),
    attendanceNotes: cleanString(previous.attendanceNotes),
    eventQuestionRankings: cleanQuestionRankings(registration.eventQuestionRankings),
    eventQuestionRankingSummary: cleanString(registration.eventQuestionRankingSummary),
    campaignAttribution: cleanCampaignAttribution(registration.campaignAttribution || registration),
    updatedAt: now
  };
}

function contactEventKey(event = {}) {
  const show = eventShowKey(event);
  const eventSlug = cleanString(event.eventSlug || event.eventName);
  return cleanString(event.registrationId || event.eventId || (eventSlug && show ? `${eventSlug}:${show}` : eventSlug) || event.inviteCode || event.registeredAt)
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

function cleanLinkedInProfileUrl(value) {
  const raw = cleanString(value).replace(/\s+/g, "");
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return "";
  const path = url.pathname.replace(/\/+$/, "");
  if (!/^\/(in|pub)\/[^/]+/i.test(path)) return "";
  url.protocol = "https:";
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString().slice(0, 500);
}

function cleanPayload(payload, type = "") {
  const eventQuestionRankings = cleanQuestionRankings(payload?.eventQuestionRankings || payload?.questionRankings || payload?.topicRankings);
  const eventQuestionRankingSummary = cleanString(payload?.eventQuestionRankingSummary) || questionRankingSummary(eventQuestionRankings);
  const eventNotes = cleanString(payload?.eventNotes || payload?.registrationNotes || eventQuestionRankingSummary, 4000);
  return {
    inviteCode: cleanString(payload?.inviteCode),
    name: cleanString(payload?.name),
    company: cleanString(payload?.company),
    title: cleanString(payload?.title),
    industry: cleanString(payload?.industry),
    city: cleanString(payload?.city, 120),
    stateCountry: cleanString(payload?.stateCountry || payload?.state || payload?.country, 120),
    state: cleanString(payload?.state || payload?.stateCountry || payload?.country, 120),
    email: cleanString(payload?.email).toLowerCase(),
    linkedinProfileUrl: cleanLinkedInProfileUrl(payload?.linkedinProfileUrl || payload?.linkedInProfileUrl || payload?.linkedinUrl || payload?.linkedInUrl),
    phone: cleanPhone(payload?.phone),
    phoneVerificationStatus: cleanString(payload?.phoneVerificationStatus),
    eventShowId: cleanEventShowId(payload?.eventShowId || payload?.showId || payload?.eventShow, ""),
    eventQuestionRankings,
    eventQuestionRankingSummary,
    eventNotes,
    registrationNotes: eventNotes,
    partnerProductTypes: type === "partner" ? cleanString(payload?.partnerProductTypes, 2000) : "",
    partnerClientMessaging: type === "partner" ? cleanString(payload?.partnerClientMessaging, 4000) : "",
    publicationUseName: cleanBoolean(payload?.publicationUseName),
    publicationUseCompany: cleanBoolean(payload?.publicationUseCompany),
    campaignAttribution: cleanCampaignAttribution(payload)
  };
}

async function readRegistrationRequest(request, type = "") {
  const contentType = cleanString(request.headers.get("content-type")).toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      payload: Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
      photoFile: form.get("briefPhoto") || form.get("photo") || form.get("headshot"),
      companyLogoFile: type === "partner"
        ? form.get("companyLogo") || form.get("partnerCompanyLogo") || form.get("logo")
        : null
    };
  }

  return {
    payload: await request.json().catch(() => null),
    photoFile: null,
    companyLogoFile: null
  };
}

function hasRegistrationPhotoFile(file) {
  return Boolean(file && typeof file === "object" && typeof file.arrayBuffer === "function" && cleanString(file.name));
}

function validateRegistrationPhoto(file) {
  if (!hasRegistrationPhotoFile(file)) {
    return "Upload a picture for the event brief before submitting registration.";
  }
  const type = cleanString(file.type).toLowerCase();
  if (!allowedRegistrationPhotoTypes.has(type)) {
    return "Upload the brief picture as a JPG, PNG, or WebP image.";
  }
  if (Number(file.size || 0) > maxRegistrationPhotoBytes) {
    return "Upload a brief picture smaller than 6 MB.";
  }
  return "";
}

function hasRegistrationCompanyLogoFile(file) {
  return Boolean(file && typeof file === "object" && typeof file.arrayBuffer === "function" && cleanString(file.name));
}

function validateRegistrationCompanyLogo(file) {
  if (!hasRegistrationCompanyLogoFile(file)) return "";
  const type = cleanString(file.type).toLowerCase();
  if (!allowedRegistrationLogoTypes.has(type)) {
    return "Upload the company logo as a JPG, PNG, or WebP image.";
  }
  if (Number(file.size || 0) > maxRegistrationPhotoBytes) {
    return "Upload a company logo smaller than 6 MB.";
  }
  return "";
}

function requiresRegistrationPhoto(registration = {}, invite = {}) {
  const role = cleanGuestRegistrationType(
    invite.partnerRegistrationType ||
      invite.guestRegistrationType ||
      invite.registrationRole ||
      registration.partnerRegistrationType ||
      registration.guestRegistrationType ||
      registration.registrationRole
  );
  return Boolean(
    cleanBoolean(registration.isFeaturedGuest) ||
      cleanBoolean(registration.isFeaturedMember) ||
      cleanBoolean(registration.isFeaturedAuthor) ||
      cleanBoolean(registration.isFeaturedPartner) ||
      cleanBoolean(registration.isPresenter) ||
      cleanBoolean(registration.isRoundtableLeader) ||
      ["featured-guest", "featured-member", "featured-author", "featured-partner", "presenter", "roundtable-leader"].includes(role)
  );
}

async function storeRegistrationPhoto(env, type, registration, file) {
  const error = validateRegistrationPhoto(file);
  if (error) throw new Error(error);
  const key = registrationPhotoObjectKey(type, registration, file);
  await env.MOJO_SUMMITS_STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: cleanString(file.type).toLowerCase(),
      contentDisposition: `inline; filename="${safeFileSegment(file.name, "brief-photo")}"`
    },
    customMetadata: {
      area: "crm",
      kind: "registration-photo",
      type,
      registrationId: cleanString(registration.id),
      email: cleanString(registration.email).toLowerCase()
    }
  });
  return {
    photoKey: key,
    photoUrl: registrationPhotoPublicUrl(key),
    photoOriginalName: cleanString(file.name),
    photoContentType: cleanString(file.type).toLowerCase(),
    photoSize: Number(file.size || 0),
    photoUploadedAt: new Date().toISOString()
  };
}

async function storeRegistrationCompanyLogo(env, type, registration, file) {
  const error = validateRegistrationCompanyLogo(file);
  if (error) throw new Error(error);
  const key = registrationCompanyLogoObjectKey(type, registration, file);
  await env.MOJO_SUMMITS_STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: cleanString(file.type).toLowerCase(),
      contentDisposition: `inline; filename="${safeFileSegment(file.name, "company-logo")}"`
    },
    customMetadata: {
      area: "crm",
      kind: "registration-company-logo",
      type,
      registrationId: cleanString(registration.id),
      email: cleanString(registration.email).toLowerCase(),
      company: cleanString(registration.partnerCompany || registration.company)
    }
  });
  return {
    companyLogoKey: key,
    companyLogoUrl: registrationPhotoPublicUrl(key),
    companyLogoOriginalName: cleanString(file.name),
    companyLogoContentType: cleanString(file.type).toLowerCase(),
    companyLogoSize: Number(file.size || 0),
    companyLogoUploadedAt: new Date().toISOString()
  };
}

function splitName(name = "") {
  const parts = cleanString(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] };
}

async function writeRegistrationDebug(env, type, status, details = {}) {
  if (env?.MOJO_REGISTRATION_DEBUG_WRITES !== "true") return;
  if (!env?.MOJO_SUMMITS_SETUP_STATE && !crmD1Available(env)) return;
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
    staffNotificationEmail: details.staffNotificationEmail && typeof details.staffNotificationEmail === "object"
      ? {
          attempted: details.staffNotificationEmail.attempted === true,
          sent: details.staffNotificationEmail.sent === true,
          error: cleanString(details.staffNotificationEmail.error)
        }
      : undefined,
    error: cleanString(details.error)
  };

  await writeSetupJson(env, `crm:registration-debug:${createdAt}:${id}`, entry).catch(() => null);
}

function inviteMeta(inviteRecord) {
  const record = inviteRecord?.record || {};
  return {
    eventId: cleanString(record.eventId || record.eventSlug || record.eventName),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    eventTime: cleanString(record.eventTime),
    eventShowId: eventShowKey(record),
    eventShowLabel: cleanString(record.eventShowLabel) || eventShowLabel(record.eventShowId),
    eventShowTime: cleanString(record.eventShowTime) || cleanString(record.eventTime),
    eventStart: cleanString(record.eventStart || record.eventStartDateTime),
    eventEnd: cleanString(record.eventEnd || record.eventEndDateTime),
    eventAccessLink: cleanString(record.eventAccessLink || record.accessLink || record.joinUrl || record.zoomUrl),
    intendedGuestName: invitePersonName(record),
    intendedGuestEmail: invitePersonEmail(record),
    invitedEmail: invitePersonEmail(record),
    invitedName: invitePersonName(record),
    guestName: invitePersonName(record),
    guestRegistrationType: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole),
    partnerRegistrationType: cleanOptionalRegistrationType(record.partnerRegistrationType || record.registrationRole),
    registrationRole: cleanGuestRegistrationType(record.registrationRole || record.partnerRegistrationType || record.guestRegistrationType),
    isPresenter: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "presenter",
    isRoundtableLeader: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "roundtable-leader",
    isFeaturedGuest: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "featured-guest",
    isFeaturedAuthor: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "featured-author",
    isFeaturedPartner: cleanGuestRegistrationType(record.partnerRegistrationType || record.registrationRole) === "featured-partner",
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

function registrationAccessLink(registration = {}) {
  return cleanString(
    registration.eventAccessLink ||
      registration.accessLink ||
      registration.joinUrl ||
      registration.zoomUrl ||
      registration.zoomJoinUrl,
    1000
  );
}

function eventAccessSlug(registration = {}) {
  const explicit = cleanString(registration.eventSlug, 240);
  if (explicit) return explicit;
  const eventId = cleanString(registration.eventId, 240);
  if (eventId) return eventId.split(":")[0].trim();
  return cleanString(registration.eventName, 240);
}

export async function registrationWithVirtualEventAccess(env, registration = {}) {
  const existingAccess = registrationAccessLink(registration);
  if (existingAccess) {
    const accessLink = absoluteMojoUrl(existingAccess);
    return {
      ...registration,
      eventAccessLink: accessLink,
      zoomJoinUrl: accessLink
    };
  }

  const slug = eventAccessSlug(registration);
  if (!slug) return registration;

  const storedZoom = await readCrmStorageJson(env, zoomKey(slug)).catch(() => null);
  const joinUrl = cleanString(storedZoom?.joinUrl, 1000);
  if (!joinUrl) return registration;

  const accessLink = absoluteMojoUrl(joinUrl);
  return {
    ...registration,
    eventAccessLink: accessLink,
    zoomJoinUrl: accessLink,
    eventAccessHydratedFromVirtualEvent: true,
    eventZoomMeetingId: cleanString(storedZoom?.meetingId, 120),
    eventZoomPasscode: cleanString(storedZoom?.passcode, 120)
  };
}

function eventDetails(registration = {}) {
  const name = cleanString(registration.eventName) || "Mojo AI Summits event";
  const date = cleanString(registration.eventDate) || "To be announced";
  const time = cleanString(registration.eventTime) || "1:00 p.m. Central";
  const access = registrationAccessLink(registration);
  const accessText = access ? absoluteMojoUrl(access) : "Event access details will be sent before the session.";
  return {
    name,
    date,
    time,
    pageUrl: eventPageUrl(registration),
    accessText,
    accessUrl: /^https?:\/\//i.test(accessText) ? accessText : ""
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

function eventDateParts(value) {
  const date = parseDate(value);
  if (!date) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function formatIcsCentralDateTime(parts, hour, minute) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
    "T",
    String(hour).padStart(2, "0"),
    String(minute).padStart(2, "0"),
    "00"
  ].join("");
}

function calendarShowTimedLines(registration = {}) {
  const showId = eventShowKey(registration) || eventShowFromTime(registration.eventTime || registration.eventShowTime);
  const schedule = eventShowSchedule(showId);
  const parts = eventDateParts(registration.eventDate);
  if (!schedule || !parts) return [];
  return [
    `DTSTART;TZID=America/Chicago:${formatIcsCentralDateTime(parts, schedule.startHour, schedule.startMinute)}`,
    `DTEND;TZID=America/Chicago:${formatIcsCentralDateTime(parts, schedule.endHour, schedule.endMinute)}`
  ];
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
  const fallbackTimedLines = start ? [] : calendarShowTimedLines(registration);
  if (!start && !fallbackTimedLines.length && !dateOnly) return "";
  const uid = `${cleanString(registration.id) || crypto.randomUUID()}@mojoaisummits.com`;
  const timedLines = start
    ? [
        `DTSTART:${formatIcsDateTime(start)}`,
        `DTEND:${formatIcsDateTime(end && end > start ? end : new Date(start.getTime() + 60 * 60 * 1000))}`
      ]
    : fallbackTimedLines.length
      ? fallbackTimedLines
    : dateOnly
      ? [
          `DTSTART;VALUE=DATE:${formatIcsDate(dateOnly)}`,
          `DTEND;VALUE=DATE:${formatIcsDate(addUtcDays(dateOnly, 1))}`
        ]
      : [];
  const registrantEmail = cleanString(registration.email).toLowerCase();
  const registrantName = cleanString(registration.name) || registrantEmail || "Registrant";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mojo AI Summits//Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
    ...timedLines,
    `ORGANIZER;CN=${icsEscape(guestConfirmationSenderName)}:mailto:${guestConfirmationSenderEmail}`,
    ...(registrantEmail ? [`ATTENDEE;CN=${icsEscape(registrantName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${registrantEmail}`] : []),
    `SUMMARY:${icsEscape(`Mojo AI Summits: ${details.name}`)}`,
    `LOCATION:${icsEscape(details.accessUrl || "Virtual event")}`,
    `DESCRIPTION:${icsEscape(`Registration confirmed for ${details.name}. Event page: ${details.pageUrl}. Access: ${details.accessText}`)}`,
    `URL:${icsEscape(details.accessUrl || details.pageUrl)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function registrationSupportContactEmail(type = "") {
  return type === "member" ? memberContactEmail : guestContactEmail;
}

function registrationSupportTeamName(type = "") {
  return type === "member" ? "Mojo AI Summits Member Team" : "Mojo AI Summits Guest Team";
}

function guestConfirmationText(registration = {}, type = "guest") {
  const details = eventDetails(registration);
  const name = cleanString(registration.name) || "there";
  const supportContact = registrationSupportContactEmail(type);
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
    `Questions? Contact ${supportContact}.`,
    "",
    guestConfirmationSenderName,
    "Director of Engagement",
    guestConfirmationSenderEmail,
    "214-232-8324"
  ].join("\n");
}

function guestConfirmationHtml(registration = {}, type = "guest") {
  const details = eventDetails(registration);
  const name = cleanString(registration.name) || "there";
  const supportContact = registrationSupportContactEmail(type);
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
      <p>Questions? Contact <a href="mailto:${supportContact}">${supportContact}</a>.</p>
      <p style="margin-top:24px">${guestConfirmationSenderName}<br>Director of Engagement<br><a href="mailto:${guestConfirmationSenderEmail}">${guestConfirmationSenderEmail}</a><br>214-232-8324</p>
    </div>
  `;
}

export async function sendRegistrationConfirmation(env, type = "guest", registration = {}) {
  if (!cleanString(registration.email)) return { attempted: false, sent: false, error: "Registrant email is missing." };
  const deliveryRegistration = await registrationWithVirtualEventAccess(env, registration);
  const calendarInvite = buildGuestCalendarInvite(deliveryRegistration);
  const confirmationCopies = registrationConfirmationCopyRecipients(env, deliveryRegistration.email);
  const supportContact = registrationSupportContactEmail(type);

  await sendMicrosoftGraphMail(env, {
    sender: cleanString(env.MOJO_GUEST_REGISTRATION_EMAIL_SENDER || env.MOJO_INVITE_EMAIL_SENDER || guestConfirmationSenderEmail),
    to: [{ address: deliveryRegistration.email, name: deliveryRegistration.name }],
    bcc: confirmationCopies,
    replyTo: [
      { address: supportContact, name: registrationSupportTeamName(type) },
      { address: guestConfirmationSenderEmail, name: guestConfirmationSenderName }
    ],
    subject: guestConfirmationSubject,
    text: guestConfirmationText(deliveryRegistration, type),
    html: guestConfirmationHtml(deliveryRegistration, type),
    attachments: calendarInvite ? [{
      name: "mojo-ai-summits-event.ics",
      contentType: "text/calendar; method=REQUEST; charset=utf-8",
      contentBytes: base64Encode(calendarInvite)
    }] : [],
    saveToSentItems: true
  });

  return {
    attempted: true,
    sent: true,
    calendarInviteAttached: Boolean(calendarInvite),
    zoomAccessAttached: Boolean(registrationAccessLink(deliveryRegistration)),
    confirmationCopyCount: confirmationCopies.length
  };
}

function staffNotificationRecipients(env = {}, type = "") {
  const configured = splitEmailList(
    env.MOJO_REGISTRATION_STAFF_EMAILS ||
      env.MOJO_REGISTRATION_NOTIFICATION_RECIPIENTS ||
      env.MOJO_REGISTRATION_NOTIFY_TO
  );
  const emails = [
    ...(configured.length ? configured : defaultStaffNotificationEmails),
    ...(type === "partner" ? partnerStaffNotificationEmails : [])
  ];
  return registrationNotificationEmails(emails).map((address) => ({ address }));
}

function staffRegistrationSubject(type, registration = {}) {
  const label = registrationRoleLabel(type);
  const name = cleanString(registration.name) || cleanString(registration.email) || "New registrant";
  const eventName = cleanString(registration.eventName) || "Mojo AI Summits";
  return `${label} registered: ${name} for ${eventName}`;
}

function staffRegistrationRows(type, registration = {}) {
  const details = eventDetails(registration);
  return [
    ["Registration type", registrationRoleLabel(type)],
    ["Role", registrationRoles(type, registration).join(", ")],
    ["Name", registration.name],
    ["Email", registration.email],
    ["LinkedIn profile URL", registration.linkedinProfileUrl],
    ["Phone", registration.phone],
    ["Company", registration.company || registration.partnerCompany],
    ["Title", registration.title],
    ["Industry", registration.industry],
    ["City", registration.city],
    ["State / Country", registration.stateCountry || registration.state || registration.country],
    ["Ranked conversation questions", registration.eventQuestionRankingSummary],
    ["Brief photo", registration.photoUrl],
    ["Company logo", type === "partner" ? registration.companyLogoUrl : ""],
    ["Products sold", type === "partner" ? registration.partnerProductTypes : ""],
    ["Typical client messaging", type === "partner" ? registration.partnerClientMessaging : ""],
    ["Event", details.name],
    ["Date", details.date],
    ["Time", details.time],
    ["Event page", details.pageUrl],
    ["Access", details.accessText],
    ["Invite code", registration.inviteCode],
    ["Registration ID", registration.id],
    ["CRM contact key", registration.contactKey],
    ["Registered at", registration.createdAt],
    ["Publication name opt-in", cleanBoolean(registration.publicationUseName) ? "Yes" : "No"],
    ["Publication company opt-in", cleanBoolean(registration.publicationUseCompany) ? "Yes" : "No"]
  ].map(([label, value]) => [label, cleanString(value) || "Not provided"]);
}

function staffRegistrationNotificationText(type, registration = {}) {
  const rows = staffRegistrationRows(type, registration);
  return [
    "A Mojo AI Summits registration has been submitted.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "This registration has been stored in the CRM."
  ].join("\n");
}

function staffRegistrationNotificationHtml(type, registration = {}) {
  const rows = staffRegistrationRows(type, registration);
  const tableRows = rows.map(([label, value]) => {
    const cleanValue = escapeHtml(value);
    const renderedValue = /^https?:\/\//i.test(value)
      ? `<a href="${cleanValue}">${cleanValue}</a>`
      : cleanValue;
    return `<tr><th style="text-align:left;padding:8px 10px;border:1px solid #d8dee9;background:#f4f7fb;width:170px">${escapeHtml(label)}</th><td style="padding:8px 10px;border:1px solid #d8dee9">${renderedValue}</td></tr>`;
  }).join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.55;max-width:760px">
      <p>A Mojo AI Summits registration has been submitted.</p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 20px">
        ${tableRows}
      </table>
      <p>This registration has been stored in the CRM.</p>
    </div>
  `;
}

async function sendStaffRegistrationNotification(env, type, registration = {}) {
  const recipients = staffNotificationRecipients(env, type);
  if (!recipients.length) return { attempted: false, sent: false, error: "No staff notification recipients are configured." };

  await sendMicrosoftGraphMail(env, {
    sender: cleanString(env.MOJO_REGISTRATION_NOTIFICATION_SENDER || env.MOJO_INVITE_EMAIL_SENDER || guestConfirmationSenderEmail),
    to: recipients,
    replyTo: cleanString(registration.email)
      ? [{ address: registration.email, name: registration.name }]
      : [],
    subject: staffRegistrationSubject(type, registration),
    text: staffRegistrationNotificationText(type, registration),
    html: staffRegistrationNotificationHtml(type, registration),
    saveToSentItems: true
  });

  return { attempted: true, sent: true };
}

async function readVerifiedPhone(env, phone) {
  const r2Key = verifiedPhoneObjectKey(phone);
  const kvKey = verifiedPhoneKey(phone);
  const existingD1 = await readCrmStorageJson(env, kvKey);
  const existingObject = !existingD1 && !crmD1Primary(env) && env?.MOJO_SUMMITS_STORAGE?.get
    ? await env.MOJO_SUMMITS_STORAGE.get(r2Key).catch(() => null)
    : null;
  const existing = existingD1 || (existingObject
    ? await existingObject.json().catch(() => null)
    : null);
  return existing?.status === "verified" ? existing : null;
}

async function applyServerPhoneVerification(env, registration) {
  if (acceptedPhoneStatuses.has(registration.phoneVerificationStatus)) return registration;
  if (!registration.phone) return registration;
  const verifiedPhone = await readVerifiedPhone(env, registration.phone);
  if (!verifiedPhone) return registration;
  return {
    ...registration,
    phoneVerificationStatus: "verified"
  };
}

function validateRegistration(registration, type = "") {
  if (!/^\d{6}$/.test(registration.inviteCode)) return "Enter a valid six-digit invite code.";
  if (!registration.name) return "Name is required.";
  if (!registration.company) return "Company is required.";
  if (!registration.title) return "Title is required.";
  if (!registration.industry) return "Industry is required.";
  if (["guest", "partner"].includes(type) && !registration.city) return "City is required.";
  if (["guest", "partner"].includes(type) && !registration.stateCountry) return "State / country is required.";
  if (!registration.email) return "Email is required.";
  if (!isValidEmail(registration.email)) return "Enter a valid email address.";
  if (!registration.linkedinProfileUrl) return "LinkedIn profile URL is required.";
  if (type === "partner" && !registration.partnerProductTypes) return "Describe the types of products your company sells.";
  if (type === "partner" && !registration.partnerClientMessaging) return "Describe your typical client messaging.";
  if (!registration.phone) return "Phone number is required.";
  if (!acceptedPhoneStatuses.has(registration.phoneVerificationStatus)) {
    return "Phone verification status is required.";
  }
  if (["guest", "partner"].includes(type) && cleanQuestionRankings(registration.eventQuestionRankings).length !== 8) {
    return "Rank each conversation question once, from 1 through 8.";
  }
  return "";
}

function normalizeRegistrationForType(type, registration) {
  return registration;
}

function codeKeys(type, code) {
  return [
    `${type}-invite-code:${code}`,
    `crm:${type}-invite-code:${code}`,
    `${type}-invite:${code}`
  ];
}

async function readSetupJson(env, key) {
  return readCrmStorageJson(env, key);
}

async function writeSetupJson(env, key, record) {
  await writeCrmStorageJson(env, key, record);
}

async function deleteSetupRecord(env, key) {
  await deleteCrmD1Record(env, key).catch(() => false);
  if (!crmD1Primary(env) && env.MOJO_SUMMITS_SETUP_STATE?.delete) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
  }
}

async function readInviteCode(env, type, code) {
  if (!env.MOJO_SUMMITS_SETUP_STATE && !crmD1Available(env)) return null;

  for (const key of codeKeys(type, code)) {
    const record = await readSetupJson(env, key);
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
  const key = inviteUsageObjectKey(type, code);
  const d1Record = await readCrmD1Json(env, key).catch(() => null);
  if (d1Record) return d1Record;
  if (crmD1Primary(env)) return null;
  if (!env.MOJO_SUMMITS_STORAGE?.get) return null;
  const object = await env.MOJO_SUMMITS_STORAGE.get(key).catch(() => null);
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

  await writeSetupJson(env, inviteRecord.key, {
    ...inviteRecord.record,
    type,
    code,
    status: "used",
    usedAt: registration.createdAt,
    usedBy: registration.name || registration.email,
    usedByName: registration.name,
    usedByEmail: registration.email,
    registrationId: registration.id,
    eventTime: registration.eventTime,
    eventShowId: registration.eventShowId,
    eventShowLabel: registration.eventShowLabel,
    eventShowTime: registration.eventShowTime
  });
}

async function writeInviteUsage(env, type, code, registration) {
  const key = inviteUsageObjectKey(type, code);
  const record = {
    type,
    code,
    status: "used",
    usedAt: registration.createdAt,
    usedBy: registration.name || registration.email,
    usedByName: registration.name,
    usedByEmail: registration.email,
    registrationId: registration.id,
    eventName: registration.eventName,
    eventDate: registration.eventDate,
    eventTime: registration.eventTime,
    eventShowId: registration.eventShowId,
    eventShowLabel: registration.eventShowLabel,
    eventShowTime: registration.eventShowTime
  };
  const wroteD1 = await writeCrmD1Json(env, key, record).catch(() => false);
  if (!crmD1Primary(env) && env.MOJO_SUMMITS_STORAGE?.put) {
    await env.MOJO_SUMMITS_STORAGE.put(
      key,
      JSON.stringify(record),
      {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
        customMetadata: { area: "crm", kind: "invite-usage", type }
      }
    );
  }
  if (!wroteD1 && !env.MOJO_SUMMITS_STORAGE?.put) return null;
  return key;
}

function contactRefsForRegistration(type, registration) {
  const email = cleanString(registration.email).toLowerCase();
  const company = cleanString(registration.partnerCompany || registration.company);
  const companySlug = slugify(company);
  if (!email) return {};

  return {
    contactId: email,
    contactKey: `crm:contact:${email}`,
    ...(companySlug ? {
      companyKey: `crm:company:${companySlug}`,
      profileKey: type === "partner" ? `partner-company:${companySlug}` : `crm:company:${companySlug}`
    } : {})
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

async function writeD1Registration(env, type, record, config = {}) {
  if (!crmD1Available(env) || !record?.id) return null;
  const createdAt = cleanString(record.createdAt) || new Date().toISOString();
  const key = `${config.crmPrefix || `crm:${type}-registrant:`}${createdAt}:${record.id}`;
  await writeCrmD1Json(env, key, {
    ...record,
    storage: "d1",
    d1StoredAt: new Date().toISOString()
  });
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

  await writeSetupJson(env, registrationKey, storedRecord);
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
  if (!email) return {};

  const now = registration.createdAt || new Date().toISOString();
  const companyKey = companySlug ? `crm:company:${companySlug}` : "";
  const partnerCompanyKey = companySlug ? `partner-company:${companySlug}` : "";
  const updatedBy = cleanString(config.updatedBy) || "registration";
  const nameParts = splitName(registration.name);
  const emailContactKey = `crm:contact:${email}`;
  const linkedinAliasKey = linkedInContactKey(registration.linkedinProfileUrl);
  const contact = {
    id: email,
    email,
    name: cleanString(registration.name) || email,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    partnerRegistrationType: cleanOptionalRegistrationType(registration.partnerRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.partnerRegistrationType || registration.guestRegistrationType),
    company,
    companySlug,
    companyKey,
    profileKey: type === "partner" ? partnerCompanyKey : companyKey,
    title: cleanString(registration.title),
    city: cleanString(registration.city, 120),
    stateCountry: cleanString(registration.stateCountry || registration.state || registration.country, 120),
    state: cleanString(registration.state || registration.stateCountry || registration.country, 120),
    linkedinProfileUrl: cleanLinkedInProfileUrl(registration.linkedinProfileUrl),
    phone: cleanString(registration.phone),
    photoUrl: cleanString(registration.photoUrl),
    photoKey: cleanString(registration.photoKey),
    photoOriginalName: cleanString(registration.photoOriginalName),
    photoUploadedAt: cleanString(registration.photoUploadedAt),
    companyLogoUrl: cleanString(registration.companyLogoUrl),
    companyLogoKey: cleanString(registration.companyLogoKey),
    companyLogoOriginalName: cleanString(registration.companyLogoOriginalName),
    companyLogoUploadedAt: cleanString(registration.companyLogoUploadedAt),
    ...(type === "partner" ? {
      partnerProductTypes: cleanString(registration.partnerProductTypes, 2000),
      partnerClientMessaging: cleanString(registration.partnerClientMessaging, 4000)
    } : {}),
    eventQuestionRankings: cleanQuestionRankings(registration.eventQuestionRankings),
    eventQuestionRankingSummary: cleanString(registration.eventQuestionRankingSummary),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(config.label || type),
    lifecycleStage: "registered",
    emailPermission: "transactional-only",
    source: cleanString(config.source || registration.source || `${type}-registration`),
    campaignAttribution: cleanCampaignAttribution(registration.campaignAttribution || registration),
    updatedAt: now,
    updatedBy
  };
  const emailExisting = await readSetupJson(env, emailContactKey);
  const linkedinExisting = linkedinAliasKey && linkedinAliasKey !== emailContactKey
    ? await readSetupJson(env, linkedinAliasKey)
    : null;
  const mergedExisting = {
    ...(linkedinExisting || {}),
    ...(emailExisting || {}),
    events: [
      ...(Array.isArray(linkedinExisting?.events) ? linkedinExisting.events : []),
      ...(Array.isArray(emailExisting?.events) ? emailExisting.events : [])
    ]
  };
  const writeCompanyRollups = config.writeCompanyRollups === true || type === "partner";
  const companyKeys = writeCompanyRollups && companySlug
    ? type === "partner" ? [partnerCompanyKey] : [companyKey]
    : [];

  await writeSetupJson(env, emailContactKey, {
    ...mergedExisting,
    ...contact,
    id: email,
    name: contact.name || cleanString(mergedExisting?.name) || email,
    company: contact.company || cleanString(mergedExisting?.company),
    companyKey: contact.companyKey || cleanString(mergedExisting?.companyKey),
    profileKey: contact.profileKey || cleanString(mergedExisting?.profileKey),
    city: contact.city || cleanString(mergedExisting?.city),
    stateCountry: contact.stateCountry || cleanString(mergedExisting?.stateCountry || mergedExisting?.state || mergedExisting?.country),
    state: contact.state || cleanString(mergedExisting?.state || mergedExisting?.stateCountry || mergedExisting?.country),
    photoUrl: contact.photoUrl || cleanString(mergedExisting?.photoUrl),
    photoKey: contact.photoKey || cleanString(mergedExisting?.photoKey),
    photoOriginalName: contact.photoOriginalName || cleanString(mergedExisting?.photoOriginalName),
    photoUploadedAt: contact.photoUploadedAt || cleanString(mergedExisting?.photoUploadedAt),
    companyLogoUrl: contact.companyLogoUrl || cleanString(mergedExisting?.companyLogoUrl),
    companyLogoKey: contact.companyLogoKey || cleanString(mergedExisting?.companyLogoKey),
    companyLogoOriginalName: contact.companyLogoOriginalName || cleanString(mergedExisting?.companyLogoOriginalName),
    companyLogoUploadedAt: contact.companyLogoUploadedAt || cleanString(mergedExisting?.companyLogoUploadedAt),
    source: cleanString(mergedExisting?.source) || contact.source,
    createdAt: cleanString(mergedExisting?.createdAt) || now,
    events: mergeContactEvents(mergedExisting?.events, type, registration, now)
  });
  if (linkedinAliasKey && linkedinAliasKey !== emailContactKey && linkedinExisting) {
    await deleteSetupRecord(env, linkedinAliasKey);
  }

  for (const key of [...new Set(companyKeys)]) {
    const existing = await readSetupJson(env, key);
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

    await writeSetupJson(env, key, {
      ...(existing || {}),
      organizationName: cleanString(existing?.organizationName || existing?.company || company),
      company,
      companySlug,
      companyLogoUrl: contact.companyLogoUrl || cleanString(existing?.companyLogoUrl),
      companyLogoKey: contact.companyLogoKey || cleanString(existing?.companyLogoKey),
      companyLogoOriginalName: contact.companyLogoOriginalName || cleanString(existing?.companyLogoOriginalName),
      companyLogoUploadedAt: contact.companyLogoUploadedAt || cleanString(existing?.companyLogoUploadedAt),
      contacts: [...contactMap.values()],
      updatedAt: now,
      updatedBy
    });
  }

  return {
    contactId: email,
    contactKey: emailContactKey,
    ...(companySlug ? {
      companyKey,
      profileKey: type === "partner" ? partnerCompanyKey : companyKey
    } : {})
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
  if (!env.MOJO_SUMMITS_SETUP_STATE && !crmD1Available(env)) {
    return json({ error: "Registration invite storage is not configured." }, { status: 500 });
  }
  if (!env.MOJO_SUMMITS_STORAGE && !crmD1Available(env)) {
    return json({ error: "Registration storage is not configured." }, { status: 500 });
  }

  const { payload, photoFile, companyLogoFile } = await readRegistrationRequest(request, type);
  let registration = normalizeRegistrationForType(type, cleanPayload(payload, type));
  registration = await applyServerPhoneVerification(env, registration);
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

    const invite = inviteValidation.invite || {};
    const showError = registrationShowError(type, registration, invite);
    if (showError) {
      await writeRegistrationDebug(env, type, "rejected", {
        ...debugBase,
        stage: "show-selection",
        error: showError
      });
      return json({ error: showError }, { status: 400 });
    }
    const photoRequired = requiresRegistrationPhoto(registration, invite);
    if (photoRequired || hasRegistrationPhotoFile(photoFile)) {
      const photoError = validateRegistrationPhoto(photoFile);
      if (photoError) {
        await writeRegistrationDebug(env, type, "rejected", {
          ...debugBase,
          stage: "photo-validation",
          error: photoError
        });
        return json({ error: photoError }, { status: 400 });
      }
    }
    if (hasRegistrationCompanyLogoFile(companyLogoFile)) {
      const logoError = validateRegistrationCompanyLogo(companyLogoFile);
      if (logoError) {
        await writeRegistrationDebug(env, type, "rejected", {
          ...debugBase,
          stage: "company-logo-validation",
          error: logoError
        });
        return json({ error: logoError }, { status: 400 });
      }
    }
    const selectedShow = resolveRegistrationShow(registration, invite);

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const eventKey = cleanString(invite.eventSlug || invite.eventName || registration.eventSlug || registration.eventName);
    const record = {
      ...registration,
      ...invite,
      ...selectedShow,
      eventId: selectedShow.eventShowId && eventKey
        ? `${eventKey}:${selectedShow.eventShowId}`
        : cleanString(invite.eventId || registration.eventId || eventKey),
      id,
      createdAt,
      source: config.source,
      crmType: config.crmType,
      crmStatus: "registered",
      crmNotes: "",
      crmUpdatedAt: "",
      crmUpdatedBy: ""
    };
    const photoRefs = hasRegistrationPhotoFile(photoFile)
      ? await storeRegistrationPhoto(env, type, record, photoFile)
      : {};
    const logoRefs = hasRegistrationCompanyLogoFile(companyLogoFile)
      ? await storeRegistrationCompanyLogo(env, type, record, companyLogoFile)
      : {};
    Object.assign(record, photoRefs, logoRefs);
    const accessRecord = await registrationWithVirtualEventAccess(env, record);
    const contactRefs = {
      ...contactRefsForRegistration(type, accessRecord),
      ...(crmD1Available(env) ? await upsertRegistrationContact(env, type, accessRecord, config).catch(() => ({})) : {})
    };
    const storedRecord = {
      ...accessRecord,
      ...contactRefs
    };
    const d1RegistrationKey = await writeD1Registration(env, type, storedRecord, config);
    const r2RegistrationKey = crmD1Primary(env) ? null : await writeR2Registration(env, type, storedRecord);
    const registrationKey = d1RegistrationKey || r2RegistrationKey;
    const inviteUsageKey = await writeInviteUsage(env, type, registration.inviteCode, storedRecord);
    const kvRefs = await mirrorRegistrationToKv(env, type, storedRecord, config).catch(() => ({}));
    const registrationKeys = [d1RegistrationKey, r2RegistrationKey, kvRefs.kvRegistrationKey].filter(Boolean);
    const confirmationEmail = await sendRegistrationConfirmation(env, type, storedRecord).catch((error) => ({
          attempted: true,
          sent: false,
          error: cleanString(error?.message || "Registration confirmation email failed.")
        }));
    const staffNotificationEmail = await sendStaffRegistrationNotification(env, type, storedRecord).catch((error) => ({
      attempted: true,
      sent: false,
      error: cleanString(error?.message || "Staff registration notification email failed.")
    }));
    await writeRegistrationDebug(env, type, "stored", {
      ...debugBase,
      ...storedRecord,
      stage: "complete",
      registrationKeys,
      inviteUsageKey,
      confirmationEmail,
      staffNotificationEmail
    });

    return json({
      ok: true,
      id,
      createdAt,
      storage: d1RegistrationKey ? "d1" : "r2",
      confirmationEmail,
      staffNotificationEmail
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

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

import {
  createUser,
  getUserByEmail,
  updateUser
} from "../_auth.js";
import {
  readAccessConfig,
  writeAccessConfig
} from "../_access-control.js";
import {
  upsertRegistrationContact
} from "../_registration-crm.js";

const registrantTypes = {
  contacts: {
    label: "Contacts",
    section: "contacts",
    crmType: "contact",
    crmPrefix: "crm:contact:",
    legacyPrefix: "",
    csvFilename: "mojo-ai-summits-contacts.csv"
  },
  member: {
    label: "Member",
    section: "member-registrants",
    crmType: "member-registrant",
    crmPrefix: "crm:member-registrant:",
    legacyPrefix: "member-registration:",
    csvFilename: "mojo-ai-summits-member-registrants.csv"
  },
  guest: {
    label: "Guest",
    section: "guest-registrants",
    crmType: "guest-registrant",
    crmPrefix: "crm:guest-registrant:",
    legacyPrefix: "guest-registration:",
    csvFilename: "mojo-ai-summits-guest-registrants.csv"
  },
  partner: {
    label: "Partner",
    section: "partner-registrants",
    crmType: "partner-registrant",
    crmPrefix: "crm:partner-registrant:",
    legacyPrefix: "partner-registration:",
    csvFilename: "mojo-ai-summits-partner-registrants.csv"
  }
};

const EVENT_INDEX_KEY = "event-playbooks:index";
const REGISTRATION_INVITE_PREFIXES = {
  member: "crm:member-invite-code:",
  guest: "crm:guest-invite-code:"
};
const PARTNER_INVITE_PREFIX = "crm:partner-invite-code:";
const REGISTRATION_DEBUG_PREFIX = "crm:registration-debug:";
const PHONE_VERIFICATION_DEBUG_PREFIX = "crm:phone-verification-debug:";
const R2_REGISTRATION_PREFIX = "crm/registrations";
const OVERFLOW_REGISTRATION_PREFIX = "crm-overflow/registrations";
const CONTACT_PHOTO_PREFIX = "crm/contact-photos";
const DEFAULT_UPCOMING_EVENTS = [
  {
    slug: "ai-executive-readiness",
    title: "AI Executive Readiness",
    date: "Friday, September 4, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-data-readiness-and-knowledge-strategy",
    title: "AI Data Readiness and Knowledge Strategy",
    date: "Friday, September 18, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-use-cases-that-survive-finance",
    title: "AI Use Cases That Survive Finance",
    date: "Friday, September 25, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-agents-automation-and-human-handoffs",
    title: "AI Agents, Automation, and Human Handoffs",
    date: "Friday, October 9, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-integration-and-workflow",
    title: "AI Integration and Workflow",
    date: "Friday, October 16, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-vendor-strategy-and-platform-decisions",
    title: "AI Vendor Strategy and Platform Decisions",
    date: "Friday, October 30, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-security-governance-and-trust",
    title: "AI Security, Governance, and Trust",
    date: "Friday, November 6, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-workforce-talent-and-change-adoption",
    title: "AI Workforce, Talent, and Change Adoption",
    date: "Friday, November 20, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-operating-model-for-2027",
    title: "AI Operating Model for 2027",
    date: "Friday, November 27, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-budgeting-and-investment-priorities",
    title: "AI Budgeting and Investment Priorities",
    date: "Friday, December 4, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-workforce-readiness-and-change-leadership",
    title: "AI Workforce Readiness and Change Leadership",
    date: "Friday, December 18, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-executive-operating-agenda-for-2027",
    title: "AI Executive Operating Agenda for 2027",
    date: "Friday, January 8, 2027",
    format: "Virtual"
  },
  {
    slug: "dallas-2027",
    title: "Dallas 2027 Summit",
    date: "January 2027",
    format: "In person"
  }
];
const allowedStatuses = new Set(["new", "contacted", "confirmed", "accepted", "waitlist", "declined", "bad-fit"]);
const allowedLifecycleStages = new Set(["prospect", "invited", "registered", "attended", "no-show", "member-candidate", "member", "partner-candidate", "partner", "inactive", "do-not-contact"]);
const allowedRegistrationStatuses = new Set(["invited", "opened", "started", "confirmed", "declined", "canceled", "waitlisted"]);
const allowedStrategicRoles = new Set(["attendee", "speaker", "moderator", "roundtable-leader", "research-contributor", "sponsor-representative", "partner"]);
const allowedNextActions = new Set(["none", "call", "send-invitation", "confirm-role", "follow-up", "introduce", "schedule-call", "send-brief", "membership-outreach", "partner-outreach"]);
const allowedExecutiveFunctions = new Set(["", "ceo", "finance", "operations", "technology", "security", "ai-data", "strategy", "marketing-sales", "hr-people", "legal-compliance", "other"]);
const allowedCompanySizes = new Set(["", "1-50", "51-200", "201-1000", "1001-5000", "5001-10000", "10000-plus"]);
const allowedOrganizationTypes = new Set(["", "enterprise", "vendor-provider", "investor", "nonprofit", "government", "partner", "media", "other"]);
const allowedEmailPermissions = new Set(["unknown", "opted-in", "transactional-only", "opted-out"]);
const allowedActivityTypes = new Set(["note", "call", "email", "meeting", "sms", "follow-up", "qualification"]);
const allowedTopicTracks = new Set([
  "ai-strategy",
  "executive-readiness",
  "data-readiness",
  "ai-use-cases",
  "agents-automation",
  "workflow-integration",
  "vendor-strategy",
  "security-governance",
  "workforce-adoption",
  "operating-model"
]);
const maxFieldLength = 2000;
const guestInviteEmailCc = ["angel@mojoaisummits.com", "scott@mojoaisummits.com"];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function requireCrmAccess(data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };
  if (data?.auth?.mode === "public") return { email: "public@mojoaisummits.com" };

  return {
    response: json({ error: "Sign in with a Mojo AI Summits account to use CRM." }, { status: 401 })
  };
}

function cleanString(value, max = maxFieldLength) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function safeFileSegment(value, fallback = "file") {
  const clean = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
  return clean || fallback;
}

function safeObjectKey(value) {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!key || key.includes("..") || key.includes("\\") || key.length > 1024) return "";
  return key;
}

function cleanType(value) {
  return registrantTypes[value] ? value : "member";
}

function cleanAllowed(value, allowed, fallback = "") {
  const cleaned = cleanString(value, 120).toLowerCase();
  return allowed.has(cleaned) ? cleaned : fallback;
}

function splitName(name = "") {
  const parts = cleanString(name, 240).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] };
}

function cleanTopicTracks(value) {
  const raw = Array.isArray(value) ? value : cleanString(value, 800).split(",");
  return raw
    .map((item) => cleanAllowed(item, allowedTopicTracks, ""))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 12);
}

function normalizeActivity(entry = {}) {
  return {
    id: cleanString(entry.id, 120) || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: cleanString(entry.createdAt) || new Date().toISOString(),
    type: cleanAllowed(entry.type, allowedActivityTypes, "note"),
    owner: cleanString(entry.owner, 180),
    text: cleanString(entry.text || entry.note || entry.body),
    nextAction: cleanAllowed(entry.nextAction, allowedNextActions, ""),
    dueDate: cleanString(entry.dueDate, 40)
  };
}

function cleanCode(value) {
  return cleanString(value).replace(/\D/g, "").slice(0, 6);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(value).toLowerCase());
}

function cleanEmailList(values = [], exclude = []) {
  const excluded = new Set(exclude.map((value) => cleanString(value).toLowerCase()).filter(Boolean));
  const seen = new Set();
  return values
    .map((value) => cleanString(value, 240).toLowerCase())
    .filter((value) => isEmail(value) && !excluded.has(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function invitePersonName(record = {}) {
  const name = cleanString(record?.intendedGuestName || record?.invitedName || record?.guestName);
  return isEmail(name) ? "" : name;
}

function invitePersonEmail(record = {}) {
  const email = cleanString(record?.intendedGuestEmail || record?.invitedEmail || record?.guestEmail).toLowerCase();
  if (isEmail(email)) return email;
  const name = cleanString(record?.intendedGuestName || record?.invitedName || record?.guestName).toLowerCase();
  return isEmail(name) ? name : "";
}

function cleanInviteType(value) {
  return value === "member" ? "member" : "guest";
}

function cleanGuestRegistrationType(value) {
  return {
    "featured-guest": "featured-guest",
    presenter: "presenter",
    roundtable: "roundtable-leader",
    "roundtable-leader": "roundtable-leader",
    guest: "guest"
  }[cleanString(value, 80).toLowerCase()] || "guest";
}

function randomInviteCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

function randomMemberPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*?";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeRecord(key, record) {
  const createdAt = cleanString(record?.createdAt) || key.split(":").slice(-2, -1)[0] || "";
  return {
    key,
    id: cleanString(record?.id) || key,
    createdAt,
    name: cleanString(record?.name),
    company: cleanString(record?.company),
    title: cleanString(record?.title),
    industry: cleanString(record?.industry),
    email: cleanString(record?.email).toLowerCase(),
    phone: cleanString(record?.phone),
    inviteCode: cleanString(record?.inviteCode),
    phoneVerificationStatus: cleanString(record?.phoneVerificationStatus) || "unverified",
    eventId: cleanString(record?.eventId),
    eventSlug: cleanString(record?.eventSlug),
    eventName: cleanString(record?.eventName),
    eventDate: cleanString(record?.eventDate),
    intendedGuestName: invitePersonName(record),
    intendedGuestEmail: invitePersonEmail(record),
    invitedEmail: invitePersonEmail(record),
    invitedName: invitePersonName(record),
    guestRegistrationType: cleanGuestRegistrationType(record?.guestRegistrationType || record?.registrationRole),
    registrationRole: cleanGuestRegistrationType(record?.registrationRole || record?.guestRegistrationType),
    partnerCompany: cleanString(record?.partnerCompany),
    partnerTier: cleanString(record?.partnerTier),
    partnerPassword: cleanString(record?.partnerPassword, 120),
    partnerPasswordGeneratedAt: cleanString(record?.partnerPasswordGeneratedAt),
    partnerPasswordGeneratedBy: cleanString(record?.partnerPasswordGeneratedBy),
    memberTier: cleanString(record?.memberTier) || "Fellow",
    memberStatus: cleanString(record?.memberStatus),
    memberPassword: cleanString(record?.memberPassword, 120),
    memberPasswordGeneratedAt: cleanString(record?.memberPasswordGeneratedAt),
    memberPasswordGeneratedBy: cleanString(record?.memberPasswordGeneratedBy),
    acceptedAt: cleanString(record?.acceptedAt),
    isPresenter: Boolean(record?.isPresenter),
    isRoundtableLeader: Boolean(record?.isRoundtableLeader),
    isFeaturedGuest: Boolean(record?.isFeaturedGuest),
    isFeaturedMember: Boolean(record?.isFeaturedMember),
    publicationUseName: Boolean(record?.publicationUseName),
    publicationUseCompany: Boolean(record?.publicationUseCompany),
    crmStatus: allowedStatuses.has(record?.crmStatus) ? record.crmStatus : "new",
    crmNotes: cleanString(record?.crmNotes),
    crmUpdatedAt: cleanString(record?.crmUpdatedAt),
    crmUpdatedBy: cleanString(record?.crmUpdatedBy),
    manualPartner: record?.manualPartner === true,
    source: cleanString(record?.source)
  };
}

function normalizeContactRecord(key, record = {}) {
  const events = Array.isArray(record.events) ? record.events : [];
  const activity = (Array.isArray(record.activity) ? record.activity : [])
    .map(normalizeActivity)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const sortedEvents = [...events].sort((a, b) => {
    const left = cleanString(b.eventDate || b.registeredAt || b.updatedAt);
    const right = cleanString(a.eventDate || a.registeredAt || a.updatedAt);
    return left.localeCompare(right);
  });
  const latestEvent = sortedEvents[0] || {};
  const email = cleanString(record.email || key.replace(/^crm:contact:/, "")).toLowerCase();
  const contactStatus = contactStatusFromRegistration(latestEvent.registrationType || record.registrationType || record.source);
  const fullName = cleanString(record.name) || email;
  const fallbackName = splitName(fullName);
  return {
    key,
    id: email,
    createdAt: cleanString(record.createdAt),
    updatedAt: cleanString(record.updatedAt),
    name: fullName,
    firstName: cleanString(record.firstName || fallbackName.firstName, 120),
    lastName: cleanString(record.lastName || fallbackName.lastName, 120),
    company: cleanString(record.company),
    title: cleanString(record.title),
    photoUrl: cleanString(record.photoUrl || record.photoURL || record.photo, 500),
    photoKey: safeObjectKey(record.photoKey),
    bio: cleanString(record.bio || record.biography, 4000),
    executiveFunction: cleanAllowed(record.executiveFunction, allowedExecutiveFunctions, ""),
    industry: cleanString(record.industry),
    companySize: cleanAllowed(record.companySize, allowedCompanySizes, ""),
    organizationType: cleanAllowed(record.organizationType, allowedOrganizationTypes, ""),
    city: cleanString(record.city, 120),
    state: cleanString(record.state, 80),
    timeZone: cleanString(record.timeZone, 120),
    location: cleanString(record.location, 180) || [cleanString(record.city, 120), cleanString(record.state, 80)].filter(Boolean).join(", "),
    email,
    phone: cleanString(record.phone),
    source: cleanString(record.source),
    invitationSource: cleanString(record.invitationSource || record.source, 180),
    relationshipOwner: cleanString(record.relationshipOwner, 180),
    lifecycleStage: cleanAllowed(record.lifecycleStage, allowedLifecycleStages, latestEvent.registrationType ? "registered" : "prospect"),
    nextAction: cleanAllowed(record.nextAction, allowedNextActions, "none"),
    nextActionDueDate: cleanString(record.nextActionDueDate || record.dueDate, 40),
    lastContactDate: cleanString(record.lastContactDate, 40),
    emailPermission: cleanAllowed(record.emailPermission, allowedEmailPermissions, "unknown"),
    emailOptOut: record.emailOptOut === true || cleanAllowed(record.emailPermission, allowedEmailPermissions, "unknown") === "opted-out",
    topicInterests: cleanTopicTracks(record.topicInterests || record.topicTrackInterest),
    registrationId: cleanString(record.registrationId),
    registrationType: cleanString(record.registrationType),
    crmNotes: cleanString(record.crmNotes),
    activity,
    latestActivityAt: cleanString(activity[0]?.createdAt),
    crmUpdatedAt: cleanString(record.crmUpdatedAt),
    crmUpdatedBy: cleanString(record.crmUpdatedBy),
    contactStatus,
    publicationCount: Number.isFinite(Number(record.publicationCount)) ? Number(record.publicationCount) : 0,
    companyKey: cleanString(record.companyKey),
    companySlug: cleanString(record.companySlug),
    profileKey: cleanString(record.profileKey),
    eventCount: sortedEvents.length,
    latestEventName: cleanString(latestEvent.eventName || latestEvent.eventId || latestEvent.inviteCode),
    latestEventDate: cleanString(latestEvent.eventDate),
    latestRegisteredAt: cleanString(latestEvent.registeredAt),
    attendedCount: sortedEvents.filter((event) => event?.attended === true).length,
    events: sortedEvents.map((event) => ({
      id: cleanString(event?.id || event?.eventId || event?.registrationId),
      eventId: cleanString(event?.eventId),
      eventSlug: cleanString(event?.eventSlug),
      eventName: cleanString(event?.eventName),
      eventDate: cleanString(event?.eventDate),
      intendedGuestName: cleanString(event?.intendedGuestName || event?.invitedName || event?.guestName),
      invitedName: cleanString(event?.invitedName || event?.intendedGuestName || event?.guestName),
      guestRegistrationType: cleanGuestRegistrationType(event?.guestRegistrationType || event?.registrationRole),
      registrationRole: cleanGuestRegistrationType(event?.registrationRole || event?.guestRegistrationType),
      inviteCode: cleanString(event?.inviteCode),
      registrationId: cleanString(event?.registrationId),
      registrationType: cleanString(event?.registrationType),
      role: cleanString(event?.role),
      strategicRole: cleanAllowed(event?.strategicRole || event?.role || event?.registrationRole, allowedStrategicRoles, "attendee"),
      registrationStatus: cleanAllowed(event?.registrationStatus || event?.status || event?.crmStatus, allowedRegistrationStatuses, "confirmed"),
      status: cleanAllowed(event?.status || event?.registrationStatus || event?.crmStatus, allowedRegistrationStatuses, "confirmed"),
      attended: event?.attended === true,
      attendanceStatus: cleanString(event?.attendanceStatus) || "not_recorded",
      registeredAt: cleanString(event?.registeredAt)
    }))
  };
}

function contactStatusFromRegistration(value) {
  const normalized = cleanString(value).toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("partner member")) return "partner member";
  if (normalized.includes("partner")) return "partner guest";
  if (normalized.includes("member")) return "member";
  return "guest";
}

async function listKeys(env, prefix) {
  const keys = [];
  let cursor;

  do {
    const result = await env.MOJO_SUMMITS_SETUP_STATE.list({
      prefix,
      cursor,
      limit: 1000
    });
    keys.push(...result.keys.map((entry) => entry.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

async function readRecords(env, keys) {
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeRecord(key, record) : null;
    })
  );

  return records.filter(Boolean);
}

async function readContactRecords(env, keys) {
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeContactRecord(key, record) : null;
    })
  );

  return records.filter(Boolean);
}

async function r2Registrants(env, type = "member") {
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get) return [];
  const keys = [];
  const prefixes = [
    `${R2_REGISTRATION_PREFIX}/${cleanType(type)}/`,
    `${OVERFLOW_REGISTRATION_PREFIX}/${cleanType(type)}/`
  ];

  for (const prefix of prefixes) {
    let cursor;
    do {
      const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
      if (!result) break;
      keys.push(...(result.objects || []).map((object) => object.key));
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }

  const records = await Promise.all(
    keys.map(async (key) => {
      const object = await env.MOJO_SUMMITS_STORAGE.get(key).catch(() => null);
      const record = object ? await object.json().catch(() => null) : null;
      return record ? normalizeRecord(key, {
        ...record,
        source: record.source || (key.startsWith(OVERFLOW_REGISTRATION_PREFIX) ? `${cleanType(type)}-registration-overflow` : `${cleanType(type)}-registration`)
      }) : null;
    })
  );

  return records.filter(Boolean);
}

async function deleteR2RegistrantsForEmail(env, email) {
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get || !env.MOJO_SUMMITS_STORAGE?.delete) return [];
  const deletedKeys = [];
  for (const type of ["guest", "member", "partner"]) {
    const prefixes = [
      `${R2_REGISTRATION_PREFIX}/${type}/`,
      `${OVERFLOW_REGISTRATION_PREFIX}/${type}/`
    ];
    for (const prefix of prefixes) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (cleanString(record?.email).toLowerCase() !== email) continue;
          await env.MOJO_SUMMITS_STORAGE.delete(object.key);
          deletedKeys.push(object.key);
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }
  return deletedKeys;
}

async function registrants(env, type = "member") {
  const config = registrantTypes[cleanType(type)];
  const crmKeys = await listKeys(env, config.crmPrefix);
  const crmRows = await readRecords(env, crmKeys);
  const ids = new Set(crmRows.map((row) => row.id));

  const legacyKeys = await listKeys(env, config.legacyPrefix);
  const legacyRows = (await readRecords(env, legacyKeys)).filter((row) => !ids.has(row.id));
  for (const row of legacyRows) ids.add(row.id);
  const r2Rows = (await r2Registrants(env, type)).filter((row) => !ids.has(row.id));

  return [...crmRows, ...legacyRows, ...r2Rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function roleLabelForRow(row = {}, type = "") {
  const role = cleanGuestRegistrationType(row.guestRegistrationType || row.registrationRole);
  if (type === "partner") return "Partner Guest";
  if (type === "member") return row.isFeaturedMember ? "Featured Member" : "Member";
  if (role === "presenter" || row.isPresenter) return "Presenter";
  if (role === "roundtable-leader" || row.isRoundtableLeader) return "Round Table Leader";
  if (role === "featured-guest" || row.isFeaturedGuest) return "Featured Guest";
  return "Guest";
}

function contactFromRegistrant(row = {}, type = "") {
  const email = cleanString(row.email).toLowerCase();
  if (!email) return null;
  const company = cleanString(row.partnerCompany || row.company);
  if (type === "partner" && row.manualPartner) {
    return normalizeContactRecord(`crm:contact:${email}`, {
      id: email,
      email,
      name: cleanString(row.name) || email,
      company,
      title: cleanString(row.title),
      industry: cleanString(row.industry),
      phone: cleanString(row.phone),
      source: cleanString(row.source || "manual-partner"),
      registrationId: cleanString(row.id),
      registrationType: "partner",
      createdAt: cleanString(row.createdAt),
      updatedAt: cleanString(row.crmUpdatedAt || row.updatedAt || row.createdAt),
      crmNotes: cleanString(row.crmNotes),
      crmUpdatedAt: cleanString(row.crmUpdatedAt),
      crmUpdatedBy: cleanString(row.crmUpdatedBy),
      events: []
    });
  }

  const eventId = cleanString(row.eventId || row.eventSlug || row.eventName || row.inviteCode || row.id);
  return normalizeContactRecord(`crm:contact:${email}`, {
    id: email,
    email,
    name: cleanString(row.name) || email,
    company,
    title: cleanString(row.title),
    industry: cleanString(row.industry),
    phone: cleanString(row.phone),
    source: cleanString(row.source || `${type}-registration`),
    registrationId: cleanString(row.id),
    registrationType: cleanString(type),
    createdAt: cleanString(row.createdAt),
    updatedAt: cleanString(row.createdAt),
    events: [{
      id: eventId,
      eventId,
      eventSlug: cleanString(row.eventSlug),
      eventName: cleanString(row.eventName) || eventId || "Registration",
      eventDate: cleanString(row.eventDate),
      inviteCode: cleanString(row.inviteCode),
      registrationId: cleanString(row.id),
      registrationType: cleanString(type),
      guestRegistrationType: cleanGuestRegistrationType(row.guestRegistrationType || row.registrationRole),
      registrationRole: cleanGuestRegistrationType(row.registrationRole || row.guestRegistrationType),
      role: roleLabelForRow(row, type),
      registeredAt: cleanString(row.createdAt),
      attended: false,
      attendanceStatus: "not_recorded"
    }]
  });
}

async function derivedContactRows(env) {
  const rows = (await Promise.all(["member", "guest", "partner"].map(async (type) => {
    const records = await registrants(env, type);
    return records.map((row) => contactFromRegistrant(row, type));
  }))).flat().filter(Boolean);

  return rows;
}

function mergeContactRows(storedRows, derivedRows) {
  const byEmail = new Map();
  for (const row of [...derivedRows, ...storedRows]) {
    const email = cleanString(row.email).toLowerCase();
    if (!email) continue;
    const previous = byEmail.get(email);
    if (!previous) {
      byEmail.set(email, row);
      continue;
    }
    const eventMap = new Map();
    for (const event of [...(previous.events || []), ...(row.events || [])]) {
      const key = contactEventIdentity(event);
      if (!key) continue;
      eventMap.set(key, {
        ...(eventMap.get(key) || {}),
        ...event
      });
    }
    byEmail.set(email, normalizeContactRecord(`crm:contact:${email}`, {
      ...previous,
      ...row,
      name: cleanString(row.name) || cleanString(previous.name) || email,
      firstName: cleanString(row.firstName) || cleanString(previous.firstName),
      lastName: cleanString(row.lastName) || cleanString(previous.lastName),
      company: cleanString(row.company) || cleanString(previous.company),
      title: cleanString(row.title) || cleanString(previous.title),
      photoUrl: cleanString(row.photoUrl) || cleanString(previous.photoUrl),
      photoKey: safeObjectKey(row.photoKey) || safeObjectKey(previous.photoKey),
      bio: cleanString(row.bio) || cleanString(previous.bio),
      executiveFunction: cleanString(row.executiveFunction) || cleanString(previous.executiveFunction),
      industry: cleanString(row.industry) || cleanString(previous.industry),
      companySize: cleanString(row.companySize) || cleanString(previous.companySize),
      organizationType: cleanString(row.organizationType) || cleanString(previous.organizationType),
      city: cleanString(row.city) || cleanString(previous.city),
      state: cleanString(row.state) || cleanString(previous.state),
      timeZone: cleanString(row.timeZone) || cleanString(previous.timeZone),
      location: cleanString(row.location) || cleanString(previous.location),
      phone: cleanString(row.phone) || cleanString(previous.phone),
      invitationSource: cleanString(row.invitationSource) || cleanString(previous.invitationSource),
      relationshipOwner: cleanString(row.relationshipOwner) || cleanString(previous.relationshipOwner),
      lifecycleStage: cleanString(row.lifecycleStage) || cleanString(previous.lifecycleStage),
      nextAction: cleanString(row.nextAction) || cleanString(previous.nextAction),
      nextActionDueDate: cleanString(row.nextActionDueDate) || cleanString(previous.nextActionDueDate),
      lastContactDate: cleanString(row.lastContactDate) || cleanString(previous.lastContactDate),
      emailPermission: cleanString(row.emailPermission) || cleanString(previous.emailPermission),
      emailOptOut: row.emailOptOut === true || previous.emailOptOut === true,
      topicInterests: Array.isArray(row.topicInterests) && row.topicInterests.length ? row.topicInterests : previous.topicInterests,
      activity: Array.isArray(row.activity) && row.activity.length ? row.activity : previous.activity,
      crmNotes: cleanString(row.crmNotes) || cleanString(previous.crmNotes),
      events: [...eventMap.values()]
    }));
  }
  return [...byEmail.values()];
}

async function contacts(env) {
  const keys = await listKeys(env, "crm:contact:");
  const rows = mergeContactRows(await readContactRecords(env, keys), await derivedContactRows(env));
  return rows.sort((a, b) => {
    const left = cleanString(b.updatedAt || b.latestRegisteredAt || b.createdAt);
    const right = cleanString(a.updatedAt || a.latestRegisteredAt || a.createdAt);
    return left.localeCompare(right);
  });
}

function normalizeDebugEntry(key, record = {}) {
  return {
    key,
    id: cleanString(record.id) || key,
    createdAt: cleanString(record.createdAt) || key.split(":").slice(-2, -1)[0] || "",
    type: cleanString(record.type),
    status: cleanString(record.status),
    stage: cleanString(record.stage),
    name: cleanString(record.name),
    email: cleanString(record.email).toLowerCase(),
    company: cleanString(record.company),
    inviteCode: cleanString(record.inviteCode),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    contactKey: cleanString(record.contactKey),
    action: cleanString(record.action),
    phone: cleanString(record.phone),
    provider: cleanString(record.provider),
    sendPath: cleanString(record.sendPath),
    messageId: cleanString(record.messageId),
    config: record.config && typeof record.config === "object" ? record.config : null,
    registrationKeys: Array.isArray(record.registrationKeys)
      ? record.registrationKeys.map((entry) => cleanString(entry)).filter(Boolean)
      : [],
    error: cleanString(record.error)
  };
}

async function readRawRecord(env, key) {
  return env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
}

async function registrationDiagnostics(env) {
  const generatedAt = new Date().toISOString();
  const contactRows = await contacts(env);
  const contactEmails = new Set(contactRows.map((row) => row.email).filter(Boolean));
  const registrationRows = [];
  const counts = {
    contacts: contactRows.length,
    guest: 0,
    member: 0,
    partner: 0,
    missingContacts: 0,
    debugAttempts: 0
  };

  for (const type of ["guest", "member", "partner"]) {
    const rows = await registrants(env, type);
    const seenRows = new Set();
    for (const row of rows) {
      const rowIdentity = row.id || `${row.email}:${row.createdAt}:${row.inviteCode}`;
      if (seenRows.has(rowIdentity)) continue;
      seenRows.add(rowIdentity);
      const expectedContactKey = row.email ? `${registrantTypes.contacts.crmPrefix}${row.email}` : "";
      const contactExists = row.email ? contactEmails.has(row.email) : false;
      registrationRows.push({
        key: row.key,
        type,
        id: row.id,
        createdAt: row.createdAt,
        name: row.name,
        email: row.email,
        company: row.company,
        title: row.title,
        phone: row.phone,
        inviteCode: row.inviteCode,
        eventName: row.eventName,
        eventDate: row.eventDate,
        contactKey: expectedContactKey,
        contactExists
      });
    }
    counts[type] = seenRows.size;
  }

  registrationRows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const missingContacts = registrationRows.filter((row) => row.email && !row.contactExists);
  counts.missingContacts = missingContacts.length;

  const debugKeys = [
    ...(await listKeys(env, REGISTRATION_DEBUG_PREFIX)),
    ...(await listKeys(env, PHONE_VERIFICATION_DEBUG_PREFIX))
  ];
  const debugAttempts = (await Promise.all(
    debugKeys.map(async (key) => {
      const record = await readRawRecord(env, key);
      return record ? normalizeDebugEntry(key, record) : null;
    })
  ))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  counts.debugAttempts = debugAttempts.length;

  return {
    ok: true,
    generatedAt,
    counts,
    latestRegistrations: registrationRows.slice(0, 40),
    missingContacts: missingContacts.slice(0, 40),
    debugAttempts: debugAttempts.slice(0, 40)
  };
}

function summarize(rows) {
    return {
    total: rows.length,
    newCount: rows.filter((row) => row.crmStatus === "new").length,
    presenterCount: rows.filter((row) => row.isPresenter).length,
    roundtableLeaderCount: rows.filter((row) => row.isRoundtableLeader).length,
    pendingPhoneCount: rows.filter((row) => row.phoneVerificationStatus !== "verified").length
  };
}

function summarizeContacts(rows) {
  const eventSignupCount = rows.reduce((sum, row) => sum + (row.eventCount || 0), 0);
  const attendedEventCount = rows.reduce((sum, row) => sum + (row.attendedCount || 0), 0);
  return {
    total: rows.length,
    newCount: rows.filter((row) => row.eventCount > 0).length,
    presenterCount: eventSignupCount,
    roundtableLeaderCount: attendedEventCount,
    eventSignupCount,
    attendedEventCount,
    pendingPhoneCount: rows.filter((row) => !row.phone).length
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function crmRecordKey(row, type = "member") {
  const config = registrantTypes[cleanType(type)];
  return row.key.startsWith(config.crmPrefix)
    ? row.key
    : `${config.crmPrefix}${row.createdAt || new Date().toISOString()}:${row.id}`;
}

async function ensureCrmRecord(env, row, type = "member") {
  const config = registrantTypes[cleanType(type)];
  const key = crmRecordKey(row, type);
  if (key === row.key) return { key, row };

  const next = {
    ...row,
    crmType: config.crmType
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(next));
  return { key, row: normalizeRecord(key, next) };
}

function normalizeInviteCode(key, record) {
  return {
    key,
    code: cleanCode(record?.code) || key.split(":").pop(),
    type: cleanString(record?.type) || "partner",
    status: cleanString(record?.status) || "active",
    eventId: cleanString(record?.eventId),
    eventSlug: cleanString(record?.eventSlug),
    eventName: cleanString(record?.eventName),
    eventDate: cleanString(record?.eventDate),
    intendedGuestName: invitePersonName(record),
    intendedGuestEmail: invitePersonEmail(record),
    invitedEmail: invitePersonEmail(record),
    invitedName: invitePersonName(record),
    guestName: invitePersonName(record),
    guestRegistrationType: cleanGuestRegistrationType(record?.guestRegistrationType || record?.registrationRole),
    registrationRole: cleanGuestRegistrationType(record?.registrationRole || record?.guestRegistrationType),
    partnerCompany: cleanString(record?.partnerCompany),
    partnerContactEmail: cleanString(record?.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(record?.partnerTier),
    createdAt: cleanString(record?.createdAt),
    createdBy: cleanString(record?.createdBy),
    usedAt: cleanString(record?.usedAt),
    usedBy: cleanString(record?.usedBy),
    usedByName: cleanString(record?.usedByName),
    usedByEmail: cleanString(record?.usedByEmail || record?.usedBy).toLowerCase(),
    usedFor: cleanString(record?.usedFor || record?.eventName),
    usedForDate: cleanString(record?.usedForDate || record?.eventDate),
    registrationId: cleanString(record?.registrationId)
  };
}

async function enrichInviteUsage(env, invites, types = ["member", "guest", "partner"]) {
  const rows = (await Promise.all(types.map((type) => registrants(env, type)))).flat();
  return invites.map((invite) => {
    const usedEmail = cleanString(invite.usedByEmail || invite.usedBy).toLowerCase();
    const row = rows.find((entry) =>
      (invite.registrationId && entry.id === invite.registrationId) ||
      (invite.code && entry.inviteCode === invite.code && (!usedEmail || entry.email === usedEmail))
    );
    return {
      ...invite,
      usedByName: cleanString(invite.usedByName || row?.name),
      usedByEmail: cleanString(invite.usedByEmail || row?.email || invite.usedBy).toLowerCase(),
      usedFor: cleanString(row?.eventName || invite.usedFor || invite.eventName),
      usedForDate: cleanString(row?.eventDate || invite.usedForDate || invite.eventDate)
    };
  });
}

async function partnerInviteCodes(env) {
  const keys = await listKeys(env, PARTNER_INVITE_PREFIX);
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeInviteCode(key, record) : null;
    })
  );
  const invites = rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return enrichInviteUsage(env, invites, ["partner"]);
}

async function registrationInviteCodes(env) {
  const entries = await Promise.all(
    Object.entries(REGISTRATION_INVITE_PREFIXES).map(async ([type, prefix]) => {
      const keys = await listKeys(env, prefix);
      return Promise.all(
        keys.map(async (key) => {
          const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
          return record ? normalizeInviteCode(key, { ...record, type: record.type || type }) : null;
        })
      );
    })
  );
  const invites = entries.flat().filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return enrichInviteUsage(env, invites, ["member", "guest"]);
}

function eventTime(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const exactDate = new Date(`${value}T12:00:00`).getTime();
  if (!Number.isNaN(exactDate)) return exactDate;
  const looseDate = new Date(value).getTime();
  return Number.isNaN(looseDate) ? Number.POSITIVE_INFINITY : looseDate;
}

async function upcomingEvents(env) {
  const stored = await env.MOJO_SUMMITS_SETUP_STATE.get(EVENT_INDEX_KEY, "json").catch(() => []);
  const rows = Array.isArray(stored) ? stored : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = rows
    .map((event) => ({
      slug: cleanString(event?.slug, 200),
      title: cleanString(event?.title, 240),
      date: cleanString(event?.date, 80),
      format: cleanString(event?.format, 80),
      updatedAt: cleanString(event?.updatedAt, 80)
    }))
    .filter((event) => event.slug && event.title);

  const bySlug = new Map(DEFAULT_UPCOMING_EVENTS.map((event) => [event.slug, { ...event, updatedAt: "" }]));
  for (const event of events) bySlug.set(event.slug, event);

  return [...bySlug.values()]
    .filter((event) => !event.date || eventTime(event.date) >= today.getTime())
    .sort((a, b) => eventTime(a.date) - eventTime(b.date) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function codeExists(env, code) {
  const keys = [
    `${PARTNER_INVITE_PREFIX}${code}`,
    `${REGISTRATION_INVITE_PREFIXES.guest}${code}`,
    `${REGISTRATION_INVITE_PREFIXES.member}${code}`,
    `partner-invite-code:${code}`,
    `guest-invite-code:${code}`,
    `member-invite-code:${code}`,
    `partner-invite:${code}`,
    `guest-invite:${code}`,
    `member-invite:${code}`
  ];
  for (const key of keys) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (record) return true;
  }
  return false;
}

async function createRegistrationInviteCode(env, payload = {}, actor = "") {
  const type = cleanInviteType(payload.type);
  let code = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomInviteCode();
    if (!(await codeExists(env, candidate))) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not generate a unique registration invite code.");

  const eventSlug = cleanString(payload.eventSlug, 200);
  const eventName = cleanString(payload.eventName, 240);
  const rawGuestName = cleanString(
    payload.intendedGuestName || payload.invitedName || payload.guestName || payload.name,
    240
  );
  const rawGuestEmail = cleanString(
    payload.intendedGuestEmail || payload.invitedEmail || payload.guestEmail || payload.email,
    240
  ).toLowerCase();
  const intendedGuestEmail = isEmail(rawGuestEmail)
    ? rawGuestEmail
    : isEmail(rawGuestName)
      ? rawGuestName.toLowerCase()
      : "";
  const intendedGuestName = isEmail(rawGuestName) ? "" : rawGuestName;
  const guestRegistrationType = cleanGuestRegistrationType(payload.guestRegistrationType || payload.registrationRole || payload.type);
  if (!eventSlug && !eventName) throw new Error("Select an event before generating an invite code.");

  const createdAt = new Date().toISOString();
  const record = {
    type,
    code,
    status: "active",
    eventId: cleanString(payload.eventId || eventSlug || eventName, 200),
    eventSlug,
    eventName,
    eventDate: cleanString(payload.eventDate, 120),
    intendedGuestName,
    intendedGuestEmail,
    invitedEmail: intendedGuestEmail,
    guestEmail: intendedGuestEmail,
    invitedName: intendedGuestName,
    guestName: intendedGuestName,
    guestRegistrationType,
    registrationRole: guestRegistrationType,
    createdAt,
    createdBy: actor
  };

  const key = `${REGISTRATION_INVITE_PREFIXES[type]}${code}`;
  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record));
  return normalizeInviteCode(key, record);
}

async function createPartnerInviteCode(env, payload = {}, actor = "") {
  let code = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomInviteCode();
    if (!(await codeExists(env, candidate))) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not generate a unique partner invite code.");

  const createdAt = new Date().toISOString();
  const record = {
    type: "partner",
    code,
    status: "active",
    eventId: cleanString(payload.eventId || payload.eventSlug || payload.eventName, 200),
    eventSlug: cleanString(payload.eventSlug, 200),
    eventName: cleanString(payload.eventName, 240),
    eventDate: cleanString(payload.eventDate, 120),
    partnerCompany: cleanString(payload.partnerCompany, 240),
    partnerContactEmail: cleanString(payload.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(payload.partnerTier, 120),
    createdAt,
    createdBy: actor
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(`${PARTNER_INVITE_PREFIX}${code}`, JSON.stringify(record));
  return normalizeInviteCode(`${PARTNER_INVITE_PREFIX}${code}`, record);
}

async function deleteInviteCode(env, payload = {}) {
  const type = cleanString(payload.type);
  const key = cleanString(payload.key, 300);
  const code = cleanCode(payload.code);
  const prefixes = type === "partner"
    ? [PARTNER_INVITE_PREFIX]
    : type === "member" || type === "guest"
      ? [REGISTRATION_INVITE_PREFIXES[type]]
      : [REGISTRATION_INVITE_PREFIXES.guest, REGISTRATION_INVITE_PREFIXES.member, PARTNER_INVITE_PREFIX];

  const candidates = [
    key,
    ...prefixes.map((prefix) => code ? `${prefix}${code}` : "")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(candidate, "json").catch(() => null);
    if (record) {
      await env.MOJO_SUMMITS_SETUP_STATE.delete(candidate);
      return { deleted: candidate };
    }
  }

  throw new Error("Invite link was not found.");
}

async function findInviteCodeRecord(env, payload = {}) {
  const type = cleanString(payload.type);
  const key = cleanString(payload.key, 300);
  const code = cleanCode(payload.code);
  const prefixes = type === "member" || type === "guest"
    ? [REGISTRATION_INVITE_PREFIXES[type]]
    : [REGISTRATION_INVITE_PREFIXES.guest, REGISTRATION_INVITE_PREFIXES.member];

  const candidates = [
    key,
    ...prefixes.map((prefix) => code ? `${prefix}${code}` : "")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(candidate, "json").catch(() => null);
    if (record) return normalizeInviteCode(candidate, record);
  }

  throw new Error("Invite link was not found.");
}

function inviteRegistrationUrl(origin, invite) {
  const path = invite.type === "member" ? "/member-registration/" : "/guest/";
  return `${origin}${path}?invite=${encodeURIComponent(invite.code || "")}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function inviteReminderFirstName(invite) {
  const name = cleanString(invite.intendedGuestName || invite.invitedName || invite.guestName, 240);
  if (!name) return "there";
  return name.split(/\s+/)[0];
}

function inviteReminderEventPhrase(eventName, eventDate) {
  return eventDate ? `Mojo AI Summit's ${eventName} for ${eventDate}` : `Mojo AI Summit's ${eventName}`;
}

function inviteReminderText({ firstName, eventName, eventDate, registrationUrl }) {
  return [
    `Hi ${firstName},`,
    "",
    `This is a friendly reminder to complete your registration for ${inviteReminderEventPhrase(eventName, eventDate)}.`,
    "",
    "Your invitation includes a personal registration link created specifically for you. Please use the link below to confirm your attendance:",
    "",
    registrationUrl,
    "",
    "We look forward to having you join us. If you have any trouble registering, please reply to this email for assistance.",
    "",
    "Best,",
    "",
    "Angel Mosley",
    "Program Director",
    "MOJO AI Summits",
    "Angel@mojoaisummits.com"
  ].join("\n");
}

function inviteReminderHtml({ firstName, eventName, eventDate, registrationUrl }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.6;font-size:15px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>This is a friendly reminder to complete your registration for ${escapeHtml(inviteReminderEventPhrase(eventName, eventDate))}.</p>
      <p>Your invitation includes a personal registration link created specifically for you. Please use the link below to confirm your attendance:</p>
      <p><a href="${escapeHtml(registrationUrl)}" style="color:#1656d9">${escapeHtml(registrationUrl)}</a></p>
      <p>We look forward to having you join us. If you have any trouble registering, please reply to this email for assistance.</p>
      <p>
        Best,<br>
        <br>
        Angel Mosley<br>
        Program Director<br>
        MOJO AI Summits<br>
        Angel@mojoaisummits.com
      </p>
    </div>
  `;
}

async function sendResendEmail(env, { to, subject, html, text, replyTo, cc = [] }) {
  const apiKey = cleanString(env.RESEND_API_KEY, 400);
  if (!apiKey) throw new Error("Resend is not configured (missing RESEND_API_KEY).");

  const from = cleanString(env.MOJO_RESEND_FROM, 200) || "Angel Mosley <angel@mojoaisummits.com>";
  const ccList = cleanEmailList(cc, [to]);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      ...(ccList.length ? { cc: ccList } : {}),
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Resend could not send the reminder email.");
  }

  return response.json().catch(() => ({}));
}

function inviteInvitationText({ firstName, eventName, eventDate, registrationUrl }) {
  return [
    `Hi ${firstName},`,
    "",
    `We're pleased to invite you to join us for ${inviteReminderEventPhrase(eventName, eventDate)}.`,
    "",
    "Please use your personal registration link below to review the event details and confirm your attendance:",
    "",
    registrationUrl,
    "",
    "This link is unique to you, so please do not forward or share it.",
    "",
    "We're looking forward to having you join us and be part of the conversation.",
    "",
    "Best,",
    "",
    "Angel Mosley",
    "Program Director",
    "MOJO AI Summits",
    "Angel@mojoaisummits.com"
  ].join("\n");
}

function inviteInvitationHtml({ firstName, eventName, eventDate, registrationUrl }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.6;font-size:15px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>We're pleased to invite you to join us for ${escapeHtml(inviteReminderEventPhrase(eventName, eventDate))}.</p>
      <p>Please use your personal registration link below to review the event details and confirm your attendance:</p>
      <p><a href="${escapeHtml(registrationUrl)}" style="color:#1656d9">${escapeHtml(registrationUrl)}</a></p>
      <p>This link is unique to you, so please do not forward or share it.</p>
      <p>We're looking forward to having you join us and be part of the conversation.</p>
      <p>
        Best,<br>
        <br>
        Angel Mosley<br>
        Program Director<br>
        MOJO AI Summits<br>
        Angel@mojoaisummits.com
      </p>
    </div>
  `;
}

async function sendInviteInvitationEmail(env, invite, origin = "") {
  const toEmail = cleanString(invite.intendedGuestEmail || invite.invitedEmail || invite.guestEmail, 240).toLowerCase();
  if (!isEmail(toEmail)) throw new Error("Enter a valid email address before sending the invitation.");

  const eventName = cleanString(invite.eventName, 240) || "our upcoming event";
  const eventDate = cleanString(invite.eventDate, 120);
  const firstName = inviteReminderFirstName(invite);
  const registrationUrl = inviteRegistrationUrl(origin, invite);

  const context = { firstName, eventName, eventDate, registrationUrl };
  await sendResendEmail(env, {
    to: toEmail,
    subject: `You’re Invited: ${eventName}`,
    html: inviteInvitationHtml(context),
    text: inviteInvitationText(context),
    replyTo: "Angel@mojoaisummits.com",
    cc: guestInviteEmailCc
  });

  return { sentTo: toEmail };
}

async function sendInviteReminderEmail(env, payload = {}, origin = "") {
  const invite = await findInviteCodeRecord(env, payload);
  const toEmail = cleanString(invite.intendedGuestEmail || invite.invitedEmail || invite.guestEmail, 240).toLowerCase();
  if (!isEmail(toEmail)) throw new Error("This invite does not have a valid email address on file.");

  const eventName = cleanString(invite.eventName, 240) || "your upcoming event";
  const eventDate = cleanString(invite.eventDate, 120);
  const firstName = inviteReminderFirstName(invite);
  const registrationUrl = inviteRegistrationUrl(cleanString(payload.origin, 200) || origin, invite);

  const context = { firstName, eventName, eventDate, registrationUrl };
  await sendResendEmail(env, {
    to: toEmail,
    subject: `Reminder: complete your registration for ${eventName}`,
    html: inviteReminderHtml(context),
    text: inviteReminderText(context),
    replyTo: "Angel@mojoaisummits.com",
    cc: guestInviteEmailCc
  });

  return { sentTo: toEmail };
}

async function removeEmailFromCompanyContacts(env, email, actor = "") {
  const deletedFromCompanies = [];
  const companyKeys = [
    ...(await listKeys(env, "crm:company:")),
    ...(await listKeys(env, "partner-company:")),
    ...(await listKeys(env, "member-company:")),
    ...(await listKeys(env, "guest-company:"))
  ];

  for (const key of [...new Set(companyKeys)]) {
    const record = await readRawRecord(env, key);
    if (!record || !Array.isArray(record.contacts)) continue;
    const nextContacts = record.contacts.filter((entry) => cleanString(entry?.email).toLowerCase() !== email);
    if (nextContacts.length === record.contacts.length) continue;
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
      ...record,
      contacts: nextContacts,
      updatedAt: new Date().toISOString(),
      updatedBy: actor || "crm"
    }));
    deletedFromCompanies.push(key);
  }

  return deletedFromCompanies;
}

async function deleteContact(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key);
  const email = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before deleting a contact.");

  const deletedKeys = [];
  const contactKey = `${registrantTypes.contacts.crmPrefix}${email}`;
  await env.MOJO_SUMMITS_SETUP_STATE.delete(contactKey);
  deletedKeys.push(contactKey);

  for (const type of ["guest", "member", "partner"]) {
    const config = registrantTypes[type];
    const keys = [...new Set([
      ...(await listKeys(env, config.crmPrefix)),
      ...(await listKeys(env, config.legacyPrefix))
    ])];
    for (const key of keys) {
      const record = await readRawRecord(env, key);
      if (cleanString(record?.email).toLowerCase() !== email) continue;
      await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
      deletedKeys.push(key);
    }
  }

  const deletedR2Keys = await deleteR2RegistrantsForEmail(env, email);
  const deletedFromCompanies = await removeEmailFromCompanyContacts(env, email, actor);
  return {
    email,
    deletedKeys: [...new Set(deletedKeys)],
    deletedR2Keys,
    deletedFromCompanies
  };
}

function registrationEventTarget(row = {}) {
  return {
    id: cleanString(row.id || row.key),
    eventId: cleanString(row.eventId),
    eventSlug: cleanString(row.eventSlug),
    eventName: cleanString(row.eventName),
    eventDate: cleanString(row.eventDate),
    inviteCode: cleanString(row.inviteCode),
    registrationId: cleanString(row.id),
    registeredAt: cleanString(row.createdAt)
  };
}

async function removeContactEventForRegistrant(env, row = {}, actor = "") {
  const email = cleanString(row.email).toLowerCase();
  if (!email || !email.includes("@")) return { contactKey: "", removedEvents: 0, contactDeleted: false };

  const contactKey = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, contactKey);
  if (!existing) return { contactKey, removedEvents: 0, contactDeleted: false };

  const events = Array.isArray(existing.events) ? existing.events : [];
  const targetEvent = registrationEventTarget(row);
  const nextEvents = events.filter((event) => !contactEventMatches(event, targetEvent));
  const removedEvents = events.length - nextEvents.length;
  if (!removedEvents) return { contactKey, removedEvents: 0, contactDeleted: false };

  const now = new Date().toISOString();
  const canDeleteContact =
    !nextEvents.length &&
    !cleanString(existing.crmNotes) &&
    cleanString(existing.source).toLowerCase().includes("registration");

  if (canDeleteContact) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(contactKey);
    return { contactKey, removedEvents, contactDeleted: true };
  }

  await env.MOJO_SUMMITS_SETUP_STATE.put(contactKey, JSON.stringify({
    ...existing,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  }));

  return { contactKey, removedEvents, contactDeleted: false };
}

async function deleteGuestRegistrant(env, payload = {}, actor = "") {
  const type = cleanType(payload.type || "guest");
  if (type !== "guest") throw new Error("Only guest registrants can be deleted from this view.");

  const key = cleanString(payload.key, 500);
  const rows = await registrants(env, "guest");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Guest registrant was not found.");

  const deletedKeys = [];
  const rowId = cleanString(row.id);
  const rowCreatedAt = cleanString(row.createdAt);
  const rowEmail = cleanString(row.email).toLowerCase();
  const rowInviteCode = cleanString(row.inviteCode);
  const matchesRow = (candidateKey, record = {}) => {
    if (candidateKey === row.key) return true;
    if (rowId && cleanString(record.id) === rowId) return true;
    return Boolean(
      rowCreatedAt &&
      rowEmail &&
      cleanString(record.createdAt) === rowCreatedAt &&
      cleanString(record.email).toLowerCase() === rowEmail &&
      (!rowInviteCode || cleanString(record.inviteCode) === rowInviteCode)
    );
  };

  const kvKeys = [...new Set([
    ...(await listKeys(env, registrantTypes.guest.crmPrefix)),
    ...(await listKeys(env, registrantTypes.guest.legacyPrefix))
  ])];
  for (const candidateKey of kvKeys) {
    const record = await readRawRecord(env, candidateKey);
    if (!record || !matchesRow(candidateKey, record)) continue;
    await env.MOJO_SUMMITS_SETUP_STATE.delete(candidateKey);
    deletedKeys.push(candidateKey);
  }

  if (env.MOJO_SUMMITS_STORAGE?.list && env.MOJO_SUMMITS_STORAGE?.get && env.MOJO_SUMMITS_STORAGE?.delete) {
    for (const prefix of [`${R2_REGISTRATION_PREFIX}/guest/`, `${OVERFLOW_REGISTRATION_PREFIX}/guest/`]) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (!record || !matchesRow(object.key, record)) continue;
          await env.MOJO_SUMMITS_STORAGE.delete(object.key);
          deletedKeys.push(object.key);
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }

  if (!deletedKeys.length) throw new Error("Guest registrant storage record was not found.");

  const contactCleanup = await removeContactEventForRegistrant(env, row, actor);
  return {
    key: row.key,
    id: row.id,
    email: row.email,
    name: row.name,
    deletedKeys,
    contactCleanup
  };
}

async function updateContact(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key);
  const currentEmail = cleanString(
    requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
      ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
      : requestedKey
  ).toLowerCase();
  const email = cleanString(payload.email || currentEmail).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before updating a contact.");

  const currentKey = `${registrantTypes.contacts.crmPrefix}${currentEmail || email}`;
  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, currentKey);
  const targetExisting = key === currentKey ? existing : await readRawRecord(env, key);
  if (key !== currentKey && targetExisting) throw new Error("A contact with that email address already exists.");
  const now = new Date().toISOString();
  const firstName = cleanString(payload.firstName ?? existing?.firstName, 120);
  const lastName = cleanString(payload.lastName ?? existing?.lastName, 120);
  const existingName = cleanString(existing?.name) || email;
  const name = cleanString(payload.name) || [firstName, lastName].filter(Boolean).join(" ") || existingName;
  const topicInterests = cleanTopicTracks(payload.topicInterests ?? existing?.topicInterests);
  const emailPermission = cleanAllowed(payload.emailPermission ?? existing?.emailPermission, allowedEmailPermissions, "unknown");

  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
    ...(existing || {}),
    id: email,
    email,
    name,
    firstName,
    lastName,
    company: cleanString(payload.company ?? existing?.company, 240),
    title: cleanString(payload.title ?? existing?.title, 180),
    phone: cleanString(payload.phone ?? existing?.phone, 80),
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    photoUrl: cleanString(payload.photoUrl ?? payload.photoURL ?? payload.photo ?? existing?.photoUrl, 500),
    photoKey: safeObjectKey(payload.photoKey ?? existing?.photoKey),
    bio: cleanString(payload.bio ?? payload.biography ?? existing?.bio, 4000),
    executiveFunction: cleanAllowed(payload.executiveFunction ?? existing?.executiveFunction, allowedExecutiveFunctions, ""),
    industry: cleanString(payload.industry ?? existing?.industry),
    companySize: cleanAllowed(payload.companySize ?? existing?.companySize, allowedCompanySizes, ""),
    organizationType: cleanAllowed(payload.organizationType ?? existing?.organizationType, allowedOrganizationTypes, ""),
    city: cleanString(payload.city ?? existing?.city, 120),
    state: cleanString(payload.state ?? existing?.state, 80),
    timeZone: cleanString(payload.timeZone ?? existing?.timeZone, 120),
    location: cleanString(payload.location ?? existing?.location, 180),
    invitationSource: cleanString(payload.invitationSource ?? existing?.invitationSource, 180),
    relationshipOwner: cleanString(payload.relationshipOwner ?? existing?.relationshipOwner, 180),
    lifecycleStage: cleanAllowed(payload.lifecycleStage ?? existing?.lifecycleStage, allowedLifecycleStages, "prospect"),
    nextAction: cleanAllowed(payload.nextAction ?? existing?.nextAction, allowedNextActions, "none"),
    nextActionDueDate: cleanString(payload.nextActionDueDate ?? payload.dueDate ?? existing?.nextActionDueDate, 40),
    lastContactDate: cleanString(payload.lastContactDate ?? existing?.lastContactDate, 40),
    emailPermission,
    emailOptOut: payload.emailOptOut === true || emailPermission === "opted-out",
    topicInterests,
    events: Array.isArray(existing?.events)
      ? existing.events.map((event) => ({ ...event, email }))
      : existing?.events,
    crmNotes: cleanString(payload.crmNotes),
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  }));
  if (currentKey !== key && currentEmail) await env.MOJO_SUMMITS_SETUP_STATE.delete(currentKey);
}

async function serveContactPhoto(request, env) {
  if (!env.MOJO_SUMMITS_STORAGE?.get) {
    return json({ error: "CRM photo storage is not configured." }, { status: 500 });
  }
  const url = new URL(request.url);
  const key = safeObjectKey(url.searchParams.get("photo"));
  if (!key || !key.startsWith(`${CONTACT_PHOTO_PREFIX}/`)) {
    return json({ error: "Contact photo was not found." }, { status: 404 });
  }
  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "Contact photo was not found." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "cache-control": "private, max-age=300",
      "content-type": object.httpMetadata?.contentType || "application/octet-stream"
    }
  });
}

async function uploadContactPhoto(request, env, form, actor = "") {
  if (!env.MOJO_SUMMITS_STORAGE?.put) {
    return json({ error: "CRM photo storage is not configured." }, { status: 500 });
  }

  const requestedKey = cleanString(form.get("key"));
  const email = cleanString(
    form.get("email") ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) return json({ error: "Contact email is required before uploading a photo." }, { status: 400 });

  const file = form.get("photo") || form.get("file");
  if (!file || typeof file.name !== "string" || typeof file.stream !== "function") {
    return json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!String(file.type || "").toLowerCase().startsWith("image/")) {
    return json({ error: "Upload an image file." }, { status: 400 });
  }
  if (Number(file.size || 0) > 6 * 1024 * 1024) {
    return json({ error: "Contact photos must be 6 MB or smaller." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const stamp = now.replace(/[:.]/g, "-");
  const id = crypto.randomUUID().slice(0, 8);
  const emailSegment = safeFileSegment(email.replace("@", "-at-"), "contact");
  const originalName = safeFileSegment(file.name, "photo");
  const photoKey = `${CONTACT_PHOTO_PREFIX}/${emailSegment}/${stamp}-${id}-${originalName}`;
  const photoUrl = `/api/crm?photo=${encodeURIComponent(photoKey)}`;

  await env.MOJO_SUMMITS_STORAGE.put(photoKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
    },
    customMetadata: {
      contactEmail: email,
      originalName: file.name,
      uploadedBy: actor || "crm",
      uploadedAt: now
    }
  });

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);
  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    photoUrl,
    photoKey,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  }));

  const rows = await contacts(env);
  return json({
    ok: true,
    type: "contacts",
    label: registrantTypes.contacts.label,
    summary: summarizeContacts(rows),
    rows,
    photoUrl,
    photoKey,
    partnerInviteCodes: await partnerInviteCodes(env),
    registrationInviteCodes: await registrationInviteCodes(env),
    upcomingEvents: await upcomingEvents(env)
  }, { status: 201 });
}

async function addContactActivity(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key);
  const email = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before adding activity.");
  const text = cleanString(payload.text || payload.activityText);
  if (!text) throw new Error("Activity text is required.");

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);
  const now = new Date().toISOString();
  const entry = normalizeActivity({
    type: payload.activityType || payload.type,
    owner: payload.owner || actor,
    text,
    nextAction: payload.nextAction,
    dueDate: payload.dueDate || payload.nextActionDueDate,
    createdAt: now
  });
  const activity = [entry, ...(Array.isArray(existing?.activity) ? existing.activity : [])]
    .map(normalizeActivity)
    .slice(0, 100);

  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    activity,
    lastContactDate: cleanString(payload.lastContactDate) || now.slice(0, 10),
    nextAction: cleanAllowed(payload.nextAction ?? existing?.nextAction, allowedNextActions, cleanString(existing?.nextAction) || "none"),
    nextActionDueDate: cleanString(payload.dueDate || payload.nextActionDueDate || existing?.nextActionDueDate, 40),
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  }));
}

async function createManualPartner(env, payload = {}, actor = "") {
  const company = cleanString(payload.partnerCompany || payload.company, 240);
  const rawContacts = Array.isArray(payload.contacts) && payload.contacts.length
    ? payload.contacts
    : [{
      name: payload.name || payload.contactName,
      title: payload.title || payload.contactTitle,
      email: payload.email || payload.contactEmail,
      phone: payload.phone || payload.contactPhone
    }];
  const contacts = rawContacts.map((contact = {}) => ({
    name: cleanString(contact.name || contact.contactName, 180),
    title: cleanString(contact.title || contact.contactTitle, 180),
    email: cleanString(contact.email || contact.contactEmail, 180).toLowerCase(),
    phone: cleanString(contact.phone || contact.contactPhone, 80)
  })).filter((contact) => contact.name || contact.email || contact.phone || contact.title);
  const crmStatus = allowedStatuses.has(payload.crmStatus || payload.status) ? payload.crmStatus || payload.status : "new";
  if (!company) throw new Error("Company name is required.");
  if (!contacts.length) throw new Error("At least one partner contact is required.");

  const now = new Date().toISOString();
  const seenEmails = new Set();
  for (const contact of contacts) {
    if (!contact.name) throw new Error("Contact name is required for every partner contact.");
    if (!isEmail(contact.email)) throw new Error("Enter a valid contact email for every partner contact.");
    if (!contact.phone) throw new Error("Contact phone is required for every partner contact.");
    if (seenEmails.has(contact.email)) throw new Error("Each partner contact email must be unique.");
    seenEmails.add(contact.email);
  }

  const existingRows = await registrants(env, "partner");
  const records = [];
  for (const contact of contacts) {
    const existingManual = existingRows.find((row) =>
      row.manualPartner === true && cleanString(row.email).toLowerCase() === contact.email
    );
    const id = cleanString(existingManual?.id) || `manual-partner-${now.replace(/[^0-9]/g, "")}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const key = cleanString(existingManual?.key) || `${registrantTypes.partner.crmPrefix}${now}:${id}`;
    const existing = existingManual?.key ? await readRawRecord(env, existingManual.key) : null;
    const record = {
      ...(existing || {}),
      id,
      name: contact.name,
      company,
      partnerCompany: company,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      partnerTier: cleanString(payload.partnerTier, 120) || cleanString(existing?.partnerTier, 120) || "Partner Candidate",
      phoneVerificationStatus: cleanString(existing?.phoneVerificationStatus) || "manual",
      crmType: registrantTypes.partner.crmType,
      crmStatus,
      crmNotes: cleanString(payload.crmNotes || payload.notes),
      crmUpdatedAt: now,
      crmUpdatedBy: actor || "crm",
      createdAt: cleanString(existing?.createdAt) || now,
      updatedAt: now,
      manualPartner: true,
      source: "manual-partner"
    };

    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record));
    await upsertPartnerContactProfile(env, record, actor);
    records.push(normalizeRecord(key, record));
  }

  return records;
}

function contactEventIdentity(event = {}) {
  return cleanString(
    event.registrationId ||
      event.eventId ||
      event.eventSlug ||
      event.eventName ||
      event.inviteCode ||
      event.registeredAt ||
      event.id
  ).toLowerCase();
}

function contactEventMatches(event = {}, target = {}) {
  const directFields = ["registrationId", "eventId", "eventSlug", "inviteCode", "registeredAt", "id"];
  for (const field of directFields) {
    const left = cleanString(event[field]).toLowerCase();
    const right = cleanString(target[field]).toLowerCase();
    if (left && right && left === right) return true;
  }

  const leftIdentity = contactEventIdentity(event);
  const rightIdentity = contactEventIdentity(target);
  if (leftIdentity && rightIdentity && leftIdentity === rightIdentity) return true;

  const leftName = cleanString(event.eventName).toLowerCase();
  const rightName = cleanString(target.eventName).toLowerCase();
  const leftDate = cleanString(event.eventDate).toLowerCase();
  const rightDate = cleanString(target.eventDate).toLowerCase();
  return Boolean(leftName && rightName && leftName === rightName && (!rightDate || leftDate === rightDate));
}

async function syncRegistrationAttendance(env, email, targetEvent, attended, actor = "", now = "") {
  for (const type of ["guest", "member", "partner"]) {
    const config = registrantTypes[type];
    const keys = [...new Set([
      ...(await listKeys(env, config.crmPrefix)),
      ...(await listKeys(env, config.legacyPrefix))
    ])];

    for (const key of keys) {
      const record = await readRawRecord(env, key);
      if (!record || cleanString(record.email).toLowerCase() !== email) continue;
      if (!contactEventMatches(record, targetEvent)) continue;

      await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
        ...record,
        attended,
        attendanceStatus: attended ? "attended" : "not_attended",
        attendedAt: attended ? (cleanString(record.attendedAt) || now) : "",
        attendanceUpdatedAt: now,
        attendanceUpdatedBy: actor || "crm"
      }));
    }
  }
}

async function updateContactEventAttendance(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key || payload.contactKey);
  const email = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before updating attendance.");

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);

  const targetEvent = {
    id: cleanString(payload.eventKey || payload.id),
    eventId: cleanString(payload.eventId),
    eventSlug: cleanString(payload.eventSlug),
    eventName: cleanString(payload.eventName),
    eventDate: cleanString(payload.eventDate),
    inviteCode: cleanString(payload.inviteCode),
    registrationId: cleanString(payload.registrationId),
    registeredAt: cleanString(payload.registeredAt)
  };
  if (!contactEventIdentity(targetEvent)) throw new Error("Event is required before updating attendance.");

  const events = Array.isArray(existing?.events) ? existing.events : [targetEvent];
  let matched = false;
  const attended = payload.attended === true;
  const now = new Date().toISOString();
  const nextEvents = events.map((event) => {
    if (!contactEventMatches(event, targetEvent)) return event;
    matched = true;
    return {
      ...event,
      attended,
      attendanceStatus: attended ? "attended" : "not_attended",
      attendedAt: attended ? (cleanString(event.attendedAt) || now) : "",
      attendanceUpdatedAt: now,
      attendanceUpdatedBy: actor || "crm"
    };
  });

  if (!matched) throw new Error("Contact event was not found.");

  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  }));

  await syncRegistrationAttendance(env, email, targetEvent, attended, actor, now);
}

function companySlug(value) {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function grantAccessGroupEmail(env, groupId, email, actor = "") {
  const normalizedEmail = cleanString(email).toLowerCase();
  if (!normalizedEmail) return;

  const config = await readAccessConfig(env);
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const target = groups.find((group) => group.id === groupId) || {
    id: groupId,
    label: groupId === "partners" ? "Partners" : groupId,
    summary: "",
    emails: []
  };
  const nextEmails = [...new Set([...(target.emails || []), normalizedEmail])].sort();
  const nextTarget = { ...target, emails: nextEmails };
  const nextGroups = groups.some((group) => group.id === groupId)
    ? groups.map((group) => group.id === groupId ? nextTarget : group)
    : [...groups, nextTarget];

  await writeAccessConfig(env, { ...config, groups: nextGroups }, actor);
}

async function upsertPartnerContactProfile(env, row, actor = "") {
  const email = cleanString(row.email).toLowerCase();
  const company = cleanString(row.partnerCompany || row.company, 240);
  const slug = companySlug(company);
  if (!email || !company || !slug) return null;

  const now = new Date().toISOString();
  const companyKey = `partner-company:${slug}`;
  if (row.manualPartner === true) {
    const contactKey = `crm:contact:${email}`;
    const crmCompanyKey = `crm:company:${slug}`;
    const profileContact = {
      id: email,
      email,
      name: cleanString(row.name) || email,
      company,
      companySlug: slug,
      companyKey: crmCompanyKey,
      profileKey: companyKey,
      title: cleanString(row.title),
      phone: cleanString(row.phone),
      registrationId: cleanString(row.id),
      registrationType: "partner",
      source: "Partner CRM",
      crmNotes: cleanString(row.crmNotes),
      crmStatus: cleanString(row.crmStatus),
      updatedAt: now,
      updatedBy: actor || "crm"
    };
    const existingContact = await env.MOJO_SUMMITS_SETUP_STATE.get(contactKey, "json").catch(() => null);
    await env.MOJO_SUMMITS_SETUP_STATE.put(contactKey, JSON.stringify({
      ...(existingContact || {}),
      ...profileContact,
      createdAt: cleanString(existingContact?.createdAt) || cleanString(row.createdAt) || now,
      events: Array.isArray(existingContact?.events) ? existingContact.events : []
    }));

    const existingCompany = await env.MOJO_SUMMITS_SETUP_STATE.get(companyKey, "json").catch(() => null);
    const contacts = Array.isArray(existingCompany?.contacts) ? existingCompany.contacts : [];
    const contactMap = new Map(contacts.map((entry) => [
      cleanString(entry?.email).toLowerCase() || cleanString(entry?.name),
      entry
    ]));
    contactMap.set(email, {
      ...(contactMap.get(email) || {}),
      ...profileContact
    });
    await env.MOJO_SUMMITS_SETUP_STATE.put(companyKey, JSON.stringify({
      ...(existingCompany || {}),
      organizationName: cleanString(existingCompany?.organizationName || existingCompany?.company || company),
      company,
      companySlug: slug,
      tier: cleanString(row.partnerTier || existingCompany?.tier, 120),
      status: cleanString(row.crmStatus || existingCompany?.status, 80) || "new",
      crmNotes: cleanString(row.crmNotes || existingCompany?.crmNotes),
      contacts: [...contactMap.values()],
      updatedAt: now,
      updatedBy: actor || "crm"
    }));
    return { contactId: email, contactKey, companyKey: crmCompanyKey, profileKey: companyKey };
  }

  const refs = await upsertRegistrationContact(env, "partner", {
    ...row,
    company,
    partnerCompany: company,
    createdAt: row.createdAt || now,
    source: "Partner CRM"
  }, {
    label: "partner",
    source: "Partner CRM",
    updatedBy: actor || "crm"
  });

  const existingCompany = await env.MOJO_SUMMITS_SETUP_STATE.get(companyKey, "json").catch(() => null);
  const companyRecord = {
    ...(existingCompany || {}),
    organizationName: cleanString(existingCompany?.organizationName || company, 240),
    company,
    companySlug: slug,
    tier: cleanString(row.partnerTier || existingCompany?.tier, 120),
    updatedAt: now,
    updatedBy: actor || "crm"
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(companyKey, JSON.stringify(companyRecord));
  return { ...refs, companyKey };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const access = requireCrmAccess(data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  if (url.searchParams.has("photo")) return serveContactPhoto(request, env);

  if (url.searchParams.get("debug") === "registration") {
    return json(await registrationDiagnostics(env));
  }

  const type = cleanType(url.searchParams.get("type"));
  const config = registrantTypes[type];
  const isContacts = type === "contacts";
  const rows = isContacts ? await contacts(env) : await registrants(env, type);

  if (url.searchParams.get("download") === "csv") {
    const headings = isContacts
      ? [
        "Contact ID",
        "First Name",
        "Last Name",
        "Name",
        "Company",
        "Title",
        "Photo URL",
        "Bio",
        "Executive Function",
        "Email",
        "Phone",
        "Industry",
        "Company Size",
        "Organization Type",
        "City",
        "State",
        "Time Zone",
        "Invitation Source",
        "Relationship Owner",
        "Lifecycle Stage",
        "Last Contact Date",
        "Next Action",
        "Next Action Due Date",
        "Email Permission",
        "Topic Interests",
        "Last Updated",
        "Latest Registration",
        "Latest Event",
        "Latest Event Date",
        "Events",
        "Attended",
        "Source"
      ]
      : [
        "Registered At",
        "Status",
        "Registration Type",
        "Name",
        "Company",
        "Title",
        "Industry",
        "Email",
        "Phone",
        "Invite Code",
        "Event",
        "Event Date",
        "Partner Tier",
        "Phone Verification",
        "Presenter",
        "Round Table Leader",
        "Featured Guest",
        "Featured Member",
        "Publication Use Name",
        "Publication Use Company",
        "CRM Notes"
      ];
    const csvRows = isContacts
      ? rows.map((row) => [
        row.id,
        row.firstName,
        row.lastName,
        row.name,
        row.company,
        row.title,
        row.photoUrl,
        row.bio,
        row.executiveFunction,
        row.email,
        row.phone,
        row.industry,
        row.companySize,
        row.organizationType,
        row.city,
        row.state,
        row.timeZone,
        row.invitationSource,
        row.relationshipOwner,
        row.lifecycleStage,
        row.lastContactDate,
        row.nextAction,
        row.nextActionDueDate,
        row.emailPermission,
        (row.topicInterests || []).join("; "),
        row.updatedAt,
        row.latestRegisteredAt,
        row.latestEventName,
        row.latestEventDate,
        row.eventCount,
        row.attendedCount,
        row.source
      ])
      : rows.map((row) => [
        row.createdAt,
        row.crmStatus,
        config.label,
        row.name,
        row.company,
        row.title,
        row.industry,
        row.email,
        row.phone,
        row.inviteCode,
        row.eventName,
        row.eventDate,
        row.partnerTier,
        row.phoneVerificationStatus,
        row.isPresenter ? "Yes" : "No",
        row.isRoundtableLeader ? "Yes" : "No",
        row.isFeaturedGuest ? "Yes" : "No",
        row.isFeaturedMember ? "Yes" : "No",
        row.publicationUseName ? "Yes" : "No",
        row.publicationUseCompany ? "Yes" : "No",
        row.crmNotes
      ]);
    const csv = [headings, ...csvRows]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${config.csvFilename}"`
      }
    });
  }

  return json({
    ok: true,
    type,
    label: config.label,
    section: config.section,
    summary: isContacts ? summarizeContacts(rows) : summarize(rows),
    rows,
    partnerInviteCodes: await partnerInviteCodes(env),
    registrationInviteCodes: await registrationInviteCodes(env),
    upcomingEvents: await upcomingEvents(env)
  });
}

async function createMemberPassword(env, payload = {}, actor = "") {
  const key = cleanString(payload?.key);
  const rows = await registrants(env, "member");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Member registrant was not found.");
  if (!row.email) throw new Error("Member registrant needs an email before a password can be generated.");

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, "member");
  const password = cleanString(payload?.password, 120) || randomMemberPassword();
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const existingUser = await getUserByEmail(env, crmRow.email);
  const authPayload = {
    name: crmRow.name || crmRow.email,
    email: crmRow.email,
    password,
    role: "member",
    status: "active"
  };

  if (existingUser) {
    await updateUser(env, crmRow.email, authPayload, actor);
  } else {
    await createUser(env, authPayload, actor);
  }

  const now = new Date().toISOString();
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes.member.crmType,
    crmStatus: "accepted",
    memberStatus: "accepted",
    memberTier: cleanString(payload?.memberTier, 120) || crmRow.memberTier || "Fellow",
    memberPassword: password,
    memberPasswordGeneratedAt: now,
    memberPasswordGeneratedBy: actor,
    acceptedAt: crmRow.acceptedAt || now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(crmKey, JSON.stringify(next));
  return {
    record: normalizeRecord(crmKey, next),
    password
  };
}

async function createPartnerPassword(env, payload = {}, actor = "") {
  const key = cleanString(payload?.key);
  const rows = await registrants(env, "partner");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Partner registrant was not found.");
  if (!row.email) throw new Error("Partner registrant needs an email before a password can be generated.");

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, "partner");
  const password = cleanString(payload?.password, 120) || randomMemberPassword();
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const existingUser = await getUserByEmail(env, crmRow.email);
  const authPayload = {
    name: crmRow.name || crmRow.email,
    email: crmRow.email,
    password,
    role: "member",
    status: "active"
  };

  if (existingUser) {
    await updateUser(env, crmRow.email, authPayload, actor);
  } else {
    await createUser(env, authPayload, actor);
  }

  await grantAccessGroupEmail(env, "partners", crmRow.email, actor);
  await upsertPartnerContactProfile(env, crmRow, actor);

  const now = new Date().toISOString();
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes.partner.crmType,
    crmStatus: "accepted",
    partnerPassword: password,
    partnerPasswordGeneratedAt: now,
    partnerPasswordGeneratedBy: actor,
    acceptedAt: crmRow.acceptedAt || now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(crmKey, JSON.stringify(next));
  return {
    record: normalizeRecord(crmKey, next),
    password
  };
}

export async function onRequestPost({ request, env, data }) {
  const access = requireCrmAccess(data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return json({ error: "Expected form data." }, { status: 400 });
    if (form.get("action") === "upload-contact-photo") {
      try {
        return uploadContactPhoto(request, env, form, access.email);
      } catch (error) {
        return json({ error: error.message || "Contact photo could not be uploaded." }, { status: 500 });
      }
    }
    return json({ error: "Unsupported CRM upload action." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  if (payload?.action === "generate-member-password") {
    try {
      const result = await createMemberPassword(env, payload, access.email);
      const rows = await registrants(env, "member");
      return json({
        ok: true,
        type: "member",
        label: registrantTypes.member.label,
        summary: summarize(rows),
        rows,
        password: result.password,
        record: result.record,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Member password could not be generated." }, { status: 500 });
    }
  }

  if (payload?.action === "generate-partner-password") {
    try {
      const result = await createPartnerPassword(env, payload, access.email);
      const rows = await registrants(env, "partner");
      return json({
        ok: true,
        type: "partner",
        label: registrantTypes.partner.label,
        summary: summarize(rows),
        rows,
        password: result.password,
        record: result.record,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner password could not be generated." }, { status: 500 });
    }
  }

  if (payload?.action === "create-partner-invite") {
    try {
      const invite = await createPartnerInviteCode(env, payload, access.email);
      return json({
        ok: true,
        invite,
        partnerInviteCodes: [invite]
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner invite code could not be created." }, { status: 500 });
    }
  }

  if (payload?.action === "create-registration-invite") {
    try {
      const sendEmail = cleanBoolean(payload.sendEmail);
      if (sendEmail && !isEmail(payload.intendedGuestEmail || payload.invitedEmail || payload.guestEmail || payload.email)) {
        throw new Error("Enter a valid email address before sending the invitation.");
      }
      const invite = await createRegistrationInviteCode(env, payload, access.email);
      let emailSent = null;
      if (sendEmail) {
        const origin = new URL(request.url).origin;
        const result = await sendInviteInvitationEmail(env, invite, origin);
        emailSent = result.sentTo;
      }
      return json({
        ok: true,
        invite,
        emailSent,
        registrationInviteCodes: [invite]
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Registration invite code could not be created." }, { status: 500 });
    }
  }

  if (payload?.action === "delete-registration-invite" || payload?.action === "delete-partner-invite") {
    try {
      await deleteInviteCode(env, payload);
      return json({
        ok: true,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Invite link could not be deleted." }, { status: 404 });
    }
  }

  if (payload?.action === "send-invite-reminder") {
    try {
      const origin = new URL(request.url).origin;
      const result = await sendInviteReminderEmail(env, payload, origin);
      return json({ ok: true, ...result });
    } catch (error) {
      return json({ error: error.message || "Reminder email could not be sent." }, { status: 502 });
    }
  }

  if (payload?.action === "create-manual-partner") {
    try {
      const records = await createManualPartner(env, payload, access.email);
      const rows = await registrants(env, "partner");
      return json({
        ok: true,
        type: "partner",
        label: registrantTypes.partner.label,
        summary: summarize(rows),
        rows,
        record: records[0],
        records,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      const status = /required|valid contact email|unique|At least one/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Manual partner could not be saved." }, { status });
    }
  }

  if (payload?.action === "delete-contact") {
    try {
      const deleted = await deleteContact(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        deleted,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Contact could not be deleted." }, { status: 500 });
    }
  }

  if (payload?.action === "delete-guest-registrant") {
    try {
      const deleted = await deleteGuestRegistrant(env, payload, access.email);
      const rows = await registrants(env, "guest");
      return json({
        ok: true,
        type: "guest",
        label: registrantTypes.guest.label,
        summary: summarize(rows),
        rows,
        deleted,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Guest registrant could not be deleted." }, { status: 500 });
    }
  }

  if (payload?.action === "save-contact") {
    try {
      await updateContact(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      const status = /required|already exists|valid email/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Contact could not be updated." }, { status });
    }
  }

  if (payload?.action === "add-contact-activity") {
    try {
      await addContactActivity(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Contact activity could not be saved." }, { status: 500 });
    }
  }

  if (payload?.action === "update-contact-event-attendance") {
    try {
      await updateContactEventAttendance(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Attendance could not be updated." }, { status: 500 });
    }
  }

  const type = cleanType(payload?.type);
  const key = cleanString(payload?.key);
  const rows = await registrants(env, type);
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) return json({ error: `${registrantTypes[type].label} registrant was not found.` }, { status: 404 });

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
  const crmStatus = allowedStatuses.has(payload?.crmStatus) ? payload.crmStatus : crmRow.crmStatus;
  const partnerEmail = cleanString(payload?.email, 180).toLowerCase();
  if (type === "partner" && partnerEmail && !isEmail(partnerEmail)) {
    return json({ error: "Enter a valid partner email." }, { status: 400 });
  }
  const partnerCompany = cleanString(payload?.partnerCompany || payload?.company, 240);
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes[type].crmType,
    crmStatus,
    name: type === "partner" ? cleanString(payload?.name, 180) || crmRow.name : crmRow.name,
    company: type === "partner" ? partnerCompany || crmRow.company || crmRow.partnerCompany : crmRow.company,
    partnerCompany: type === "partner" ? partnerCompany || crmRow.partnerCompany || crmRow.company : crmRow.partnerCompany,
    title: type === "partner" ? cleanString(payload?.title, 180) : crmRow.title,
    email: type === "partner" ? partnerEmail || crmRow.email : crmRow.email,
    phone: type === "partner" ? cleanString(payload?.phone, 80) : crmRow.phone,
    partnerTier: type === "partner" ? cleanString(payload?.partnerTier, 120) || crmRow.partnerTier || "Partner Candidate" : crmRow.partnerTier,
    memberTier: type === "member" ? cleanString(payload?.memberTier, 120) || crmRow.memberTier || "Fellow" : crmRow.memberTier,
    crmNotes: cleanString(payload?.crmNotes),
    crmUpdatedAt: new Date().toISOString(),
    crmUpdatedBy: access.email
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(crmKey, JSON.stringify(next));
  if (type === "partner") {
    const previousEmail = cleanString(crmRow.email).toLowerCase();
    const nextEmail = cleanString(next.email).toLowerCase();
    const previousCompany = cleanString(crmRow.partnerCompany || crmRow.company);
    const nextCompany = cleanString(next.partnerCompany || next.company);
    if (previousEmail && (previousEmail !== nextEmail || companySlug(previousCompany) !== companySlug(nextCompany))) {
      await removeEmailFromCompanyContacts(env, previousEmail, access.email);
      if (previousEmail !== nextEmail) await env.MOJO_SUMMITS_SETUP_STATE.delete(`crm:contact:${previousEmail}`);
    }
    const normalizedNext = normalizeRecord(crmKey, next);
    await upsertPartnerContactProfile(env, normalizedNext, access.email);
    if (nextEmail) {
      await grantAccessGroupEmail(env, "partners", nextEmail, access.email);
      if (next.partnerPassword) {
        const authPayload = {
          name: normalizedNext.name || nextEmail,
          email: nextEmail,
          password: next.partnerPassword,
          role: "member",
          status: "active"
        };
        if (await getUserByEmail(env, nextEmail)) await updateUser(env, nextEmail, authPayload, access.email);
        else await createUser(env, authPayload, access.email);
      }
    }
  }

  const nextRows = await registrants(env, type);
  return json({
    ok: true,
    type,
    label: registrantTypes[type].label,
    summary: summarize(nextRows),
    rows: nextRows,
    partnerInviteCodes: await partnerInviteCodes(env),
    registrationInviteCodes: await registrationInviteCodes(env),
    upcomingEvents: await upcomingEvents(env)
  });
}

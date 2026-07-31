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
const DEFAULT_UPCOMING_EVENTS = [
  {
    slug: "ai-executive-readiness",
    title: "AI Executive Readiness",
    date: "Friday, September 4, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-use-cases-that-survive-finance",
    title: "AI Use Cases That Survive Finance",
    date: "Friday, September 25, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-integration-and-workflow",
    title: "AI Integration and Workflow",
    date: "Friday, October 16, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-security-governance-and-trust",
    title: "AI Security, Governance, and Trust",
    date: "Friday, November 6, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-operating-model-for-2027",
    title: "AI Operating Model for 2027",
    date: "Friday, November 27, 2026",
    format: "Virtual"
  },
  {
    slug: "dallas-2027",
    title: "Dallas 2027 Summit",
    date: "January 2027",
    format: "In person"
  }
];
const allowedStatuses = new Set(["new", "contacted", "confirmed", "accepted", "waitlist", "declined"]);
const maxFieldLength = 2000;

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

function cleanType(value) {
  return registrantTypes[value] ? value : "member";
}

function cleanCode(value) {
  return cleanString(value).replace(/\D/g, "").slice(0, 6);
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
    intendedGuestName: cleanString(record?.intendedGuestName || record?.invitedName || record?.guestName),
    invitedName: cleanString(record?.invitedName || record?.intendedGuestName || record?.guestName),
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
    source: cleanString(record?.source)
  };
}

function normalizeContactRecord(key, record = {}) {
  const events = Array.isArray(record.events) ? record.events : [];
  const sortedEvents = [...events].sort((a, b) => {
    const left = cleanString(b.eventDate || b.registeredAt || b.updatedAt);
    const right = cleanString(a.eventDate || a.registeredAt || a.updatedAt);
    return left.localeCompare(right);
  });
  const latestEvent = sortedEvents[0] || {};
  const email = cleanString(record.email || key.replace(/^crm:contact:/, "")).toLowerCase();
  const contactStatus = contactStatusFromRegistration(latestEvent.registrationType || record.registrationType || record.source);
  return {
    key,
    id: email,
    createdAt: cleanString(record.createdAt),
    updatedAt: cleanString(record.updatedAt),
    name: cleanString(record.name) || email,
    company: cleanString(record.company),
    title: cleanString(record.title),
    industry: cleanString(record.industry),
    email,
    phone: cleanString(record.phone),
    source: cleanString(record.source),
    registrationId: cleanString(record.registrationId),
    registrationType: cleanString(record.registrationType),
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

async function registrants(env, type = "member") {
  const config = registrantTypes[cleanType(type)];
  const crmKeys = await listKeys(env, config.crmPrefix);
  const crmRows = await readRecords(env, crmKeys);
  const ids = new Set(crmRows.map((row) => row.id));

  const legacyKeys = await listKeys(env, config.legacyPrefix);
  const legacyRows = (await readRecords(env, legacyKeys)).filter((row) => !ids.has(row.id));

  const rows = [...crmRows, ...legacyRows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const row of [...rows].reverse()) {
    await upsertRegistrationContact(env, cleanType(type), row, {
      label: cleanType(type),
      source: row.source || `${cleanType(type)}-registration`
    }).catch(() => null);
  }
  return rows;
}

async function rebuildContactsFromRegistrants(env) {
  const types = ["member", "guest", "partner"];
  for (const type of types) {
    await registrants(env, type);
  }
}

async function contacts(env) {
  await rebuildContactsFromRegistrants(env);
  const keys = await listKeys(env, "crm:contact:");
  const rows = await readContactRecords(env, keys);
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
  const contactKeys = await listKeys(env, registrantTypes.contacts.crmPrefix);
  const contactEmails = new Set(contactKeys.map((key) => key.replace(registrantTypes.contacts.crmPrefix, "").toLowerCase()));
  const registrationRows = [];
  const counts = {
    contacts: contactKeys.length,
    guest: 0,
    member: 0,
    partner: 0,
    missingContacts: 0,
    debugAttempts: 0
  };

  for (const type of ["guest", "member", "partner"]) {
    const config = registrantTypes[type];
    const keys = [...new Set([
      ...(await listKeys(env, config.crmPrefix)),
      ...(await listKeys(env, config.legacyPrefix))
    ])];
    const seenRows = new Set();
    for (const key of keys) {
      const record = await readRawRecord(env, key);
      if (!record) continue;
      const row = normalizeRecord(key, record);
      const rowIdentity = row.id || `${row.email}:${row.createdAt}:${row.inviteCode}`;
      if (seenRows.has(rowIdentity)) continue;
      seenRows.add(rowIdentity);
      const expectedContactKey = row.email ? `${registrantTypes.contacts.crmPrefix}${row.email}` : "";
      const contactExists = row.email ? contactEmails.has(row.email) : false;
      registrationRows.push({
        key,
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
        contactKey: cleanString(record.contactKey) || expectedContactKey,
        contactExists
      });
    }
    counts[type] = seenRows.size;
  }

  registrationRows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const missingContacts = registrationRows.filter((row) => row.email && !row.contactExists);
  counts.missingContacts = missingContacts.length;

  const debugKeys = await listKeys(env, REGISTRATION_DEBUG_PREFIX);
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
  return {
    total: rows.length,
    newCount: rows.filter((row) => row.eventCount > 0).length,
    presenterCount: rows.reduce((sum, row) => sum + (row.eventCount || 0), 0),
    roundtableLeaderCount: rows.reduce((sum, row) => sum + (row.attendedCount || 0), 0),
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
    intendedGuestName: cleanString(record?.intendedGuestName || record?.invitedName || record?.guestName),
    invitedName: cleanString(record?.invitedName || record?.intendedGuestName || record?.guestName),
    guestName: cleanString(record?.guestName || record?.intendedGuestName || record?.invitedName),
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
  const intendedGuestName = cleanString(
    payload.intendedGuestName || payload.invitedName || payload.guestName || payload.name,
    240
  );
  const guestRegistrationType = cleanGuestRegistrationType(payload.guestRegistrationType || payload.registrationRole || payload.type);
  if (!eventSlug && !eventName) throw new Error("Select an event before generating an invite code.");
  if (!intendedGuestName) throw new Error("Enter the guest or user name before generating an invite code.");

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

  const deletedFromCompanies = await removeEmailFromCompanyContacts(env, email, actor);
  return {
    email,
    deletedKeys: [...new Set(deletedKeys)],
    deletedFromCompanies
  };
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
        "Name",
        "Company",
        "Title",
        "Email",
        "Phone",
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
        row.name,
        row.company,
        row.title,
        row.email,
        row.phone,
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
      const invites = await partnerInviteCodes(env);
      return json({
        ok: true,
        invite,
        partnerInviteCodes: invites,
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner invite code could not be created." }, { status: 500 });
    }
  }

  if (payload?.action === "create-registration-invite") {
    try {
      const invite = await createRegistrationInviteCode(env, payload, access.email);
      return json({
        ok: true,
        invite,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
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

  const type = cleanType(payload?.type);
  const key = cleanString(payload?.key);
  const rows = await registrants(env, type);
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) return json({ error: `${registrantTypes[type].label} registrant was not found.` }, { status: 404 });

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
  const crmStatus = allowedStatuses.has(payload?.crmStatus) ? payload.crmStatus : crmRow.crmStatus;
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes[type].crmType,
    crmStatus,
    memberTier: type === "member" ? cleanString(payload?.memberTier, 120) || crmRow.memberTier || "Fellow" : crmRow.memberTier,
    crmNotes: cleanString(payload?.crmNotes),
    crmUpdatedAt: new Date().toISOString(),
    crmUpdatedBy: access.email
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(crmKey, JSON.stringify(next));

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

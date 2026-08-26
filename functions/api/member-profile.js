import { getSessionUser } from "../_auth.js";
import { json } from "../_access-control.js";
import {
  deleteCrmStorageRecord,
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";

const MEMBER_PREFIX = "crm:member-registrant:";
const MEMBER_LEGACY_PREFIX = "member-registration:";
const CONTACT_PREFIX = "crm:contact:";
const GUEST_INVITE_PREFIX = "crm:guest-invite-code:";
const MEMBER_INVITE_PREFIX = "crm:member-invite-code:";
const FELLOWSHIP_NOMINATION_PREFIX = "crm:fellowship-nomination:";
const MONTHLY_MEMBER_INVITE_LIMIT = 2;
const FELLOWSHIP_LEVELS = [
  {
    tier: "Fellow",
    level: 1,
    minAttendance: 0,
    minPublications: 0,
    minGuestInvites: 0,
    minNominations: 0,
    approvalThreshold: 0,
    approvalLabel: "Accepted member in good standing"
  },
  {
    tier: "Contributing Fellow",
    level: 2,
    minAttendance: 1,
    minPublications: 2,
    minGuestInvites: 1,
    minNominations: 1,
    approvalThreshold: 0.5,
    approvalLabel: "Majority approval"
  },
  {
    tier: "Senior Fellow",
    level: 3,
    minAttendance: 3,
    minPublications: 4,
    minGuestInvites: 2,
    minNominations: 2,
    approvalThreshold: 2 / 3,
    approvalLabel: "Two-thirds approval"
  },
  {
    tier: "Distinguished Fellow",
    level: 4,
    minAttendance: 6,
    minPublications: 6,
    minGuestInvites: 3,
    minNominations: 3,
    approvalThreshold: 3 / 4,
    approvalLabel: "Three-fourths approval"
  }
];

function cleanString(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value) {
  return cleanString(value, 240).toLowerCase();
}

function cleanCode(value) {
  return cleanString(value).replace(/\D/g, "").slice(0, 6);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function randomInviteCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

function randomId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${randomInviteCode()}`;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function recordCount(record, numericFields = [], arrayFields = []) {
  const numeric = numericFields.reduce((max, field) => Math.max(max, numberValue(record?.[field])), 0);
  const arrayCount = arrayFields.reduce((sum, field) => {
    const value = record?.[field];
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);
  return Math.max(numeric, arrayCount);
}

function normalizeTier(value) {
  const tier = cleanString(value, 80);
  if (tier === "Executive Fellow") return "Senior Fellow";
  return FELLOWSHIP_LEVELS.some((level) => level.tier === tier) ? tier : "Fellow";
}

function levelForTier(tier) {
  return FELLOWSHIP_LEVELS.find((level) => level.tier === normalizeTier(tier)) || FELLOWSHIP_LEVELS[0];
}

function nextLevel(tier) {
  const current = levelForTier(tier);
  return FELLOWSHIP_LEVELS.find((level) => level.level === current.level + 1) || null;
}

async function listKeys(env, prefix) {
  return listCrmStorageKeys(env, prefix);
}

async function recordsForPrefix(env, prefix) {
  const keys = await listKeys(env, prefix);
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await readCrmStorageJson(env, key);
      return record ? { key, record } : null;
    })
  );
  return records.filter(Boolean);
}

function normalizeMember(entry) {
  const record = entry?.record || {};
  const createdAt = cleanString(record.createdAt) || cleanString(entry?.key).split(":").slice(-2, -1)[0] || "";
  const tier = normalizeTier(record.memberTier || record.tier);
  const sessionsAttended = recordCount(
    record,
    ["sessionsAttended", "intelligenceSessions", "sessionCount"],
    ["sessionAttendance", "sessions", "attendedSessions"]
  );
  const summitsAttended = recordCount(
    record,
    ["summitsAttended", "summitCount"],
    ["summitAttendance", "summits", "attendedSummits"]
  );
  const documentedContributions = recordCount(
    record,
    ["documentedContributions", "contributionCount"],
    ["contributions", "contributionRecords", "documentedContributionRecords"]
  );
  const publicationsContributedTo = recordCount(
    record,
    ["publicationsContributedTo", "publicationCount", "publishedContributionCount"],
    ["publications", "publicationRecords", "publishedContributions", "publicationContributions"]
  );
  return {
    key: entry.key,
    id: cleanString(record.id) || entry.key,
    name: cleanString(record.name),
    company: cleanString(record.company),
    title: cleanString(record.title),
    industry: cleanString(record.industry),
    email: cleanEmail(record.email),
    phone: cleanString(record.phone),
    tier,
    status: cleanString(record.memberStatus || record.crmStatus || "new"),
    crmStatus: cleanString(record.crmStatus || "new"),
    goodStanding: record.goodStanding !== false && cleanString(record.memberStanding || "good") !== "not-good",
    openToFellowshipNomination: Boolean(record.openToFellowshipNomination),
    memberSince: cleanString(record.acceptedAt || record.memberSince || createdAt),
    createdAt,
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    isPresenter: Boolean(record.isPresenter),
    isRoundtableLeader: Boolean(record.isRoundtableLeader),
    sessionsAttended: sessionsAttended || (record.eventName ? 1 : 0),
    summitsAttended,
    documentedContributions,
    publicationsContributedTo,
    contributionRecords: Array.isArray(record.contributionRecords)
      ? record.contributionRecords.slice(0, 20).map((item) => ({
        type: cleanString(item?.type, 120),
        title: cleanString(item?.title, 240),
        date: cleanString(item?.date, 80),
        notes: cleanString(item?.notes, 500)
      }))
      : []
  };
}

async function members(env) {
  const crmRows = await recordsForPrefix(env, MEMBER_PREFIX);
  const ids = new Set(crmRows.map((entry) => cleanString(entry.record?.id)));
  const legacyRows = (await recordsForPrefix(env, MEMBER_LEGACY_PREFIX)).filter(
    (entry) => !ids.has(cleanString(entry.record?.id))
  );
  const contactRows = await recordsForPrefix(env, CONTACT_PREFIX);
  const contactsByEmail = new Map(contactRows.map((entry) => [
    cleanEmail(entry.record?.email || entry.key.replace(CONTACT_PREFIX, "")),
    entry.record || {}
  ]));
  return [...crmRows, ...legacyRows]
    .map(normalizeMember)
    .filter((member) => member.email)
    .map((member) => {
      const contact = contactsByEmail.get(member.email);
      if (!contact) return member;
      const attendedEvents = Array.isArray(contact.events)
        ? contact.events.filter((event) => event?.attended === true).length
        : 0;
      const contactAttendance = recordCount(contact, ["attendedCount"], []) || attendedEvents;
      const contactPublications = recordCount(
        contact,
        ["publicationsContributedTo", "publicationCount", "publishedContributionCount"],
        ["publications", "publicationRecords", "publishedContributions", "publicationContributions"]
      );
      return {
        ...member,
        sessionsAttended: Math.max(member.sessionsAttended || 0, contactAttendance),
        publicationsContributedTo: Math.max(member.publicationsContributedTo || 0, contactPublications)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isAcceptedMember(member) {
  return (
    member.status === "accepted" ||
    member.crmStatus === "accepted" ||
    member.crmStatus === "confirmed"
  );
}

async function codeExists(env, code) {
  const keys = [
    `${GUEST_INVITE_PREFIX}${code}`,
    `${MEMBER_INVITE_PREFIX}${code}`,
    `guest-invite-code:${code}`,
    `member-invite-code:${code}`,
    `guest-invite:${code}`,
    `member-invite:${code}`
  ];
  for (const key of keys) {
    const record = await readCrmStorageJson(env, key);
    if (record) return true;
  }
  return false;
}

async function createUniqueCode(env) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = randomInviteCode();
    if (!(await codeExists(env, code))) return code;
  }
  throw new Error("Could not generate a unique invite code.");
}

function publicInvite(entry, requestUrl) {
  const record = entry.record || {};
  const type = cleanString(record.type || (entry.key.includes("member") ? "member" : "guest"));
  const code = cleanCode(record.code) || entry.key.split(":").pop();
  const path = type === "member" ? "/member-registration/" : "/guest/";
  const url = new URL(path, requestUrl);
  url.searchParams.set("invite", code);
  return {
    key: entry.key,
    type,
    code,
    status: cleanString(record.status || "active"),
    url: url.toString(),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    nomineeName: cleanString(record.nomineeName),
    nomineeEmail: cleanEmail(record.nomineeEmail),
    createdByMemberEmail: cleanEmail(record.createdByMemberEmail),
    createdByMemberName: cleanString(record.createdByMemberName),
    createdByMemberTier: normalizeTier(record.createdByMemberTier),
    createdAt: cleanString(record.createdAt),
    usedAt: cleanString(record.usedAt),
    usedBy: cleanString(record.usedBy),
    usedByName: cleanString(record.usedByName),
    usedByEmail: cleanEmail(record.usedByEmail || record.usedBy),
    usedFor: cleanString(record.usedFor || record.eventName),
    usedForDate: cleanString(record.usedForDate || record.eventDate)
  };
}

function nominationWindow(env, today = new Date()) {
  const configured = cleanString(env.MOJO_FELLOWSHIP_SUMMIT_DATES, 4000);
  let configuredValues = configured.split(/[\n,]/);
  if (configured.startsWith("[")) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed)) configuredValues = parsed;
    } catch {
      configuredValues = configured.split(/[\n,]/);
    }
  }
  const dates = configuredValues
    .map((value) => cleanString(value, 20))
    .filter(Boolean)
    .map((value) => new Date(`${value}T12:00:00Z`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const quarterEndDates = (year) => [2, 5, 8, 11].map((month) => new Date(Date.UTC(year, month + 1, 0, 12)));
  const fallbackDates = dates.length ? dates : [...quarterEndDates(today.getUTCFullYear()), ...quarterEndDates(today.getUTCFullYear() + 1)];
  const windows = fallbackDates.map((summitDate) => {
    const opensAt = new Date(summitDate);
    opensAt.setUTCDate(opensAt.getUTCDate() - 30);
    return {
      summitDate: dayKey(summitDate),
      opensAt: dayKey(opensAt),
      closesAt: dayKey(summitDate),
      open: today >= opensAt && today <= summitDate
    };
  });
  const active = windows.find((window) => window.open);
  const upcoming = windows.find((window) => new Date(`${window.closesAt}T23:59:59Z`) >= today) || windows[0];
  return {
    open: Boolean(active),
    configured: Boolean(dates.length),
    active: active || null,
    next: active || upcoming,
    policy: "Nominations open 30 days before each quarterly summit."
  };
}

async function memberInvites(env, email, requestUrl) {
  const entries = await allMemberInvites(env, requestUrl);
  return entries
    .filter((invite) => invite.createdByMemberEmail === email)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function allMemberInvites(env, requestUrl) {
  const prefixes = [GUEST_INVITE_PREFIX, MEMBER_INVITE_PREFIX];
  const entries = (await Promise.all(prefixes.map((prefix) => recordsForPrefix(env, prefix)))).flat();
  return entries
    .map((entry) => publicInvite(entry, requestUrl))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function deleteMemberOwnedInvite(env, email, payload = {}) {
  const key = cleanString(payload?.key, 300);
  const code = cleanCode(payload?.code);
  const type = cleanString(payload?.type) === "member" ? "member" : "guest";
  const prefix = type === "member" ? MEMBER_INVITE_PREFIX : GUEST_INVITE_PREFIX;
  const candidate = key || (code ? `${prefix}${code}` : "");
  if (!candidate || !candidate.startsWith(prefix)) {
    throw new Error("Invite link was not found.");
  }

  const record = await readCrmStorageJson(env, candidate);
  if (!record || cleanEmail(record.createdByMemberEmail) !== email) {
    throw new Error("Invite link was not found.");
  }

  await deleteCrmStorageRecord(env, candidate);
}

async function fellowshipNominations(env) {
  const entries = await recordsForPrefix(env, FELLOWSHIP_NOMINATION_PREFIX);
  return entries.map((entry) => {
    const record = entry.record || {};
    const votes = record.votes && typeof record.votes === "object" ? record.votes : {};
    const voteRows = Object.values(votes);
    const yesVotes = voteRows.filter((vote) => cleanString(vote?.vote) === "yes").length;
    const noVotes = voteRows.filter((vote) => cleanString(vote?.vote) === "no").length;
    const totalVotes = yesVotes + noVotes;
    const targetTier = normalizeTier(record.targetTier);
    const level = levelForTier(targetTier);
    return {
      key: entry.key,
      id: cleanString(record.id) || entry.key.split(":").pop(),
      status: cleanString(record.status || "active"),
      targetTier,
      approvalLabel: level.approvalLabel,
      approvalThreshold: level.approvalThreshold,
      candidateEmail: cleanEmail(record.candidateEmail),
      candidateName: cleanString(record.candidateName, 240),
      nominatorEmail: cleanEmail(record.nominatorEmail),
      nominatorName: cleanString(record.nominatorName, 240),
      createdAt: cleanString(record.createdAt),
      nominationReason: cleanString(record.nominationReason, 1200),
      levelFourEvidence: {
        executiveImpact: cleanString(record.levelFourEvidence?.executiveImpact, 1000),
        networkContribution: cleanString(record.levelFourEvidence?.networkContribution, 1000),
        memberCase: cleanString(record.levelFourEvidence?.memberCase, 1000)
      },
      yesVotes,
      noVotes,
      totalVotes,
      approvalPercent: totalVotes ? yesVotes / totalVotes : 0
    };
  });
}

function profileComplete(profile) {
  return Boolean(profile.name && profile.company && profile.title && profile.email);
}

function fellowshipStats(profile, nominations, invites = []) {
  const received = nominations.filter((nomination) => nomination.candidateEmail === profile.email);
  const yesVotes = received.reduce((sum, nomination) => sum + nomination.yesVotes, 0);
  const noVotes = received.reduce((sum, nomination) => sum + nomination.noVotes, 0);
  const totalAttendance = (profile.sessionsAttended || 0) + (profile.summitsAttended || 0);
  const guestInviteLinksCreated = invites.filter(
    (invite) => invite.type === "guest" && invite.createdByMemberEmail === profile.email
  ).length;
  return {
    currentTier: normalizeTier(profile.tier),
    level: levelForTier(profile.tier).level,
    goodStanding: Boolean(profile.goodStanding),
    profileComplete: profileComplete(profile),
    openToFellowshipNomination: Boolean(profile.openToFellowshipNomination),
    sessionsAttended: profile.sessionsAttended || 0,
    summitsAttended: profile.summitsAttended || 0,
    totalAttendance,
    documentedContributions: profile.documentedContributions || 0,
    publicationsContributedTo: profile.publicationsContributedTo || 0,
    guestInviteLinksCreated,
    nominationsReceived: received.length,
    yesVotes,
    noVotes,
    activeNominations: received.filter((nomination) => nomination.status === "active").length
  };
}

function eligibilityFor(profile, nominations, invites = []) {
  const stats = fellowshipStats(profile, nominations, invites);
  return FELLOWSHIP_LEVELS.map((level) => {
    const currentOrPast = level.level <= stats.level;
    const requirements = [
      { label: "Good standing", current: stats.goodStanding ? 1 : 0, required: 1, met: stats.goodStanding },
      { label: "Complete profile", current: stats.profileComplete ? 1 : 0, required: 1, met: stats.profileComplete },
      { label: "Sessions or summits attended", current: stats.totalAttendance, required: level.minAttendance, met: stats.totalAttendance >= level.minAttendance },
      { label: "Publications contributed to", current: stats.publicationsContributedTo, required: level.minPublications, met: stats.publicationsContributedTo >= level.minPublications },
      { label: "Guest invite links created", current: stats.guestInviteLinksCreated, required: level.minGuestInvites, met: stats.guestInviteLinksCreated >= level.minGuestInvites },
      { label: "Peer nominations received", current: stats.nominationsReceived, required: level.minNominations, met: stats.nominationsReceived >= level.minNominations }
    ];
    return {
      ...level,
      currentOrPast,
      requirements,
      technicallyEligible: requirements.filter((item) => item.label !== "Peer nominations received").every((item) => item.met),
      promotionEligible: requirements.every((item) => item.met)
    };
  });
}

function eligibleNominationTargets(allMembers, currentEmail, nominations, window, invites = []) {
  if (!window.open) return [];
  return allMembers
    .filter((member) => member.email !== currentEmail)
    .map((member) => {
      const next = nextLevel(member.tier);
      if (!next) return null;
      const eligibility = eligibilityFor(member, nominations, invites).find((level) => level.tier === next.tier);
      const existingActive = nominations.some(
        (nomination) =>
          nomination.status === "active" &&
          nomination.candidateEmail === member.email &&
          nomination.targetTier === next.tier
      );
      if (!member.openToFellowshipNomination || !eligibility?.technicallyEligible || existingActive) return null;
      return {
        email: member.email,
        name: member.name,
        company: member.company,
        title: member.title,
        currentTier: member.tier,
        targetTier: next.tier,
        requiresLevelFourEvidence: next.level === 4
      };
    })
    .filter(Boolean);
}

function memberImpact(profile, invites, nominations) {
  const memberCodes = invites.filter((invite) => invite.type === "member");
  const guestCodes = invites.filter((invite) => invite.type === "guest");
  const stats = fellowshipStats(profile, nominations, invites);
  return {
    intelligenceSessions: profile.sessionsAttended || 0,
    summitsAttended: profile.summitsAttended || 0,
    documentedContributions: profile.documentedContributions || 0,
    publicationsContributedTo: profile.publicationsContributedTo || 0,
    guestInviteLinksCreated: guestCodes.length,
    memberNominationsCreated: memberCodes.length,
    fellowshipNominationsReceived: stats.nominationsReceived,
    fellowshipYesVotesReceived: stats.yesVotes,
    fellowshipNoVotesReceived: stats.noVotes,
    memberNominationsThisMonth: memberCodes.filter((invite) => invite.createdAt.startsWith(monthKey())).length,
    roundtablesLed: profile.isRoundtableLeader ? 1 : 0,
    mentorshipEngagements: 0,
    yearsOfMembership: profile.memberSince
      ? Math.max(0, new Date().getFullYear() - new Date(profile.memberSince).getFullYear())
      : 0
  };
}

function staffContacts() {
  return [
    { name: "Membership", role: "Member support", email: "membership@mojoaisummits.com" },
    { name: "Angel Mosley", role: "VIP Engagement Director", email: "angel@mojoaisummits.com" },
    { name: "Gina Monroe", role: "Executive Research Curator", email: "gina@mojoaisummits.com" },
    { name: "Mojo AI Summits", role: "General team inbox", email: "hello@mojoaisummits.com" }
  ];
}

function discordContacts(env) {
  return {
    server: cleanString(env.MOJO_MEMBER_DISCORD_URL) || "Discord invite is provided directly by Mojo staff.",
    channels: [
      { name: "#announcements", purpose: "Summit and member network updates." },
      { name: "#executive-intelligence", purpose: "Session follow-ups, research themes, and briefing topics." },
      { name: "#member-introductions", purpose: "Warm peer introductions and new member welcomes." },
      { name: "#summit-guests", purpose: "Guest coordination for upcoming shows and events." },
      { name: "#help-desk", purpose: "Questions for the Mojo AI Summits team." }
    ]
  };
}

function tierGuide() {
  return FELLOWSHIP_LEVELS.map((level) => ({
    tier: level.tier,
    minimum: level.level === 1
      ? "Accepted member in good standing with a complete profile."
      : `${level.minAttendance} sessions or summits attended, ${level.minPublications} publication${level.minPublications === 1 ? "" : "s"} contributed to, ${level.minGuestInvites} guest invite${level.minGuestInvites === 1 ? "" : "s"} created, and ${level.minNominations} peer nomination${level.minNominations === 1 ? "" : "s"}.`,
    approval: level.approvalLabel,
    contribution: level.level === 3
      ? "Only attendance, publication, and guest-invite counts define technical eligibility. Senior Fellows are eligible for paid speaking opportunities after member approval."
      : level.level === 4
        ? "Only attendance, publication, and guest-invite counts define technical eligibility. Distinguished Fellows receive priority consideration for paid speaking opportunities after member approval."
        : "Only attendance, publication, and guest-invite counts define technical eligibility. Judgment, influence, and leadership quality are evaluated through nomination evidence and member voting."
  }));
}

async function authenticatedMember(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return { response: json({ error: "Sign in with your Mojo AI Summits member account." }, { status: 401 }) };
  }
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return { response: json({ error: "Member profile storage is not configured." }, { status: 500 }) };
  }

  const allMembers = await members(env);
  const profile = allMembers.find((member) => member.email === user.email);
  if (!profile || !isAcceptedMember(profile)) {
    return { response: json({ error: "This login is active, but no accepted member profile is connected to it." }, { status: 403 }) };
  }

  return {
    user,
    profile,
    allMembers: allMembers.filter(isAcceptedMember)
  };
}

export async function onRequestGet({ request, env }) {
  const access = await authenticatedMember(request, env);
  if (access.response) return access.response;

  const allInvites = await allMemberInvites(env, request.url);
  const invites = allInvites.filter((invite) => invite.createdByMemberEmail === access.profile.email);
  const nominations = await fellowshipNominations(env);
  const window = nominationWindow(env);
  return json({
    ok: true,
    profile: access.profile,
    directory: access.allMembers,
    invites,
    impact: memberImpact(access.profile, invites, nominations),
    fellowship: {
      stats: fellowshipStats(access.profile, nominations, invites),
      eligibility: eligibilityFor(access.profile, nominations, invites),
      nominationWindow: window,
      nominationTargets: eligibleNominationTargets(access.allMembers, access.profile.email, nominations, window, allInvites),
      receivedNominations: nominations.filter((nomination) => nomination.candidateEmail === access.profile.email),
      openNominations: nominations.filter((nomination) => nomination.status === "active")
    },
    monthlyMemberInviteLimit: MONTHLY_MEMBER_INVITE_LIMIT,
    tierGuide: tierGuide(),
    discord: discordContacts(env),
    staffContacts: staffContacts()
  });
}

export async function onRequestPost({ request, env }) {
  const access = await authenticatedMember(request, env);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  const action = cleanString(payload?.action);
  const createdAt = new Date().toISOString();

  if (action === "update-nomination-consent") {
    const existing = await readCrmStorageJson(env, access.profile.key);
    if (!existing) return json({ error: "Member profile record could not be updated." }, { status: 404 });
    const record = {
      ...existing,
      openToFellowshipNomination: Boolean(payload?.openToFellowshipNomination),
      fellowshipNominationConsentUpdatedAt: createdAt
    };
    await writeCrmStorageJson(env, access.profile.key, record);
    return json({ ok: true, openToFellowshipNomination: record.openToFellowshipNomination });
  }

  if (action === "create-fellowship-nomination") {
    const window = nominationWindow(env);
    if (!window.open) {
      return json({ error: "Fellowship nominations are currently closed." }, { status: 403 });
    }
    const nominations = await fellowshipNominations(env);
    const allInvites = await allMemberInvites(env, request.url);
    const targets = eligibleNominationTargets(access.allMembers, access.profile.email, nominations, window, allInvites);
    const targetEmail = cleanEmail(payload?.candidateEmail);
    const target = targets.find((candidate) => candidate.email === targetEmail);
    if (!target) {
      return json({ error: "This member is not currently eligible for nomination." }, { status: 400 });
    }
    const nominationReason = cleanString(payload?.nominationReason, 1200);
    if (!nominationReason) {
      return json({ error: "Add a nomination reason before submitting." }, { status: 400 });
    }
    const levelFourEvidence = {
      executiveImpact: cleanString(payload?.executiveImpact, 1000),
      networkContribution: cleanString(payload?.networkContribution, 1000),
      memberCase: cleanString(payload?.memberCase, 1000)
    };
    if (target.requiresLevelFourEvidence && !Object.values(levelFourEvidence).every(Boolean)) {
      return json({ error: "Distinguished Fellow nominations require all review evidence fields." }, { status: 400 });
    }
    const id = randomId();
    const record = {
      id,
      status: "active",
      targetTier: target.targetTier,
      candidateEmail: target.email,
      candidateName: target.name,
      candidateCompany: target.company,
      candidateTitle: target.title,
      nominatorEmail: access.profile.email,
      nominatorName: access.profile.name,
      nominatorTier: access.profile.tier,
      nominationReason,
      levelFourEvidence,
      createdAt,
      summitDate: window.next?.summitDate || "",
      votes: {}
    };
    const key = `${FELLOWSHIP_NOMINATION_PREFIX}${id}`;
    await writeCrmStorageJson(env, key, record);
    return json({ ok: true, nomination: { ...record, key } }, { status: 201 });
  }

  if (action === "vote-fellowship-nomination") {
    const id = cleanString(payload?.nominationId, 160);
    const vote = cleanString(payload?.vote, 10);
    if (!["yes", "no"].includes(vote)) return json({ error: "Vote must be yes or no." }, { status: 400 });
    const key = `${FELLOWSHIP_NOMINATION_PREFIX}${id}`;
    const record = await readCrmStorageJson(env, key);
    if (!record || cleanString(record.status || "active") !== "active") {
      return json({ error: "Fellowship nomination is not open for voting." }, { status: 404 });
    }
    if (cleanEmail(record.candidateEmail) === access.profile.email) {
      return json({ error: "Candidates cannot vote on their own promotion." }, { status: 403 });
    }
    record.votes = record.votes && typeof record.votes === "object" ? record.votes : {};
    record.votes[access.profile.email] = {
      vote,
      voterName: access.profile.name,
      voterTier: access.profile.tier,
      votedAt: createdAt
    };
    await writeCrmStorageJson(env, key, record);
    return json({ ok: true });
  }

  if (action === "create-guest-invite") {
    const code = await createUniqueCode(env);
    const base = {
      code,
      status: "active",
      eventName: cleanString(payload?.eventName, 240),
      eventDate: cleanString(payload?.eventDate, 120),
      createdAt,
      createdByMemberEmail: access.profile.email,
      createdByMemberName: access.profile.name,
      createdByMemberTier: access.profile.tier
    };
    const record = {
      ...base,
      type: "guest",
      intendedGuestName: cleanString(payload?.guestName, 240),
      intendedGuestEmail: cleanEmail(payload?.guestEmail)
    };
    const key = `${GUEST_INVITE_PREFIX}${code}`;
    await writeCrmStorageJson(env, key, record);
    return json({ ok: true, invite: publicInvite({ key, record }, request.url) }, { status: 201 });
  }

  if (action === "create-member-nomination") {
    const code = await createUniqueCode(env);
    const base = {
      code,
      status: "active",
      eventName: cleanString(payload?.eventName, 240),
      eventDate: cleanString(payload?.eventDate, 120),
      createdAt,
      createdByMemberEmail: access.profile.email,
      createdByMemberName: access.profile.name,
      createdByMemberTier: access.profile.tier
    };
    const existingInvites = await memberInvites(env, access.profile.email, request.url);
    const nominationsThisMonth = existingInvites.filter(
      (invite) => invite.type === "member" && invite.createdAt.startsWith(monthKey())
    ).length;
    if (nominationsThisMonth >= MONTHLY_MEMBER_INVITE_LIMIT) {
      return json({
        error: `Members can create ${MONTHLY_MEMBER_INVITE_LIMIT} member nomination links per month.`
      }, { status: 429 });
    }

    const record = {
      ...base,
      type: "member",
      nomineeName: cleanString(payload?.nomineeName, 240),
      nomineeEmail: cleanEmail(payload?.nomineeEmail),
      nomineeCompany: cleanString(payload?.nomineeCompany, 240),
      nomineeTitle: cleanString(payload?.nomineeTitle, 240),
      nominationNote: cleanString(payload?.nominationNote, 1000)
    };
    const key = `${MEMBER_INVITE_PREFIX}${code}`;
    await writeCrmStorageJson(env, key, record);
    return json({ ok: true, invite: publicInvite({ key, record }, request.url) }, { status: 201 });
  }

  if (action === "delete-invite") {
    try {
      await deleteMemberOwnedInvite(env, access.profile.email, payload);
      return json({
        ok: true,
        invites: await memberInvites(env, access.profile.email, request.url)
      });
    } catch (error) {
      return json({ error: error.message || "Invite link could not be deleted." }, { status: 404 });
    }
  }

  return json({ error: "Unknown member profile action." }, { status: 400 });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "content-type": "application/json; charset=utf-8" } });
}

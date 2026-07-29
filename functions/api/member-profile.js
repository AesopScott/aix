import { getSessionUser } from "../_auth.js";
import { json } from "../_access-control.js";

const MEMBER_PREFIX = "crm:member-registrant:";
const MEMBER_LEGACY_PREFIX = "member-registration:";
const GUEST_INVITE_PREFIX = "crm:guest-invite-code:";
const MEMBER_INVITE_PREFIX = "crm:member-invite-code:";
const MONTHLY_MEMBER_INVITE_LIMIT = 2;

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

function randomInviteCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

async function listKeys(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const result = await env.MOJO_SUMMITS_SETUP_STATE.list({ prefix, cursor, limit: 1000 });
    keys.push(...result.keys.map((entry) => entry.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  return keys;
}

async function recordsForPrefix(env, prefix) {
  const keys = await listKeys(env, prefix);
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? { key, record } : null;
    })
  );
  return records.filter(Boolean);
}

function normalizeMember(entry) {
  const record = entry?.record || {};
  const createdAt = cleanString(record.createdAt) || cleanString(entry?.key).split(":").slice(-2, -1)[0] || "";
  return {
    key: entry.key,
    id: cleanString(record.id) || entry.key,
    name: cleanString(record.name),
    company: cleanString(record.company),
    title: cleanString(record.title),
    industry: cleanString(record.industry),
    email: cleanEmail(record.email),
    phone: cleanString(record.phone),
    tier: cleanString(record.memberTier || record.tier) || "Fellow",
    status: cleanString(record.memberStatus || record.crmStatus || "new"),
    crmStatus: cleanString(record.crmStatus || "new"),
    memberSince: cleanString(record.acceptedAt || record.memberSince || createdAt),
    createdAt,
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    isPresenter: Boolean(record.isPresenter),
    isRoundtableLeader: Boolean(record.isRoundtableLeader)
  };
}

async function members(env) {
  const crmRows = await recordsForPrefix(env, MEMBER_PREFIX);
  const ids = new Set(crmRows.map((entry) => cleanString(entry.record?.id)));
  const legacyRows = (await recordsForPrefix(env, MEMBER_LEGACY_PREFIX)).filter(
    (entry) => !ids.has(cleanString(entry.record?.id))
  );
  return [...crmRows, ...legacyRows]
    .map(normalizeMember)
    .filter((member) => member.email)
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
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
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
    createdAt: cleanString(record.createdAt),
    usedAt: cleanString(record.usedAt),
    usedBy: cleanEmail(record.usedBy)
  };
}

async function memberInvites(env, email, requestUrl) {
  const prefixes = [GUEST_INVITE_PREFIX, MEMBER_INVITE_PREFIX];
  const entries = (await Promise.all(prefixes.map((prefix) => recordsForPrefix(env, prefix)))).flat();
  return entries
    .filter((entry) => cleanEmail(entry.record?.createdByMemberEmail) === email)
    .map((entry) => publicInvite(entry, requestUrl))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function memberImpact(profile, invites) {
  const memberCodes = invites.filter((invite) => invite.type === "member");
  const guestCodes = invites.filter((invite) => invite.type === "guest");
  return {
    intelligenceSessions: profile.eventName ? 1 : 0,
    guestInviteLinksCreated: guestCodes.length,
    memberNominationsCreated: memberCodes.length,
    memberNominationsThisMonth: memberCodes.filter((invite) => invite.createdAt.startsWith(monthKey())).length,
    roundtablesLed: profile.isRoundtableLeader ? 1 : 0,
    publicationsContributedTo: 0,
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
  return [
    {
      tier: "Fellow",
      minimum: "Accepted member in good standing.",
      commitments: "Attend sessions, share perspective, complete occasional research surveys, and make thoughtful introductions.",
      contribution: "Baseline participation and two thoughtful member invitations or nominations per month when appropriate."
    },
    {
      tier: "Contributing Fellow",
      minimum: "Active participation across multiple sessions or research efforts.",
      commitments: "Vote on topics, join priority roundtables, and contribute useful field experience.",
      contribution: "Visible participation, research interviews, guest introductions, and private discussion involvement."
    },
    {
      tier: "Executive Fellow",
      minimum: "Help create the network's intellectual property.",
      commitments: "Lead discussions, review briefs, mentor newer members, write commentary, or host sessions.",
      contribution: "Recognized leadership in sessions, publications, mentorship, and research advisory work."
    },
    {
      tier: "Distinguished Fellow",
      minimum: "Sustained executive influence and multi-year contribution.",
      commitments: "Chair initiatives, guide strategy, mentor at depth, and help define the community's direction.",
      contribution: "Quarterly member-voted recognition for executives whose contribution materially strengthens the network."
    }
  ];
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

  const invites = await memberInvites(env, access.profile.email, request.url);
  return json({
    ok: true,
    profile: access.profile,
    directory: access.allMembers,
    invites,
    impact: memberImpact(access.profile, invites),
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

  if (action === "create-guest-invite") {
    const record = {
      ...base,
      type: "guest",
      intendedGuestName: cleanString(payload?.guestName, 240),
      intendedGuestEmail: cleanEmail(payload?.guestEmail)
    };
    const key = `${GUEST_INVITE_PREFIX}${code}`;
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record));
    return json({ ok: true, invite: publicInvite({ key, record }, request.url) }, { status: 201 });
  }

  if (action === "create-member-nomination") {
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
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record));
    return json({ ok: true, invite: publicInvite({ key, record }, request.url) }, { status: 201 });
  }

  return json({ error: "Unknown member profile action." }, { status: 400 });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "content-type": "application/json; charset=utf-8" } });
}

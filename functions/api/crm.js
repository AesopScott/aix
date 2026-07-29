const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

import {
  createUser,
  getUserByEmail,
  updateUser
} from "../_auth.js";

const registrantTypes = {
  member: {
    label: "Member",
    section: "member-registrants",
    crmType: "member-registrant",
    crmPrefix: "crm:member-registrant:",
    legacyPrefix: "member-registration:",
    csvFilename: "mojo-ai-summits-member-registrants.csv"
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

const PARTNER_INVITE_PREFIX = "crm:partner-invite-code:";
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
    partnerCompany: cleanString(record?.partnerCompany),
    partnerTier: cleanString(record?.partnerTier),
    memberTier: cleanString(record?.memberTier) || "Fellow",
    memberStatus: cleanString(record?.memberStatus),
    memberPassword: cleanString(record?.memberPassword, 120),
    memberPasswordGeneratedAt: cleanString(record?.memberPasswordGeneratedAt),
    memberPasswordGeneratedBy: cleanString(record?.memberPasswordGeneratedBy),
    acceptedAt: cleanString(record?.acceptedAt),
    isPresenter: Boolean(record?.isPresenter),
    isRoundtableLeader: Boolean(record?.isRoundtableLeader),
    publicationUseName: Boolean(record?.publicationUseName),
    publicationUseCompany: Boolean(record?.publicationUseCompany),
    foodPreferences: Array.isArray(record?.foodPreferences)
      ? record.foodPreferences.map(cleanString).filter(Boolean)
      : [],
    foodNotes: cleanString(record?.foodNotes),
    crmStatus: allowedStatuses.has(record?.crmStatus) ? record.crmStatus : "new",
    crmNotes: cleanString(record?.crmNotes),
    crmUpdatedAt: cleanString(record?.crmUpdatedAt),
    crmUpdatedBy: cleanString(record?.crmUpdatedBy),
    source: cleanString(record?.source)
  };
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

async function registrants(env, type = "member") {
  const config = registrantTypes[cleanType(type)];
  const crmKeys = await listKeys(env, config.crmPrefix);
  const crmRows = await readRecords(env, crmKeys);
  const ids = new Set(crmRows.map((row) => row.id));

  const legacyKeys = await listKeys(env, config.legacyPrefix);
  const legacyRows = (await readRecords(env, legacyKeys)).filter((row) => !ids.has(row.id));

  return [...crmRows, ...legacyRows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
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
    partnerCompany: cleanString(record?.partnerCompany),
    partnerContactEmail: cleanString(record?.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(record?.partnerTier),
    createdAt: cleanString(record?.createdAt),
    createdBy: cleanString(record?.createdBy),
    usedAt: cleanString(record?.usedAt),
    usedBy: cleanString(record?.usedBy),
    registrationId: cleanString(record?.registrationId)
  };
}

async function partnerInviteCodes(env) {
  const keys = await listKeys(env, PARTNER_INVITE_PREFIX);
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeInviteCode(key, record) : null;
    })
  );
  return rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function codeExists(env, code) {
  const keys = [
    `${PARTNER_INVITE_PREFIX}${code}`,
    `partner-invite-code:${code}`,
    `partner-invite:${code}`
  ];
  for (const key of keys) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (record) return true;
  }
  return false;
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
  const type = cleanType(url.searchParams.get("type"));
  const config = registrantTypes[type];
  const rows = await registrants(env, type);

  if (url.searchParams.get("download") === "csv") {
    const csv = [
      [
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
        "Publication Use Name",
        "Publication Use Company",
        "Food Preferences",
        "Food Notes",
        "CRM Notes"
      ],
      ...rows.map((row) => [
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
        row.publicationUseName ? "Yes" : "No",
        row.publicationUseCompany ? "Yes" : "No",
        row.foodPreferences.join("; "),
        row.foodNotes,
        row.crmNotes
      ])
    ]
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
    summary: summarize(rows),
    rows,
    partnerInviteCodes: await partnerInviteCodes(env)
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
        partnerInviteCodes: await partnerInviteCodes(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Member password could not be generated." }, { status: 500 });
    }
  }

  if (payload?.action === "create-partner-invite") {
    try {
      const invite = await createPartnerInviteCode(env, payload, access.email);
      const invites = await partnerInviteCodes(env);
      return json({
        ok: true,
        invite,
        partnerInviteCodes: invites
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner invite code could not be created." }, { status: 500 });
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
    partnerInviteCodes: await partnerInviteCodes(env)
  });
}

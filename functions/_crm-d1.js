const crmD1Table = "crm_records";

function cleanString(value, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanEmail(value) {
  return cleanString(value, 240).toLowerCase();
}

function cleanCode(value) {
  return cleanString(value, 40).replace(/\D/g, "").slice(0, 12);
}

function crmDb(env = {}) {
  return env.MOJO_SUMMITS_DB || env.mojo_ai_summits_crm || null;
}

export function crmD1Available(env = {}) {
  return Boolean(crmDb(env)?.prepare);
}

export function crmD1Primary(env = {}) {
  return crmD1Available(env) && cleanString(env.MOJO_CRM_D1_PRIMARY).toLowerCase() === "true";
}

function upperBoundForPrefix(prefix = "") {
  return `${prefix}\uffff`;
}

function normalizeRecordForIndex(key = "", record = {}) {
  const prefix = Object.entries({
    "crm:contact:": "contact",
    "crm:member-registrant:": "member-registrant",
    "crm:guest-registrant:": "guest-registrant",
    "crm:partner-registrant:": "partner-registrant",
    "member-registration:": "legacy-member-registration",
    "guest-registration:": "legacy-guest-registration",
    "partner-registration:": "legacy-partner-registration",
    "crm:member-invite-code:": "member-invite-code",
    "crm:guest-invite-code:": "guest-invite-code",
    "crm:partner-invite-code:": "partner-invite-code",
    "crm:guest-matrix-prospect:": "guest-matrix-prospect",
    "crm:partner-matrix-prospect:": "partner-matrix-prospect",
    "crm:partner-prospect-company:": "partner-prospect-company",
    "crm:partner-prospect-person:": "partner-prospect-person",
    "crm:partner-prospect-audit:": "partner-prospect-audit",
    "crm:partner-prospect-debug:": "partner-prospect-debug",
    "crm:partner-prospect-source:": "partner-prospect-source",
    "crm:company:": "company",
    "partner-company:": "partner-company",
    "member-company:": "member-company",
    "guest-company:": "guest-company",
    "crm:email-log:": "email-log",
    "crm:registration-debug:": "registration-debug",
    "crm:phone-verification-debug:": "phone-verification-debug",
    "crm:fellowship-nomination:": "fellowship-nomination",
    "scheduling:employees:index:v1": "scheduling-employee-index",
    "scheduling:employee:": "scheduling-employee",
    "scheduling:booking:": "scheduling-booking",
    "scheduling:hold:": "scheduling-hold",
    "scheduling:calendar-connections:": "scheduling-calendar-connection-index",
    "scheduling:calendar-connection:": "scheduling-calendar-connection",
    "scheduling:oauth-state:": "scheduling-oauth-state",
    "event-playbooks:index": "event-playbook-index",
    "event-playbook:": "event-playbook",
    "invite-request:": "invite-request",
    "sms:notification:": "sms-notification",
    "sms:notifications:": "sms-notification-state",
    "sms:inbound:": "sms-inbound",
    "sms:opt-out:": "sms-opt-out",
    "sms:verified-phone:": "verified-phone",
    "virtual-event:": "virtual-event-state",
    "crm/invite-usage/": "invite-usage",
    "crm/registrations/": "registration",
    "crm-overflow/registrations/": "registration-overflow"
  }).find(([candidate]) => key.startsWith(candidate));

  const keyType = prefix?.[1] || "";
  const type = cleanString(keyType || record.crmType || record.type, 120);
  return {
    namespace: prefix?.[1] || "crm",
    type,
    email: cleanEmail(record.email || record.usedByEmail || record.usedBy || record.intendedGuestEmail || record.invitedEmail || record.guestEmail || record.partnerContactEmail),
    code: cleanCode(record.code || record.inviteCode),
    status: cleanString(record.crmStatus || record.guestStatus || record.registrationStatus || record.status, 120),
    eventSlug: cleanString(record.eventSlug, 240),
    eventId: cleanString(record.eventId, 240),
    eventShowId: cleanString(record.eventShowId, 80),
    name: cleanString(record.name || record.usedByName || record.intendedGuestName || record.invitedName || record.guestName || record.partnerContactName, 240),
    company: cleanString(record.company || record.partnerCompany || record.organization, 240),
    linkedinProfileUrl: cleanString(record.linkedinProfileUrl || record.linkedInProfileUrl || record.linkedinUrl || record.linkedInUrl, 500),
    createdAt: cleanString(record.createdAt || record.usedAt || record.addedAt, 80),
    updatedAt: cleanString(record.updatedAt || record.crmUpdatedAt || record.modifiedAt, 80)
  };
}

export async function readCrmD1Json(env, key) {
  const db = crmDb(env);
  const cleanKey = cleanString(key, 600);
  if (!db?.prepare || !cleanKey) return null;
  const row = await db.prepare(`SELECT payload_json FROM ${crmD1Table} WHERE key = ?`).bind(cleanKey).first().catch(() => null);
  if (!row?.payload_json) return null;
  return JSON.parse(row.payload_json);
}

export async function listCrmD1Keys(env, prefix) {
  const db = crmDb(env);
  const cleanPrefix = cleanString(prefix, 600);
  if (!db?.prepare || !cleanPrefix) return [];
  const result = await db.prepare(
    `SELECT key FROM ${crmD1Table} WHERE key >= ? AND key < ? ORDER BY key`
  ).bind(cleanPrefix, upperBoundForPrefix(cleanPrefix)).all().catch(() => null);
  return (result?.results || []).map((row) => cleanString(row.key)).filter(Boolean);
}

function boundedInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function orderByClause(sort = "updated_at", direction = "desc") {
  const column = {
    key: "key",
    name: "name",
    company: "company",
    status: "status",
    created_at: "created_at",
    updated_at: "updated_at",
    createdAt: "created_at",
    updatedAt: "updated_at"
  }[cleanString(sort, 40)] || "updated_at";
  const dir = cleanString(direction, 8).toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${column} ${dir}, key ${dir}`;
}

function listWhereClause({
  prefix = "",
  recordTypes = [],
  status = "",
  eventSlug = "",
  eventShowId = "",
  company = "",
  search = ""
} = {}) {
  const clauses = [];
  const binds = [];
  const cleanPrefix = cleanString(prefix, 600);
  if (cleanPrefix) {
    clauses.push("key >= ? AND key < ?");
    binds.push(cleanPrefix, upperBoundForPrefix(cleanPrefix));
  }

  const types = Array.isArray(recordTypes)
    ? recordTypes.map((value) => cleanString(value, 120)).filter(Boolean)
    : [];
  if (types.length) {
    clauses.push(`record_type IN (${types.map(() => "?").join(", ")})`);
    binds.push(...types);
  }

  const cleanStatus = cleanString(status, 120).toLowerCase();
  if (cleanStatus && cleanStatus !== "all") {
    clauses.push("lower(status) = ?");
    binds.push(cleanStatus);
  }

  const cleanEventSlug = cleanString(eventSlug, 240).toLowerCase();
  if (cleanEventSlug && cleanEventSlug !== "all") {
    clauses.push("(lower(event_slug) = ? OR lower(event_id) = ?)");
    binds.push(cleanEventSlug, cleanEventSlug);
  }

  const cleanShow = cleanString(eventShowId, 80).toLowerCase();
  if (cleanShow && cleanShow !== "all") {
    if (cleanShow === "morning" || cleanShow === "afternoon") {
      clauses.push("(lower(event_show_id) = ? OR lower(event_show_id) = 'both')");
      binds.push(cleanShow);
    } else {
      clauses.push("lower(event_show_id) = ?");
      binds.push(cleanShow);
    }
  }

  const cleanCompany = cleanString(company, 240).toLowerCase();
  if (cleanCompany && cleanCompany !== "all") {
    clauses.push("lower(company) = ?");
    binds.push(cleanCompany);
  }

  const cleanSearch = cleanString(search, 240).toLowerCase();
  if (cleanSearch) {
    const pattern = `%${cleanSearch.replace(/[%_]/g, "\\$&")}%`;
    clauses.push(`(
      lower(name) LIKE ? ESCAPE '\\' OR
      lower(email) LIKE ? ESCAPE '\\' OR
      lower(company) LIKE ? ESCAPE '\\' OR
      lower(code) LIKE ? ESCAPE '\\' OR
      lower(linkedin_profile_url) LIKE ? ESCAPE '\\'
    )`);
    binds.push(pattern, pattern, pattern, pattern, pattern);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    binds
  };
}

export async function listCrmD1Json(env, options = {}) {
  const db = crmDb(env);
  if (!db?.prepare) return { rows: [], total: 0 };
  const limit = boundedInteger(options.limit, 100, 1, 500);
  const offset = boundedInteger(options.offset, 0, 0, 100000);
  const { where, binds } = listWhereClause(options);
  const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM ${crmD1Table} ${where}`)
    .bind(...binds)
    .first()
    .catch(() => null);
  const result = await db.prepare(`
    SELECT key, payload_json
    FROM ${crmD1Table}
    ${where}
    ORDER BY ${orderByClause(options.sort, options.direction)}
    LIMIT ? OFFSET ?
  `).bind(...binds, limit, offset).all().catch(() => null);

  return {
    total: Number(totalRow?.total || 0),
    rows: (result?.results || []).map((row) => {
      if (!row?.payload_json) return null;
      try {
        return {
          key: cleanString(row.key, 600),
          record: JSON.parse(row.payload_json)
        };
      } catch {
        return null;
      }
    }).filter(Boolean)
  };
}

export async function listAllCrmD1Json(env, options = {}) {
  const db = crmDb(env);
  if (!db?.prepare) return [];
  const { where, binds } = listWhereClause(options);
  const result = await db.prepare(`
    SELECT key, payload_json
    FROM ${crmD1Table}
    ${where}
    ORDER BY ${orderByClause(options.sort, options.direction)}
  `).bind(...binds).all().catch(() => null);

  return (result?.results || []).map((row) => {
    if (!row?.payload_json) return null;
    try {
      return {
        key: cleanString(row.key, 600),
        record: JSON.parse(row.payload_json)
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function uniqueCleanStrings(values = [], max = 500, transform = (value) => value) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const cleaned = transform(cleanString(value, max));
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }
  return output;
}

export async function searchCrmD1Json(env, { emails = [], names = [], linkedInUrls = [] } = {}) {
  const db = crmDb(env);
  if (!db?.prepare) return [];

  const clauses = [];
  const binds = [];
  const addExact = (column, value) => {
    clauses.push(`${column} = ?`);
    binds.push(value);
  };
  const addLower = (column, value) => {
    clauses.push(`lower(${column}) = ?`);
    binds.push(value);
  };

  for (const email of uniqueCleanStrings(emails, 240, (value) => value.toLowerCase())) {
    addExact("email", email);
  }
  for (const name of uniqueCleanStrings(names, 240, (value) => value.toLowerCase().replace(/\s+/g, " "))) {
    addLower("name", name);
  }
  for (const linkedInUrl of uniqueCleanStrings(linkedInUrls, 500, (value) => value.toLowerCase().replace(/\/+$/, ""))) {
    addLower("linkedin_profile_url", linkedInUrl);
  }

  if (!clauses.length) return [];

  const result = await db.prepare(`
    SELECT key, payload_json
    FROM ${crmD1Table}
    WHERE ${clauses.join(" OR ")}
    ORDER BY
      CASE WHEN record_type = 'contact' THEN 0 ELSE 1 END,
      updated_at DESC,
      created_at DESC
    LIMIT 100
  `).bind(...binds).all().catch(() => null);

  return (result?.results || []).map((row) => {
    if (!row?.payload_json) return null;
    try {
      return {
        ...JSON.parse(row.payload_json),
        sourceKey: cleanString(row.key, 600)
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function writeCrmD1Json(env, key, record = {}) {
  const db = crmDb(env);
  const cleanKey = cleanString(key, 600);
  if (!db?.prepare || !cleanKey) return false;
  const payloadJson = JSON.stringify(record || {});
  const index = normalizeRecordForIndex(cleanKey, record || {});
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO ${crmD1Table} (
      key, namespace, record_type, email, code, status, event_slug, event_id,
      event_show_id, name, company, linkedin_profile_url, created_at, updated_at,
      payload_json, d1_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      namespace = excluded.namespace,
      record_type = excluded.record_type,
      email = excluded.email,
      code = excluded.code,
      status = excluded.status,
      event_slug = excluded.event_slug,
      event_id = excluded.event_id,
      event_show_id = excluded.event_show_id,
      name = excluded.name,
      company = excluded.company,
      linkedin_profile_url = excluded.linkedin_profile_url,
      created_at = CASE
        WHEN excluded.created_at != '' THEN excluded.created_at
        ELSE created_at
      END,
      updated_at = excluded.updated_at,
      payload_json = excluded.payload_json,
      d1_updated_at = excluded.d1_updated_at
  `).bind(
    cleanKey,
    index.namespace,
    index.type,
    index.email,
    index.code,
    index.status,
    index.eventSlug,
    index.eventId,
    index.eventShowId,
    index.name,
    index.company,
    index.linkedinProfileUrl,
    index.createdAt,
    index.updatedAt,
    payloadJson,
    now
  ).run();
  return true;
}

export async function deleteCrmD1Record(env, key) {
  const db = crmDb(env);
  const cleanKey = cleanString(key, 600);
  if (!db?.prepare || !cleanKey) return false;
  await db.prepare(`DELETE FROM ${crmD1Table} WHERE key = ?`).bind(cleanKey).run();
  return true;
}

export async function listCrmStorageKeys(env, prefix) {
  const keys = await listCrmD1Keys(env, prefix).catch(() => []);
  const store = env?.MOJO_SUMMITS_SETUP_STATE;
  if (crmD1Primary(env) || !store?.list) return [...new Set(keys)];

  let cursor;
  do {
    const result = await store.list({ prefix, cursor, limit: 1000 }).catch(() => null);
    if (!result) break;
    keys.push(...(result.keys || []).map((entry) => cleanString(entry.name)).filter(Boolean));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return [...new Set(keys)];
}

export async function readCrmStorageJson(env, key) {
  const d1Record = await readCrmD1Json(env, key).catch(() => null);
  if (d1Record) return d1Record;
  if (crmD1Primary(env) || !env?.MOJO_SUMMITS_SETUP_STATE?.get) return null;
  return env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null) || null;
}

export async function writeCrmStorageJson(env, key, record = {}, options = {}) {
  await writeCrmD1Json(env, key, record).catch(() => false);
  if (!crmD1Primary(env) && env?.MOJO_SUMMITS_SETUP_STATE?.put) {
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record || {}), options);
  }
}

export async function deleteCrmStorageRecord(env, key) {
  await deleteCrmD1Record(env, key).catch(() => false);
  if (!crmD1Primary(env) && env?.MOJO_SUMMITS_SETUP_STATE?.delete) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
  }
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const CRM_PREFIX = "crm:vip-registrant:";
const LEGACY_VIP_PREFIX = "vip-registration:";
const allowedStatuses = new Set(["new", "contacted", "confirmed", "waitlist", "declined"]);
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

function parseAllowedEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function parseCookies(value) {
  return Object.fromEntries(
    String(value || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  return atob(padded);
}

function emailFromAccessJwt(token) {
  const [, payload] = String(token || "").split(".");
  if (!payload) return "";

  try {
    const claims = JSON.parse(decodeBase64Url(payload));
    return String(claims.email || claims.common_name || "").toLowerCase();
  } catch {
    return "";
  }
}

function accessSessionEmail(request) {
  const headerEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (headerEmail) return headerEmail.toLowerCase();

  const assertionEmail = emailFromAccessJwt(request.headers.get("Cf-Access-Jwt-Assertion"));
  if (assertionEmail) return assertionEmail;

  const cookies = parseCookies(request.headers.get("cookie"));
  const authorizationCookieEmail = emailFromAccessJwt(cookies.CF_Authorization);
  if (authorizationCookieEmail) return authorizationCookieEmail;

  const host = new URL(request.url).hostname.toLowerCase();
  const hasAccessCookie = Boolean(cookies.CF_Authorization || cookies.CF_AppSession);
  if (host === "mojoaisummits.com" && hasAccessCookie) {
    return "cloudflare-access-session@mojoaisummits.com";
  }

  return "";
}

function requireCrmAccess(request, env, data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };

  const email = accessSessionEmail(request);
  const allowedEmails = parseAllowedEmails(env.MOJO_STORAGE_ALLOWED_EMAILS);
  const openForLocalDev = env.MOJO_STORAGE_ALLOW_OPEN === "true";
  const host = new URL(request.url).hostname.toLowerCase();

  if (!email && (openForLocalDev || host === "127.0.0.1" || host === "localhost")) {
    return { email: "local-dev@mojoaisummits.com" };
  }

  if (!email) {
    return {
      response: json(
        {
          error:
            "CRM is locked until Cloudflare Access is configured for this route."
        },
        { status: 403 }
      )
    };
  }

  const normalizedEmail = email.toLowerCase();
  if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
    return {
      response: json({ error: "This account is not approved for CRM access." }, { status: 403 })
    };
  }

  return { email: normalizedEmail };
}

function cleanString(value) {
  return typeof value === "string"
    ? value.trim().slice(0, maxFieldLength)
    : "";
}

function normalizeRecord(key, record) {
  const createdAt = cleanString(record?.createdAt) || key.split(":").slice(-2, -1)[0] || "";
  return {
    key,
    id: cleanString(record?.id) || key,
    createdAt,
    name: cleanString(record?.name),
    email: cleanString(record?.email).toLowerCase(),
    phone: cleanString(record?.phone),
    inviteCode: cleanString(record?.inviteCode),
    phoneVerificationStatus: cleanString(record?.phoneVerificationStatus) || "unverified",
    isPresenter: Boolean(record?.isPresenter),
    isRoundtableLeader: Boolean(record?.isRoundtableLeader),
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

async function vipRegistrants(env) {
  const crmKeys = await listKeys(env, CRM_PREFIX);
  const crmRows = await readRecords(env, crmKeys);
  const ids = new Set(crmRows.map((row) => row.id));

  const legacyKeys = await listKeys(env, LEGACY_VIP_PREFIX);
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

function crmRecordKey(row) {
  return row.key.startsWith(CRM_PREFIX)
    ? row.key
    : `${CRM_PREFIX}${row.createdAt || new Date().toISOString()}:${row.id}`;
}

async function ensureCrmRecord(env, row) {
  const key = crmRecordKey(row);
  if (key === row.key) return { key, row };

  const next = {
    ...row,
    crmType: "vip-registrant"
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(next));
  return { key, row: normalizeRecord(key, next) };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const access = requireCrmAccess(request, env, data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const rows = await vipRegistrants(env);

  if (url.searchParams.get("download") === "csv") {
    const csv = [
      [
        "Registered At",
        "Status",
        "Name",
        "Email",
        "Phone",
        "Invite Code",
        "Phone Verification",
        "Presenter",
        "Round Table Leader",
        "Food Preferences",
        "Food Notes",
        "CRM Notes"
      ],
      ...rows.map((row) => [
        row.createdAt,
        row.crmStatus,
        row.name,
        row.email,
        row.phone,
        row.inviteCode,
        row.phoneVerificationStatus,
        row.isPresenter ? "Yes" : "No",
        row.isRoundtableLeader ? "Yes" : "No",
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
        "content-disposition": "attachment; filename=\"mojo-ai-summits-vip-registrants.csv\""
      }
    });
  }

  return json({
    ok: true,
    section: "vip-registrants",
    summary: summarize(rows),
    rows
  });
}

export async function onRequestPost({ request, env, data }) {
  const access = requireCrmAccess(request, env, data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const key = cleanString(payload?.key);
  const rows = await vipRegistrants(env);
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) return json({ error: "VIP registrant was not found." }, { status: 404 });

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row);
  const crmStatus = allowedStatuses.has(payload?.crmStatus) ? payload.crmStatus : crmRow.crmStatus;
  const next = {
    ...crmRow,
    key: undefined,
    crmType: "vip-registrant",
    crmStatus,
    crmNotes: cleanString(payload?.crmNotes),
    crmUpdatedAt: new Date().toISOString(),
    crmUpdatedBy: access.email
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(crmKey, JSON.stringify(next));

  const nextRows = await vipRegistrants(env);
  return json({
    ok: true,
    summary: summarize(nextRows),
    rows: nextRows
  });
}

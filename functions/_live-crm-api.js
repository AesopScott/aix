import { upsertRegistrationContact } from "./_registration-crm.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const registrantTypes = {
  member: {
    label: "member",
    crmPrefix: "crm:member-registrant:",
    legacyPrefix: "member-registration:"
  },
  guest: {
    label: "guest",
    crmPrefix: "crm:guest-registrant:",
    legacyPrefix: "guest-registration:"
  },
  partner: {
    label: "partner",
    crmPrefix: "crm:partner-registrant:",
    legacyPrefix: "partner-registration:"
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

function cleanString(value, max = 2000) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function cleanEmail(value) {
  return cleanString(value, 320).toLowerCase();
}

function splitName(value) {
  const name = cleanString(value, 240);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: name, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)
  };
}

async function listKeys(env, prefix) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) return [];
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

function normalizeRegistrant(key, record = {}, type = "") {
  const createdAt = cleanString(record.createdAt) || key.split(":").slice(-2, -1)[0] || "";
  return {
    key,
    id: cleanString(record.id) || key,
    createdAt,
    name: cleanString(record.name),
    company: cleanString(record.partnerCompany || record.company),
    title: cleanString(record.title),
    industry: cleanString(record.industry),
    email: cleanEmail(record.email),
    phone: cleanString(record.phone),
    inviteCode: cleanString(record.inviteCode),
    eventId: cleanString(record.eventId),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    partnerCompany: cleanString(record.partnerCompany),
    partnerTier: cleanString(record.partnerTier),
    isPresenter: Boolean(record.isPresenter),
    isRoundtableLeader: Boolean(record.isRoundtableLeader),
    isFeaturedGuest: Boolean(record.isFeaturedGuest),
    isFeaturedMember: Boolean(record.isFeaturedMember),
    source: cleanString(record.source) || `${type}-registration`
  };
}

async function readRegistrants(env, type) {
  const config = registrantTypes[type];
  const crmKeys = await listKeys(env, config.crmPrefix);
  const crmRows = await Promise.all(
    crmKeys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeRegistrant(key, record, type) : null;
    })
  );
  const rows = crmRows.filter(Boolean);
  const ids = new Set(rows.map((row) => row.id));

  const legacyKeys = await listKeys(env, config.legacyPrefix);
  const legacyRows = await Promise.all(
    legacyKeys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      const row = record ? normalizeRegistrant(key, record, type) : null;
      return row && !ids.has(row.id) ? row : null;
    })
  );

  return [...rows, ...legacyRows.filter(Boolean)].sort((a, b) =>
    String(a.createdAt).localeCompare(String(b.createdAt))
  );
}

async function rebuildContacts(env) {
  for (const type of Object.keys(registrantTypes)) {
    const rows = await readRegistrants(env, type);
    for (const row of rows) {
      await upsertRegistrationContact(env, type, row, {
        label: type,
        source: row.source || `${type}-registration`,
        updatedBy: "contacts-api"
      }).catch(() => null);
    }
  }
}

function normalizeContact(key, record = {}) {
  const email = cleanEmail(record.email || key.replace(/^crm:contact:/, ""));
  const name = cleanString(record.name) || email;
  const { firstName, lastName } = splitName(name);
  const events = (Array.isArray(record.events) ? record.events : [])
    .map((event = {}) => ({
      id: cleanString(event.id || event.eventId || event.registrationId || event.inviteCode),
      event_id: cleanString(event.eventId),
      event_slug: cleanString(event.eventSlug),
      event_name: cleanString(event.eventName || event.eventId || event.inviteCode),
      event_date: cleanString(event.eventDate),
      invite_code: cleanString(event.inviteCode),
      registration_id: cleanString(event.registrationId),
      registration_type: cleanString(event.registrationType),
      role: cleanString(event.role),
      roles: Array.isArray(event.roles) ? event.roles.map((role) => cleanString(role)).filter(Boolean) : [],
      attended: event.attended === true,
      attendance_status: cleanString(event.attendanceStatus) || "not_recorded",
      registered_at: cleanString(event.registeredAt),
      updated_at: cleanString(event.updatedAt)
    }))
    .sort((a, b) => {
      const left = cleanString(b.event_date || b.registered_at || b.updated_at);
      const right = cleanString(a.event_date || a.registered_at || a.updated_at);
      return left.localeCompare(right);
    });
  const latestEvent = events[0] || {};
  const companyName = cleanString(record.company);
  const updatedAt = cleanString(record.updatedAt || latestEvent.updated_at || latestEvent.registered_at);

  return {
    id: email,
    key,
    contact_id: email,
    email,
    name,
    full_name: name,
    contact_name: name,
    first_name: firstName,
    last_name: lastName,
    phone: cleanString(record.phone),
    company: companyName,
    company_name: companyName,
    company_id: cleanString(record.companySlug || record.companyKey),
    title: cleanString(record.title),
    status: "registered",
    attendee_type: cleanString(record.registrationType || latestEvent.registration_type),
    registration_code: cleanString(latestEvent.invite_code),
    event_name: cleanString(latestEvent.event_name),
    event_date: cleanString(latestEvent.event_date),
    event_count: events.length,
    attended_count: events.filter((event) => event.attended).length,
    source: cleanString(record.source),
    created_at: cleanString(record.createdAt || latestEvent.registered_at),
    updated_at: updatedAt,
    createdAt: cleanString(record.createdAt || latestEvent.registered_at),
    updatedAt,
    events
  };
}

export async function readContacts(env, options = {}) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    throw new Error("CRM storage is not configured.");
  }

  if (options.rebuild !== false) {
    await rebuildContacts(env);
  }

  const keys = await listKeys(env, "crm:contact:");
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeContact(key, record) : null;
    })
  );

  return rows.filter(Boolean).sort((a, b) =>
    String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))
  );
}

function filterContacts(rows, url) {
  const search = cleanString(url.searchParams.get("search") || url.searchParams.get("q")).toLowerCase();
  const companyId = cleanString(url.searchParams.get("company_id") || url.searchParams.get("companyId"));
  const attendeeType = cleanString(url.searchParams.get("attendee_type") || url.searchParams.get("attendeeType")).toLowerCase();

  return rows.filter((row) => {
    if (companyId && row.company_id !== companyId && row.company_name !== companyId) return false;
    if (attendeeType && row.attendee_type.toLowerCase() !== attendeeType) return false;
    if (!search) return true;
    return [
      row.name,
      row.email,
      row.company_name,
      row.title,
      row.phone,
      row.event_name,
      row.registration_code
    ].some((value) => cleanString(value).toLowerCase().includes(search));
  });
}

function paginate(rows, url) {
  const page = Math.max(Number(url.searchParams.get("page") || 1), 1);
  const explicitLimit = url.searchParams.get("limit") || url.searchParams.get("per_page") || url.searchParams.get("pageSize");
  const limit = explicitLimit ? Math.min(Math.max(Number(explicitLimit) || 100, 1), 500) : rows.length || 100;
  const explicitOffset = url.searchParams.get("offset");
  const offset = explicitOffset ? Math.max(Number(explicitOffset) || 0, 0) : (page - 1) * limit;
  return {
    page,
    limit,
    offset,
    rows: rows.slice(offset, offset + limit)
  };
}

export async function contactsResponse(request, env) {
  const url = new URL(request.url);
  const allContacts = await readContacts(env);
  const filtered = filterContacts(allContacts, url);
  const page = paginate(filtered, url);

  return json({
    ok: true,
    contacts: page.rows,
    items: page.rows,
    data: page.rows,
    rows: page.rows,
    total: filtered.length,
    count: page.rows.length,
    page: page.page,
    limit: page.limit,
    offset: page.offset
  });
}

export async function statsResponse(env) {
  const contacts = await readContacts(env);
  const companies = new Set(contacts.map((contact) => contact.company_id || contact.company_name).filter(Boolean));
  const events = contacts.reduce((sum, contact) => sum + contact.event_count, 0);

  return json({
    ok: true,
    contacts: contacts.length,
    companies: companies.size,
    registrations: events,
    events,
    deals: 0,
    totals: {
      contacts: contacts.length,
      companies: companies.size,
      registrations: events,
      events,
      deals: 0
    }
  });
}

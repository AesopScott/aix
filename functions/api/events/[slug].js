import {
  deleteCrmStorageRecord,
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../../_crm-d1.js";

const INDEX_KEY = "event-playbooks:index";
const EVENT_PREFIX = "event-playbook:";
const maxFieldLength = 4000;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
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

function slugify(value) {
  return cleanString(value, 200)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "event";
}

function cleanScalar(value) {
  if (typeof value === "boolean") return value;
  return cleanString(value);
}

function cleanDeep(value, depth = 0) {
  if (depth > 8) return "";
  if (Array.isArray(value)) return value.slice(0, 250).map((item) => cleanDeep(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 500)
        .map(([key, nested]) => [cleanString(key, 120), cleanDeep(nested, depth + 1)])
        .filter(([key]) => key)
    );
  }
  return cleanScalar(value);
}

function cleanEvent(payload, slugParam) {
  const playbook = cleanDeep(payload?.playbook || {});
  const title = cleanString(payload?.title || playbook?.profile?.name || "Untitled event", 200);
  const date = cleanString(payload?.date || playbook?.profile?.date || "", 40);
  const slug = slugify(slugParam || payload?.slug || `${title}-${date}`);
  const now = new Date().toISOString();

  return {
    slug,
    title,
    date,
    format: cleanString(payload?.format || playbook?.profile?.format || "Hybrid", 40),
    production: cleanString(payload?.production || playbook?.profile?.prod || "MoJo-owned", 80),
    playbook,
    createdAt: cleanString(payload?.createdAt, 80) || now,
    updatedAt: now
  };
}

function summaryFor(event) {
  return {
    slug: event.slug,
    title: event.title,
    date: event.date,
    format: event.format,
    updatedAt: event.updatedAt
  };
}

async function listKeys(env, prefix) {
  return listCrmStorageKeys(env, prefix);
}

async function readIndex(env) {
  const stored = await readCrmStorageJson(env, INDEX_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function writeIndex(env, event) {
  const summary = summaryFor(event);
  const index = (await readIndex(env)).filter((item) => item?.slug !== event.slug);
  index.unshift(summary);
  await writeCrmStorageJson(env, INDEX_KEY, index.slice(0, 200));
  return index;
}

function registrantMatchesEvent(registrant, event) {
  const eventKeys = [event.slug, event.title, event.date]
    .map((value) => cleanString(value, 240).toLowerCase())
    .filter(Boolean);
  const registrantKeys = [
    registrant?.eventSlug,
    registrant?.eventId,
    registrant?.eventName,
    registrant?.eventDate
  ]
    .map((value) => cleanString(value, 240).toLowerCase())
    .filter(Boolean);

  return eventKeys.some((eventKey) => registrantKeys.includes(eventKey));
}

function publicRegistrant(record, type) {
  return {
    type,
    name: cleanString(record?.name, 240),
    company: cleanString(record?.company, 240),
    title: cleanString(record?.title, 240),
    industry: cleanString(record?.industry, 240),
    email: cleanString(record?.email, 240).toLowerCase(),
    phone: cleanString(record?.phone, 80),
    inviteCode: cleanString(record?.inviteCode, 40),
    status: cleanString(record?.crmStatus || "new", 80),
    phoneVerificationStatus: cleanString(record?.phoneVerificationStatus || "unverified", 80),
    isPresenter: Boolean(record?.isPresenter),
    isRoundtableLeader: Boolean(record?.isRoundtableLeader),
    isFeaturedGuest: Boolean(record?.isFeaturedGuest),
    isFeaturedMember: Boolean(record?.isFeaturedMember),
    publicationUseName: Boolean(record?.publicationUseName),
    publicationUseCompany: Boolean(record?.publicationUseCompany),
    createdAt: cleanString(record?.createdAt, 80)
  };
}

async function registrantsForEvent(env, event) {
  const prefixes = [
    ["member", "crm:member-registrant:"],
    ["guest", "crm:guest-registrant:"],
    ["partner", "crm:partner-registrant:"]
  ];
  const grouped = await Promise.all(
    prefixes.map(async ([type, prefix]) => {
      const keys = await listKeys(env, prefix);
      const rows = await Promise.all(
        keys.map(async (key) => {
          const record = await readCrmStorageJson(env, key);
          return record && registrantMatchesEvent(record, event) ? publicRegistrant(record, type) : null;
        })
      );
      return rows.filter(Boolean);
    })
  );

  return grouped.flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function onRequestGet({ env, params }) {
  const slug = slugify(params.slug);
  const event = await readCrmStorageJson(env, `${EVENT_PREFIX}${slug}`);
  if (!event) return json({ error: "Event playbook not found." }, { status: 404 });
  event.registrants = await registrantsForEvent(env, event);
  return json({ event });
}

export async function onRequestPut({ request, env, params }) {
  const payload = await request.json().catch(() => null);
  const event = cleanEvent(payload, params.slug);
  if (!event.title || event.title === "Untitled event" || !event.date) {
    return json({ error: "Event title and date are required." }, { status: 400 });
  }

  await writeCrmStorageJson(env, `${EVENT_PREFIX}${event.slug}`, event);
  const events = await writeIndex(env, event);
  return json({ event, events });
}

export async function onRequestDelete({ env, params }) {
  const slug = slugify(params.slug);
  await deleteCrmStorageRecord(env, `${EVENT_PREFIX}${slug}`);
  const index = (await readIndex(env)).filter((item) => item?.slug !== slug);
  await writeCrmStorageJson(env, INDEX_KEY, index.slice(0, 200));
  return json({ deleted: slug, events: index });
}

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

async function readIndex(env) {
  const stored = await env.MOJO_SUMMITS_SETUP_STATE.get(INDEX_KEY, "json");
  return Array.isArray(stored) ? stored : [];
}

async function writeIndex(env, event) {
  const summary = summaryFor(event);
  const index = (await readIndex(env)).filter((item) => item?.slug !== event.slug);
  index.unshift(summary);
  await env.MOJO_SUMMITS_SETUP_STATE.put(INDEX_KEY, JSON.stringify(index.slice(0, 200)));
  return index;
}

export async function onRequestGet({ env, params }) {
  const slug = slugify(params.slug);
  const event = await env.MOJO_SUMMITS_SETUP_STATE.get(`${EVENT_PREFIX}${slug}`, "json");
  if (!event) return json({ error: "Event playbook not found." }, { status: 404 });
  return json({ event });
}

export async function onRequestPut({ request, env, params }) {
  const payload = await request.json().catch(() => null);
  const event = cleanEvent(payload, params.slug);
  if (!event.title || event.title === "Untitled event" || !event.date) {
    return json({ error: "Event title and date are required." }, { status: 400 });
  }

  await env.MOJO_SUMMITS_SETUP_STATE.put(`${EVENT_PREFIX}${event.slug}`, JSON.stringify(event));
  const events = await writeIndex(env, event);
  return json({ event, events });
}

export async function onRequestDelete({ env, params }) {
  const slug = slugify(params.slug);
  await env.MOJO_SUMMITS_SETUP_STATE.delete(`${EVENT_PREFIX}${slug}`);
  const index = (await readIndex(env)).filter((item) => item?.slug !== slug);
  await env.MOJO_SUMMITS_SETUP_STATE.put(INDEX_KEY, JSON.stringify(index.slice(0, 200)));
  return json({ deleted: slug, events: index });
}

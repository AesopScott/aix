import {
  getVirtualEvent,
  publicVirtualEvent,
  zoomKey
} from "../../_virtual-events.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};
const kvRegistrantPrefixes = [
  ["member", "crm:member-registrant:"],
  ["guest", "crm:guest-registrant:"],
  ["partner", "crm:partner-registrant:"]
];
const r2RegistrantPrefixes = [
  ["member", "crm/registrations/member/"],
  ["guest", "crm/registrations/guest/"],
  ["partner", "crm/registrations/partner/"],
  ["member", "crm-overflow/registrations/member/"],
  ["guest", "crm-overflow/registrations/guest/"],
  ["partner", "crm-overflow/registrations/partner/"]
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function publicZoom(zoom) {
  return zoom
    ? {
        meetingId: zoom.meetingId || "",
        joinUrl: zoom.joinUrl || "",
        passcode: zoom.passcode || ""
      }
    : null;
}

function cleanString(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function listKeys(env, prefix) {
  const store = env.MOJO_SUMMITS_SETUP_STATE;
  if (!store?.list) return [];

  const keys = [];
  let cursor;
  do {
    const result = await store.list({ prefix, cursor, limit: 1000 });
    keys.push(...(result.keys || []).map((entry) => entry.name).filter(Boolean));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

function eventMatchValues(values = []) {
  const normalized = new Set();
  for (const value of values) {
    const clean = cleanString(value, 240).toLowerCase();
    if (!clean) continue;
    normalized.add(clean);
    const base = clean.split(":")[0].split("|")[0].trim();
    if (base) normalized.add(base);
  }
  return [...normalized];
}

function registrantMatchesEvent(registrant, event) {
  const eventKeys = eventMatchValues([event.slug, event.title, event.dateLabel]);
  const registrantKeys = eventMatchValues([
    registrant?.eventSlug,
    registrant?.eventId,
    registrant?.eventName,
    registrant?.eventDate
  ]);

  return eventKeys.some((eventKey) => registrantKeys.includes(eventKey));
}

function isFeaturedRegistrant(registrant = {}) {
  const role = cleanString(
    registrant.registrationRole ||
      registrant.guestRegistrationType ||
      registrant.partnerRegistrationType ||
      registrant.strategicRole ||
      registrant.role,
    120
  ).toLowerCase().replace(/\s+/g, "-");

  return Boolean(
    registrant.isFeaturedGuest ||
    registrant.isFeaturedMember ||
    registrant.isFeaturedAuthor ||
    registrant.isPresenter ||
    registrant.isRoundtableLeader ||
    ["featured-guest", "featured-author", "featured-partner", "presenter", "speaker", "roundtable-leader"].includes(role)
  );
}

function publicFeaturedGuest(registrant, type) {
  const canUseCompany = registrant?.publicationUseCompany === true;
  const name = cleanString(registrant?.name, 180);
  const title = cleanString(registrant?.title, 180);
  const company = canUseCompany ? cleanString(registrant?.company || registrant?.partnerCompany, 180) : "";
  const photoUrl = cleanString(registrant?.photoUrl || registrant?.photoURL || registrant?.photo, 500);
  const industry = cleanString(registrant?.industry || registrant?.organizationType, 140);

  return {
    type,
    displayName: name || "Name pending",
    company,
    companyAllowed: canUseCompany,
    title,
    industry,
    photoUrl,
    roleLabel: cleanString(
      registrant?.featuredGuestLabel ||
        registrant?.speakerLabel ||
        registrant?.registrationRole ||
        registrant?.guestRegistrationType ||
        registrant?.partnerRegistrationType ||
        "Featured guest",
      120
    )
  };
}

function publicRegisteredGuest(registrant, type) {
  const canUseCompany = registrant?.publicationUseCompany === true;
  const name = cleanString(registrant?.name, 180);
  const title = cleanString(registrant?.title, 180);
  const company = canUseCompany ? cleanString(registrant?.company || registrant?.partnerCompany, 180) : "";
  const industry = cleanString(registrant?.industry || registrant?.organizationType, 140);

  return {
    type,
    displayName: name,
    company,
    companyAllowed: canUseCompany,
    title,
    industry,
    restricted: !company
  };
}

function registrantIdentity(type, record = {}, fallback = "") {
  const email = cleanString(record.email, 240).toLowerCase();
  const eventKey = cleanString(record.eventId || record.eventSlug || record.eventName || record.eventDate, 240).toLowerCase();
  const id = cleanString(record.id || record.registrationId, 240);
  return [type, id || email || fallback, eventKey].filter(Boolean).join("|");
}

async function kvRegistrants(env) {
  const store = env.MOJO_SUMMITS_SETUP_STATE;
  if (!store?.get) return [];

  const grouped = await Promise.all(kvRegistrantPrefixes.map(async ([type, prefix]) => {
    const keys = await listKeys(env, prefix);
    const rows = await Promise.all(keys.map(async (key) => {
      const record = await store.get(key, "json").catch(() => null);
      return record ? { ...record, type, sourceKey: key } : null;
    }));
    return rows.filter(Boolean);
  }));

  return grouped.flat();
}

async function r2Registrants(env) {
  const store = env.MOJO_SUMMITS_STORAGE;
  if (!store?.list || !store?.get) return [];

  const grouped = await Promise.all(r2RegistrantPrefixes.map(async ([type, prefix]) => {
    const rows = [];
    let cursor;
    do {
      const result = await store.list({ prefix, cursor, limit: 1000 }).catch(() => null);
      if (!result) break;
      const objects = result.objects || [];
      const records = await Promise.all(objects.map(async (object) => {
        const stored = await store.get(object.key).catch(() => null);
        const record = stored ? await stored.json().catch(() => null) : null;
        return record ? { ...record, type, sourceKey: object.key } : null;
      }));
      rows.push(...records.filter(Boolean));
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
    return rows.filter(Boolean);
  }));

  return grouped.flat();
}

async function eventRegistrants(env, event) {
  const registrants = await Promise.all([
    kvRegistrants(env),
    r2Registrants(env)
  ]);
  const map = new Map();

  for (const registrant of registrants.flat()) {
    if (!registrantMatchesEvent(registrant, event)) continue;
    const type = cleanString(registrant.type, 40) || "guest";
    const key = registrantIdentity(type, registrant, registrant.sourceKey);
    const previous = map.get(key) || {};
    map.set(key, { ...previous, ...registrant, type });
  }

  return [...map.values()];
}

async function featuredGuestsForEvent(env, event) {
  return (await eventRegistrants(env, event))
    .filter(isFeaturedRegistrant)
    .map((registrant) => publicFeaturedGuest(registrant, registrant.type))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .slice(0, 9);
}

async function registeredGuestsForEvent(env, event) {
  return (await eventRegistrants(env, event))
    .filter((registrant) => !isFeaturedRegistrant(registrant))
    .map((registrant) => publicRegisteredGuest(registrant, registrant.type))
    .sort((left, right) => {
      const leftLabel = left.displayName || left.company || left.industry || left.title || "";
      const rightLabel = right.displayName || right.company || right.industry || right.title || "";
      return leftLabel.localeCompare(rightLabel);
    })
    .slice(0, 80);
}

export async function onRequestGet({ env, params }) {
  const event = getVirtualEvent(params.slug);
  if (!event) return json({ error: "Virtual event not found." }, { status: 404 });

  const now = new Date();
  const publicEvent = publicVirtualEvent(event, now);
  const storedZoom = await env.MOJO_SUMMITS_SETUP_STATE
    ?.get(zoomKey(event.slug), "json")
    .catch(() => null);

  return json({
    ok: true,
    event: publicEvent,
    featuredGuests: await featuredGuestsForEvent(env, event),
    registeredGuests: await registeredGuestsForEvent(env, event),
    zoomConfigured: Boolean(storedZoom?.joinUrl),
    zoom: publicEvent.locked ? null : publicZoom(storedZoom),
    message: publicEvent.locked
      ? "This virtual event room is locked. The Zoom link is no longer available from this page."
      : storedZoom?.joinUrl
        ? "The Zoom room is available for invited guests."
        : "The Zoom room is being configured."
  });
}

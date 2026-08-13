import {
  getVirtualEvent,
  publicVirtualEvent,
  zoomKey
} from "../../_virtual-events.js";

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

function registrantMatchesEvent(registrant, event) {
  const eventKeys = [event.slug, event.title, event.dateLabel]
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

function isFeaturedRegistrant(registrant = {}) {
  const role = cleanString(
    registrant.registrationRole ||
      registrant.guestRegistrationType ||
      registrant.partnerRegistrationType ||
      registrant.strategicRole ||
      registrant.role,
    120
  ).toLowerCase();

  return Boolean(
    registrant.isFeaturedGuest ||
      registrant.isFeaturedMember ||
      registrant.isPresenter ||
      registrant.isRoundtableLeader ||
      ["featured-guest", "featured-partner", "presenter", "speaker", "roundtable-leader"].includes(role)
  );
}

function publicFeaturedGuest(registrant, type) {
  const canUseName = registrant?.publicationUseName === true;
  const canUseCompany = registrant?.publicationUseCompany === true;
  const canUseTitle = registrant?.publicationUseTitle === true ||
    registrant?.publicUseTitle === true ||
    registrant?.publicationUseRole === true;
  const name = canUseName ? cleanString(registrant?.name, 180) : "";
  const title = canUseTitle ? cleanString(registrant?.title, 180) : "";
  const company = canUseCompany ? cleanString(registrant?.company || registrant?.partnerCompany, 180) : "";
  const photoUrl = cleanString(registrant?.photoUrl || registrant?.photoURL || registrant?.photo, 500);
  const industry = cleanString(registrant?.industry || registrant?.organizationType, 140);

  return {
    type,
    displayName: name || "Name withheld",
    nameAllowed: canUseName,
    company,
    companyAllowed: canUseCompany,
    title,
    titleAllowed: canUseTitle,
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
  const canUseName = registrant?.publicationUseName === true;
  const canUseCompany = registrant?.publicationUseCompany === true;
  const canUseTitle = registrant?.publicationUseTitle === true ||
    registrant?.publicUseTitle === true ||
    registrant?.publicationUseRole === true;
  const name = canUseName ? cleanString(registrant?.name, 180) : "";
  const title = canUseTitle ? cleanString(registrant?.title, 180) : "";
  const company = canUseCompany ? cleanString(registrant?.company || registrant?.partnerCompany, 180) : "";
  const industry = cleanString(registrant?.industry || registrant?.organizationType, 140);

  return {
    type,
    displayName: name,
    nameAllowed: canUseName,
    company,
    companyAllowed: canUseCompany,
    title,
    titleAllowed: canUseTitle,
    industry,
    restricted: !name || !company
  };
}

async function featuredGuestsForEvent(env, event) {
  const store = env.MOJO_SUMMITS_SETUP_STATE;
  if (!store?.get) return [];

  const prefixes = [
    ["member", "crm:member-registrant:"],
    ["guest", "crm:guest-registrant:"],
    ["partner", "crm:partner-registrant:"]
  ];
  const grouped = await Promise.all(prefixes.map(async ([type, prefix]) => {
    const keys = await listKeys(env, prefix);
    const rows = await Promise.all(keys.map(async (key) => {
      const record = await store.get(key, "json").catch(() => null);
      if (!record || !registrantMatchesEvent(record, event) || !isFeaturedRegistrant(record)) return null;
      return publicFeaturedGuest(record, type);
    }));
    return rows.filter(Boolean);
  }));

  return grouped
    .flat()
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .slice(0, 9);
}

async function registeredGuestsForEvent(env, event) {
  const store = env.MOJO_SUMMITS_SETUP_STATE;
  if (!store?.get) return [];

  const prefixes = [
    ["member", "crm:member-registrant:"],
    ["guest", "crm:guest-registrant:"],
    ["partner", "crm:partner-registrant:"]
  ];
  const grouped = await Promise.all(prefixes.map(async ([type, prefix]) => {
    const keys = await listKeys(env, prefix);
    const rows = await Promise.all(keys.map(async (key) => {
      const record = await store.get(key, "json").catch(() => null);
      if (!record || !registrantMatchesEvent(record, event) || isFeaturedRegistrant(record)) return null;
      return publicRegisteredGuest(record, type);
    }));
    return rows.filter(Boolean);
  }));

  return grouped
    .flat()
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

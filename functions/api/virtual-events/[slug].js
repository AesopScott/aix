import {
  getVirtualEvent,
  publicVirtualEvent,
  zoomKey
} from "../../_virtual-events.js";
import {
  crmD1Primary,
  listCrmStorageKeys,
  readCrmStorageJson
} from "../../_crm-d1.js";

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
const featuredShowLineups = [
  { id: "morning", label: "10:00 AM featured lineup", time: "10:00 am - 11:30 am CT" },
  { id: "afternoon", label: "1:00 PM featured lineup", time: "1:00 pm - 2:30 pm CT" }
];
const productionVirtualEventsApi = "https://mojoaisummits.com/api/virtual-events/";
const productionOrigin = "https://mojoaisummits.com";

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

function cleanEventShowId(value, fallback = "") {
  const raw = cleanString(value, 160).toLowerCase();
  const normalized = raw.replace(/[\s_]+/g, "-");
  const compact = raw.replace(/[^a-z0-9]/g, "");
  if (!raw) return fallback;
  if (normalized.includes("morning") || compact.includes("10am") || compact.includes("1000am") || compact === "10") return "morning";
  if (normalized.includes("afternoon") || compact.includes("1pm") || compact.includes("100pm") || compact.includes("1300") || compact === "1" || compact === "13") return "afternoon";
  if (["am", "10", "10am", "1000", "1000am"].includes(compact)) return "morning";
  if (["pm", "1", "1pm", "100", "100pm", "1300"].includes(compact)) return "afternoon";
  if (["both", "all", "bothshows"].includes(compact)) return "both";
  return fallback;
}

function eventShowLabel(showId) {
  return {
    morning: "Morning show",
    afternoon: "Afternoon show",
    both: "Both shows"
  }[cleanEventShowId(showId)] || "";
}

function eventShowTime(showId) {
  return {
    morning: "10:00 am - 11:30 am CT",
    afternoon: "1:00 pm - 2:30 pm CT",
    both: "10:00 am - 11:30 am CT and 1:00 pm - 2:30 pm CT"
  }[cleanEventShowId(showId)] || "";
}

function registrantShowId(registrant = {}) {
  return cleanEventShowId(
    registrant.eventShowId ||
      registrant.showId ||
      registrant.eventShow ||
      registrant.show ||
      registrant.eventShowLabel ||
      registrant.eventShowTime ||
      registrant.eventTime ||
      registrant.eventDate,
    ""
  );
}

function registrantMatchesShow(registrant, showId) {
  const cleanShow = cleanEventShowId(showId);
  const registrantShow = registrantShowId(registrant);
  return registrantShow === "both" || registrantShow === cleanShow;
}

function isLocalPreviewRequest(request) {
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function hasFeaturedLineupData(payload = {}) {
  const flatCount = Array.isArray(payload.featuredGuests) ? payload.featuredGuests.length : 0;
  const byShow = payload.featuredGuestsByShow && typeof payload.featuredGuestsByShow === "object"
    ? payload.featuredGuestsByShow
    : {};
  const showCount = featuredShowLineups.reduce((sum, show) => {
    return sum + (Array.isArray(byShow[show.id]) ? byShow[show.id].length : 0);
  }, 0);
  return flatCount > 0 || showCount > 0;
}

function absoluteProductionUrl(value) {
  const clean = cleanString(value, 1000);
  if (!clean || /^[a-z][a-z0-9+.-]*:/i.test(clean)) return clean;
  return clean.startsWith("/") ? `${productionOrigin}${clean}` : clean;
}

function withAbsolutePreviewPhotoUrls(payload = {}) {
  const photoFields = ["photoUrl", "photoURL", "photo", "headshotUrl", "bioImageUrl", "profileImageUrl"];
  const normalizePerson = (person = {}) => {
    const normalized = { ...person };
    for (const field of photoFields) {
      if (normalized[field]) normalized[field] = absoluteProductionUrl(normalized[field]);
    }
    return normalized;
  };
  const byShow = payload.featuredGuestsByShow && typeof payload.featuredGuestsByShow === "object"
    ? Object.fromEntries(Object.entries(payload.featuredGuestsByShow).map(([showId, guests]) => [
        showId,
        Array.isArray(guests) ? guests.map(normalizePerson) : guests
      ]))
    : payload.featuredGuestsByShow;

  return {
    ...payload,
    featuredGuests: Array.isArray(payload.featuredGuests) ? payload.featuredGuests.map(normalizePerson) : payload.featuredGuests,
    featuredGuestsByShow: byShow,
    registeredGuests: Array.isArray(payload.registeredGuests) ? payload.registeredGuests.map(normalizePerson) : payload.registeredGuests
  };
}

function previewGuestKey(guest = {}) {
  return [
    cleanString(guest.displayName || guest.name, 240).toLowerCase(),
    cleanString(guest.eventShowId || guest.eventShowLabel || guest.eventShowTime, 160).toLowerCase(),
    cleanString(guest.roleLabel || guest.registrationRole || guest.guestRegistrationType, 160).toLowerCase()
  ].filter(Boolean).join("|");
}

function mergePreviewGuestLists(primary = [], secondary = []) {
  const map = new Map();
  for (const guest of [...primary, ...secondary]) {
    const key = previewGuestKey(guest);
    if (!key) continue;
    map.set(key, {
      ...(map.get(key) || {}),
      ...guest
    });
  }
  return [...map.values()].sort((left, right) => {
    return cleanString(left.displayName || left.name).localeCompare(cleanString(right.displayName || right.name));
  });
}

function mergePreviewPayloads(livePayload = {}, localPayload = {}) {
  const live = withAbsolutePreviewPhotoUrls(livePayload);
  const local = withAbsolutePreviewPhotoUrls(localPayload);
  const featuredGuestsByShow = featuredShowLineups.reduce((lineups, show) => {
    lineups[show.id] = mergePreviewGuestLists(
      Array.isArray(live.featuredGuestsByShow?.[show.id]) ? live.featuredGuestsByShow[show.id] : [],
      Array.isArray(local.featuredGuestsByShow?.[show.id]) ? local.featuredGuestsByShow[show.id] : []
    ).slice(0, 9);
    return lineups;
  }, {});

  return {
    ...live,
    ...local,
    featuredGuests: mergePreviewGuestLists(
      Array.isArray(live.featuredGuests) ? live.featuredGuests : [],
      Array.isArray(local.featuredGuests) ? local.featuredGuests : []
    ).slice(0, 18),
    featuredGuestsByShow,
    registeredGuests: mergePreviewGuestLists(
      Array.isArray(live.registeredGuests) ? live.registeredGuests : [],
      Array.isArray(local.registeredGuests) ? local.registeredGuests : []
    )
  };
}

async function listKeys(env, prefix) {
  return listCrmStorageKeys(env, prefix);
}

async function readSetupJson(env, key) {
  return readCrmStorageJson(env, key);
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

function cleanFeaturedRole(value) {
  const role = cleanString(value, 140).toLowerCase().replace(/[\s_]+/g, "-");
  if (role.includes("author")) return "featured-author";
  if (role.includes("sponsor") || role.includes("partner")) return "featured-partner";
  if (role.includes("featured") || role.includes("presenter") || role.includes("speaker") || role.includes("roundtable")) return "featured-guest";
  return role;
}

function registeredStatus(value) {
  return cleanString(value, 120).toLowerCase().replace(/[\s_]+/g, "-");
}

function contactEventIsPublicLineupCandidate(event = {}) {
  const status = registeredStatus(event.registrationStatus || event.status || event.crmStatus || event.guestStatus);
  return ["invited", "registered", "confirmed", "accepted", "attended"].includes(status);
}

function isFeaturedRegistrant(registrant = {}) {
  const role = cleanFeaturedRole(
    registrant.registrationRole ||
      registrant.guestRegistrationType ||
      registrant.partnerRegistrationType ||
      registrant.contactEventRole ||
      registrant.strategicRole ||
      registrant.role,
    120
  );

  return Boolean(
    registrant.isFeaturedGuest ||
    registrant.isFeaturedMember ||
    registrant.isFeaturedAuthor ||
    registrant.isFeaturedSponsor ||
    registrant.isPresenter ||
    registrant.isRoundtableLeader ||
    ["featured-guest", "featured-author", "featured-partner", "featured-sponsor"].includes(role)
  );
}

function publicFeaturedGuest(registrant, type) {
  const canUseCompany = registrant?.publicationUseCompany === true;
  const name = cleanString(registrant?.name, 180);
  const title = cleanString(registrant?.title, 180);
  const company = canUseCompany ? cleanString(registrant?.company || registrant?.partnerCompany, 180) : "";
  const photoUrl = cleanString(
    registrant?.photoUrl ||
      registrant?.photoURL ||
      registrant?.photo ||
      registrant?.headshotUrl ||
      registrant?.bioImageUrl ||
      registrant?.profileImageUrl,
    500
  );
  const industry = cleanString(registrant?.industry || registrant?.organizationType, 140);

  return {
    type,
    displayName: name || "Name pending",
    company,
    companyAllowed: canUseCompany,
    title,
    industry,
    photoUrl,
    eventShowId: registrantShowId(registrant),
    eventShowLabel: eventShowLabel(registrantShowId(registrant)),
    eventShowTime: eventShowTime(registrantShowId(registrant)),
    roleLabel: cleanString(
      registrant?.featuredGuestLabel ||
        registrant?.speakerLabel ||
        cleanFeaturedRole(registrant?.contactEventRole) ||
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
  return [type, email || id || fallback, eventKey].filter(Boolean).join("|");
}

function submittedPhotoFields(record = {}) {
  const photoKey = cleanString(record.photoKey, 500);
  const photoUrl = cleanString(record.photoUrl || record.photoURL || record.photo, 500);
  const sourceKey = cleanString(record.sourceKey, 500);
  const hasSubmittedPhoto = Boolean(photoUrl) && (
    photoKey.includes("/registration-photos/") ||
    photoUrl.includes("/registration-photos/") ||
    sourceKey.includes(":registrant:") ||
    sourceKey.includes("/registrations/")
  );

  return hasSubmittedPhoto ? { photoKey, photoUrl } : null;
}

function featuredRoleFields(record = {}) {
  const role = cleanFeaturedRole(
    record.registrationRole ||
      record.guestRegistrationType ||
      record.partnerRegistrationType ||
      record.contactEventRole ||
      record.featuredGuestLabel ||
      record.strategicRole ||
      record.role,
    120
  );

  if (!["featured-guest", "featured-author", "featured-partner", "featured-sponsor"].includes(role) && !isFeaturedRegistrant(record)) {
    return null;
  }

  return {
    registrationRole: role || record.registrationRole,
    guestRegistrationType: role || record.guestRegistrationType,
    contactEventRole: role || record.contactEventRole,
    featuredGuestLabel: role || record.featuredGuestLabel,
    isFeaturedGuest: role === "featured-guest" || record.isFeaturedGuest === true,
    isFeaturedAuthor: role === "featured-author" || record.isFeaturedAuthor === true,
    isFeaturedSponsor: (role === "featured-partner" || role === "featured-sponsor") || record.isFeaturedSponsor === true,
    isFeaturedPartner: (role === "featured-partner" || role === "featured-sponsor") || record.isFeaturedPartner === true
  };
}

function showFields(record = {}) {
  const showId = registrantShowId(record);
  if (!showId) return null;
  return {
    eventShowId: showId,
    eventShowLabel: eventShowLabel(showId),
    eventShowTime: eventShowTime(showId),
    eventId: cleanString(record.eventId, 240),
    eventTime: cleanString(record.eventTime, 120) || eventShowTime(showId)
  };
}

function mergeRegistrantRecords(previous = {}, registrant = {}, type = "guest") {
  const previousSubmittedPhoto = submittedPhotoFields(previous);
  const previousFeaturedRole = featuredRoleFields(previous);
  const previousShow = showFields(previous);
  const next = { ...previous, ...registrant, type };

  if (previousSubmittedPhoto && !submittedPhotoFields(registrant)) {
    next.photoKey = previousSubmittedPhoto.photoKey || next.photoKey;
    next.photoUrl = previousSubmittedPhoto.photoUrl || next.photoUrl;
  }

  if (previousFeaturedRole && !featuredRoleFields(registrant)) {
    Object.assign(next, previousFeaturedRole);
  }

  if (previousShow && !showFields(registrant)) {
    Object.assign(next, previousShow);
  }

  return next;
}

async function kvRegistrants(env) {
  const grouped = await Promise.all(kvRegistrantPrefixes.map(async ([type, prefix]) => {
    const keys = await listKeys(env, prefix);
    const rows = await Promise.all(keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? { ...record, type, sourceKey: key } : null;
    }));
    return rows.filter(Boolean);
  }));

  return grouped.flat();
}

async function contactEventRegistrants(env) {
  const keys = await listKeys(env, "crm:contact:");
  const grouped = await Promise.all(keys.map(async (key) => {
    const contact = await readSetupJson(env, key);
    if (!contact || typeof contact !== "object" || !Array.isArray(contact.events)) return [];
    return contact.events
      .filter(contactEventIsPublicLineupCandidate)
      .map((event, index) => {
        const role = cleanFeaturedRole(
          event.contactEventRole ||
            event.registrationRole ||
            event.partnerRegistrationType ||
            event.guestRegistrationType ||
            event.role ||
            contact.registrationRole ||
            contact.guestRegistrationType
        );
        return {
          ...contact,
          ...event,
          type: role === "featured-partner" || role === "featured-sponsor" ? "partner" : "guest",
          sourceKey: `${key}:event:${index}`,
          id: cleanString(event.registrationId || event.id || contact.email || contact.id || key, 240),
          email: cleanString(event.email || contact.email, 240).toLowerCase(),
          name: cleanString(event.intendedGuestName || event.invitedName || event.guestName || contact.name, 180),
          title: cleanString(contact.title || event.title, 180),
          company: cleanString(contact.company || event.company, 180),
          industry: cleanString(contact.industry || event.industry || contact.organizationType, 140),
          photoUrl: cleanString(contact.photoUrl || contact.photoURL || contact.photo || event.photoUrl || event.photoURL || event.photo, 500),
          photoKey: cleanString(contact.photoKey || event.photoKey, 500),
          registrationRole: role,
          guestRegistrationType: role,
          partnerRegistrationType: role === "featured-partner" ? "featured-partner" : cleanString(event.partnerRegistrationType, 120),
          contactEventRole: role,
          isFeaturedGuest: role === "featured-guest",
          isFeaturedAuthor: role === "featured-author",
          isFeaturedSponsor: role === "featured-partner",
          isFeaturedPartner: role === "featured-partner",
          featuredGuestLabel: role,
          publicationUseName: event.publicationUseName === true || contact.publicationUseName === true,
          publicationUseCompany: event.publicationUseCompany === true || contact.publicationUseCompany === true
        };
      });
  }));

  return grouped.flat();
}

async function r2Registrants(env) {
  if (crmD1Primary(env)) return [];
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
  const r2Rows = await r2Registrants(env);
  const kvRows = await kvRegistrants(env);
  const contactRows = await contactEventRegistrants(env);
  const registrants = [r2Rows, kvRows, contactRows];
  const map = new Map();

  for (const registrant of registrants.flat()) {
    if (!registrantMatchesEvent(registrant, event)) continue;
    const type = cleanString(registrant.type, 40) || "guest";
    const key = registrantIdentity(type, registrant, registrant.sourceKey);
    const previous = map.get(key) || {};
    map.set(key, mergeRegistrantRecords(previous, registrant, type));
  }

  return [...map.values()];
}

function featuredGuestsFromRegistrants(registrants) {
  return registrants
    .filter(isFeaturedRegistrant)
    .map((registrant) => publicFeaturedGuest(registrant, registrant.type))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .slice(0, 9);
}

function featuredGuestsByShowFromRegistrants(registrants) {
  const featuredRegistrants = registrants
    .filter(isFeaturedRegistrant)
    .sort((left, right) => cleanString(left.name).localeCompare(cleanString(right.name)));

  return featuredShowLineups.reduce((lineups, show) => {
    lineups[show.id] = featuredRegistrants
      .filter((registrant) => registrantMatchesShow(registrant, show.id))
      .map((registrant) => publicFeaturedGuest(registrant, registrant.type))
      .slice(0, 9);
    return lineups;
  }, {});
}

function registeredGuestsFromRegistrants(registrants) {
  return registrants
    .filter((registrant) => !isFeaturedRegistrant(registrant))
    .map((registrant) => publicRegisteredGuest(registrant, registrant.type))
    .sort((left, right) => {
      const leftLabel = left.displayName || left.company || left.industry || left.title || "";
      const rightLabel = right.displayName || right.company || right.industry || right.title || "";
      return leftLabel.localeCompare(rightLabel);
    })
    .slice(0, 80);
}

async function productionPreviewFallback(request, event, payload) {
  if (!isLocalPreviewRequest(request)) return null;

  try {
    const response = await fetch(`${productionVirtualEventsApi}${encodeURIComponent(event.slug)}`, {
      headers: {
        accept: "application/json",
        "cache-control": "no-cache"
      }
    });
    const livePayload = await response.json().catch(() => null);
    if (!response.ok || !hasFeaturedLineupData(livePayload)) return null;
    return {
      ...mergePreviewPayloads(livePayload, payload),
      localPreviewSource: hasFeaturedLineupData(payload) ? "production-api+local" : "production-api"
    };
  } catch {
    return null;
  }
}

export async function onRequestGet({ env, params, request }) {
  const event = getVirtualEvent(params.slug);
  if (!event) return json({ error: "Virtual event not found." }, { status: 404 });

  const now = new Date();
  const publicEvent = publicVirtualEvent(event, now);
  const registrants = await eventRegistrants(env, event);
  const storedZoom = await readCrmStorageJson(env, zoomKey(event.slug));

  const payload = {
    ok: true,
    event: publicEvent,
    featuredGuests: featuredGuestsFromRegistrants(registrants),
    featuredGuestsByShow: featuredGuestsByShowFromRegistrants(registrants),
    featuredShowLineups,
    registeredGuests: registeredGuestsFromRegistrants(registrants),
    zoomConfigured: Boolean(storedZoom?.joinUrl),
    zoom: publicEvent.locked ? null : publicZoom(storedZoom),
    message: publicEvent.locked
      ? "This virtual event room is locked. The Zoom link is no longer available from this page."
      : storedZoom?.joinUrl
        ? "The Zoom room is available for invited guests."
        : "The Zoom room is being configured."
  };
  const previewPayload = await productionPreviewFallback(request, event, payload);

  return json(previewPayload || payload);
}

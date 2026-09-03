import {
  getVirtualEvent,
  publicVirtualEvent,
  zoomKey
} from "../../_virtual-events.js";
import {
  crmD1Primary,
  listCrmStorageKeys,
  readCrmStorageJson,
  searchCrmD1Json
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
const maxPublicFeaturedGuestsPerShow = 6;
const publicFeaturedRegistrationStatuses = new Set(["registered", "attended"]);
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

function cleanLinkedInProfileUrl(value = "") {
  const raw = cleanString(value, 500).replace(/\s+/g, "");
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return "";
  const path = url.pathname.replace(/\/+$/, "");
  if (!/^\/(in|pub)\/[^/]+/i.test(path)) return "";
  url.protocol = "https:";
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString().slice(0, 500);
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
  const photoFields = ["photoUrl", "photoURL", "photo", "headshotUrl", "bioImageUrl", "profileImageUrl", "profilePhotoUrl"];
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

function publicFeaturedRoleKey(person = {}) {
  return cleanFeaturedRole(
    person.roleLabel ||
      person.registrationRole ||
      person.guestRegistrationType ||
      person.partnerRegistrationType ||
      person.contactEventRole ||
      person.role
  );
}

function publicFeaturedPersonKey(person = {}) {
  const linkedin = cleanLinkedInProfileUrl(
    person.linkedinProfileUrl ||
      person.linkedInProfileUrl ||
      person.linkedinUrl ||
      person.linkedInUrl
  ).toLowerCase().replace(/\/+$/, "");
  if (linkedin) return `linkedin:${linkedin}`;
  const email = cleanString(person.email, 240).toLowerCase();
  if (email) return `email:${email}`;
  const name = cleanString(person.displayName || person.name, 240).toLowerCase().replace(/\s+/g, " ");
  const role = publicFeaturedRoleKey(person);
  return [name, role].filter(Boolean).join("|");
}

function mergePublicFeaturedPeople(people = []) {
  const map = new Map();
  for (const person of people) {
    const key = publicFeaturedPersonKey(person);
    if (!key) continue;
    const previous = map.get(key) || {};
    const previousRank = Number(previous.lineupSourceRank ?? publicLineupSourceRank(previous));
    const nextRank = Number(person.lineupSourceRank ?? publicLineupSourceRank(person));
    const primary = nextRank >= previousRank ? person : previous;
    const secondary = nextRank >= previousRank ? previous : person;
    map.set(key, {
      ...secondary,
      ...primary,
      lineupSourceRank: Math.max(previousRank, nextRank),
      photoUrl: cleanString(primary.photoUrl || primary.photoURL || primary.photo) || cleanString(secondary.photoUrl || secondary.photoURL || secondary.photo),
      photoKey: cleanString(primary.photoKey) || cleanString(secondary.photoKey),
      linkedinProfileUrl: cleanLinkedInProfileUrl(primary.linkedinProfileUrl || primary.linkedInProfileUrl || primary.linkedinUrl || primary.linkedInUrl) ||
        cleanLinkedInProfileUrl(secondary.linkedinProfileUrl || secondary.linkedInProfileUrl || secondary.linkedinUrl || secondary.linkedInUrl)
    });
  }
  return [...map.values()];
}

function slotFeaturedPeople(people = []) {
  const sorted = mergePublicFeaturedPeople(people).sort(publicLineupCompare);
  const guests = sorted.filter((person) => publicFeaturedRoleKey(person) === "featured-guest").slice(0, maxPublicFeaturedGuestsPerShow);
  const authors = sorted.filter((person) => publicFeaturedRoleKey(person) === "featured-author").slice(0, 1);
  const partners = sorted.filter((person) => publicFeaturedRoleKey(person) === "featured-partner").slice(0, 2);
  return [...guests, ...authors, ...partners].map(publicFeaturedPerson);
}

function mergePreviewPayloads(livePayload = {}, localPayload = {}) {
  const live = withAbsolutePreviewPhotoUrls(livePayload);
  const local = withAbsolutePreviewPhotoUrls(localPayload);
  const featuredGuestsByShow = featuredShowLineups.reduce((lineups, show) => {
    lineups[show.id] = slotFeaturedPeople(mergePreviewGuestLists(
      Array.isArray(live.featuredGuestsByShow?.[show.id]) ? live.featuredGuestsByShow[show.id] : [],
      Array.isArray(local.featuredGuestsByShow?.[show.id]) ? local.featuredGuestsByShow[show.id] : []
    ));
    return lineups;
  }, {});

  return {
    ...live,
    ...local,
    featuredGuests: slotFeaturedPeople(mergePreviewGuestLists(
      Array.isArray(live.featuredGuests) ? live.featuredGuests : [],
      Array.isArray(local.featuredGuests) ? local.featuredGuests : []
    )).slice(0, 18),
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
  if (role.includes("featured-sponsor")) return "featured-partner";
  if (role.includes("featured-partner")) return "featured-partner";
  if (role === "sponsor") return "featured-partner";
  if (role.includes("featured-guest")) return "featured-guest";
  if (role === "featured" || role.includes("presenter") || role.includes("speaker") || role.includes("roundtable")) return "featured-guest";
  return role;
}

function registeredStatus(value) {
  return cleanString(value, 120).toLowerCase().replace(/[\s_]+/g, "-");
}

function isCrmRegistrantRecord(record = {}) {
  const sourceKey = cleanString(record.sourceKey || record.key, 500).toLowerCase();
  const source = cleanString(record.source || record.crmType, 200).toLowerCase();
  return sourceKey.startsWith("crm:guest-registrant:") ||
    sourceKey.startsWith("crm:member-registrant:") ||
    sourceKey.startsWith("crm:partner-registrant:") ||
    sourceKey.startsWith("guest-registration:") ||
    sourceKey.startsWith("member-registration:") ||
    sourceKey.startsWith("partner-registration:") ||
    sourceKey.startsWith("crm/registrations/") ||
    sourceKey.startsWith("crm-overflow/registrations/") ||
    source === "guest-registration" ||
    source === "member-registration" ||
    source === "partner-registration" ||
    source.includes("manual-registration");
}

function isCrmContactEventRegistrationEvidence(record = {}) {
  const sourceKey = cleanString(record.sourceKey || record.key, 500).toLowerCase();
  const status = registeredStatus(record.crmStatus || record.guestStatus || record.registrationStatus || record.status);
  return sourceKey.startsWith("crm:contact:") &&
    sourceKey.includes(":event:") &&
    publicFeaturedRegistrationStatuses.has(status);
}

function normalizedPublicRegistrationStatus(record = {}) {
  const status = registeredStatus(record.crmStatus || record.guestStatus || record.registrationStatus || record.status);
  if (!status) return isCrmRegistrantRecord(record) ? "registered" : "";
  if (status === "used") return "registered";
  if (status === "cancelled") return "canceled";
  if (["new", "pending", "pending-engagement", "contacted", "confirmed", "invited", "active"].includes(status)) {
    return isCrmRegistrantRecord(record) ? "registered" : status;
  }
  return status;
}

function contactEventIsPublicLineupCandidate(event = {}) {
  const status = registeredStatus(event.registrationStatus || event.status || event.crmStatus || event.guestStatus);
  return publicFeaturedRegistrationStatuses.has(status);
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

  if (role === "featured-partner" || role === "featured-sponsor") return true;
  if (role === "partner" || role === "partner-candidate") return false;

  return Boolean(
    registrant.isFeaturedGuest ||
    registrant.isFeaturedAuthor ||
    ["featured-guest", "featured-author"].includes(role)
  );
}

function isPublicFeaturedRegistrant(registrant = {}) {
  const status = normalizedPublicRegistrationStatus(registrant);
  return (isCrmRegistrantRecord(registrant) || isCrmContactEventRegistrationEvidence(registrant)) &&
    isFeaturedRegistrant(registrant) &&
    publicFeaturedRegistrationStatuses.has(status);
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
      registrant?.profileImageUrl ||
      registrant?.profilePhotoUrl,
    500
  );
  const linkedinProfileUrl = cleanLinkedInProfileUrl(
    registrant?.linkedinProfileUrl ||
      registrant?.linkedInProfileUrl ||
      registrant?.linkedinUrl ||
      registrant?.linkedInUrl
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
    linkedinProfileUrl,
    eventShowId: registrantShowId(registrant),
    eventShowLabel: eventShowLabel(registrantShowId(registrant)),
    eventShowTime: eventShowTime(registrantShowId(registrant)),
    lineupSourceRank: publicLineupSourceRank(registrant),
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

function publicPhotoFields(record = {}) {
  const photoUrl = cleanString(
    record.photoUrl ||
      record.photoURL ||
      record.photo ||
      record.headshotUrl ||
      record.bioImageUrl ||
      record.profileImageUrl ||
      record.profilePhotoUrl,
    500
  );
  if (!photoUrl) return null;
  return {
    photoKey: cleanString(record.photoKey, 500),
    photoUrl
  };
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
    isFeaturedSponsor: role === "featured-partner" || role === "featured-sponsor",
    isFeaturedPartner: role === "featured-partner" || role === "featured-sponsor"
  };
}

function publicLineupSourceRank(registrant = {}) {
  const sourceKey = cleanString(registrant.sourceKey || registrant.key, 500).toLowerCase();
  const source = cleanString(registrant.source || registrant.crmType || registrant.type, 200).toLowerCase();
  if (source.includes("manual-registration") || sourceKey.includes("manual-lineup")) return 500;
  if (source.includes("matrix-prospect") || sourceKey.includes("matrix-prospect")) return 450;
  if (sourceKey.includes(":registrant:") || sourceKey.includes("/registrations/")) return 400;
  if (sourceKey.includes("/invite-usage/")) return 300;
  if (sourceKey.includes(":event:") || source.includes("contact")) return 100;
  return 200;
}

function publicLineupCompare(left = {}, right = {}) {
  const leftRank = Number(left.lineupSourceRank ?? publicLineupSourceRank(left));
  const rightRank = Number(right.lineupSourceRank ?? publicLineupSourceRank(right));
  if (leftRank !== rightRank) return rightRank - leftRank;
  return cleanString(left.displayName || left.name).localeCompare(cleanString(right.displayName || right.name));
}

function publicFeaturedPerson(person = {}) {
  const { lineupSourceRank, ...publicPerson } = person;
  return publicPerson;
}

function clearLineupRoleFields(record = {}) {
  delete record.registrationRole;
  delete record.guestRegistrationType;
  delete record.partnerRegistrationType;
  delete record.contactEventRole;
  delete record.featuredGuestLabel;
  delete record.strategicRole;
  delete record.role;
  delete record.isFeaturedGuest;
  delete record.isFeaturedAuthor;
  delete record.isFeaturedPartner;
  delete record.isFeaturedSponsor;
  return record;
}

function clearShowFields(record = {}) {
  delete record.eventShowId;
  delete record.showId;
  delete record.eventShow;
  delete record.show;
  delete record.eventShowLabel;
  delete record.eventShowTime;
  delete record.eventTime;
  return record;
}

function hasExplicitLineupRole(record = {}) {
  return Boolean(
    cleanString(record.registrationRole) ||
      cleanString(record.guestRegistrationType) ||
      cleanString(record.partnerRegistrationType) ||
      cleanString(record.contactEventRole) ||
      cleanString(record.featuredGuestLabel) ||
      cleanString(record.strategicRole) ||
      cleanString(record.role) ||
      Object.prototype.hasOwnProperty.call(record, "isFeaturedGuest") ||
      Object.prototype.hasOwnProperty.call(record, "isFeaturedAuthor") ||
      Object.prototype.hasOwnProperty.call(record, "isFeaturedPartner") ||
      Object.prototype.hasOwnProperty.call(record, "isFeaturedSponsor")
  );
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
  const previousPublicPhoto = publicPhotoFields(previous);
  const registrantPublicPhoto = publicPhotoFields(registrant);
  const previousFeaturedRole = featuredRoleFields(previous);
  const previousShow = showFields(previous);
  const previousCanSupplyLineupFields = isCrmRegistrantRecord(previous);
  const next = { ...previous, ...registrant, type };

  if (!previousCanSupplyLineupFields && !hasExplicitLineupRole(registrant)) {
    clearLineupRoleFields(next);
  }

  if (!previousCanSupplyLineupFields && !showFields(registrant)) {
    clearShowFields(next);
  }

  if (previousSubmittedPhoto && !submittedPhotoFields(registrant)) {
    next.photoKey = previousSubmittedPhoto.photoKey || next.photoKey;
    next.photoUrl = previousSubmittedPhoto.photoUrl || next.photoUrl;
  }

  if (previousPublicPhoto && !registrantPublicPhoto) {
    next.photoKey = previousPublicPhoto.photoKey || next.photoKey;
    next.photoUrl = previousPublicPhoto.photoUrl || next.photoUrl;
  }

  if (previousCanSupplyLineupFields && previousFeaturedRole && !featuredRoleFields(registrant) && !hasExplicitLineupRole(registrant)) {
    Object.assign(next, previousFeaturedRole);
  }

  if (previousCanSupplyLineupFields && previousShow && !showFields(registrant)) {
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
          linkedinProfileUrl: cleanLinkedInProfileUrl(
            event.linkedinProfileUrl ||
              event.linkedInProfileUrl ||
              event.linkedinUrl ||
              event.linkedInUrl ||
              contact.linkedinProfileUrl ||
              contact.linkedInProfileUrl ||
              contact.linkedinUrl ||
              contact.linkedInUrl
          ),
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

function normalizedPersonName(value = "") {
  return cleanString(value, 240).toLowerCase().replace(/\s+/g, " ");
}

function contactProfileSearchTerms(registrants = []) {
  const emails = [];
  const names = [];
  const linkedInUrls = [];

  for (const registrant of registrants) {
    const email = cleanString(
      registrant.email ||
        registrant.usedByEmail ||
        registrant.intendedGuestEmail ||
        registrant.invitedEmail ||
        registrant.guestEmail,
      240
    ).toLowerCase();
    const name = normalizedPersonName(
      registrant.name ||
        registrant.displayName ||
        registrant.usedByName ||
        registrant.intendedGuestName ||
        registrant.invitedName ||
        registrant.guestName
    );
    const linkedIn = cleanLinkedInProfileUrl(
      registrant.linkedinProfileUrl ||
        registrant.linkedInProfileUrl ||
        registrant.linkedinUrl ||
        registrant.linkedInUrl
    );

    if (email) emails.push(email);
    if (name) names.push(name);
    if (linkedIn) linkedInUrls.push(linkedIn);
  }

  return { emails, names, linkedInUrls };
}

function hasUsefulProfileSupplement(profile = {}) {
  return Boolean(
    publicPhotoFields(profile) ||
      cleanString(profile.photoKey, 500) ||
      cleanLinkedInProfileUrl(
        profile.linkedinProfileUrl ||
          profile.linkedInProfileUrl ||
          profile.linkedinUrl ||
          profile.linkedInUrl
      ) ||
      cleanString(profile.title, 180) ||
      cleanString(profile.company || profile.partnerCompany, 180) ||
      cleanString(profile.industry || profile.organizationType, 140)
  );
}

function profileSupplementSort(a = {}, b = {}) {
  return Number(Boolean(publicPhotoFields(b))) - Number(Boolean(publicPhotoFields(a)));
}

async function contactProfileSupplements(env, registrants = []) {
  const d1Rows = await searchCrmD1Json(env, contactProfileSearchTerms(registrants)).catch(() => []);

  if (crmD1Primary(env)) {
    return d1Rows.filter(hasUsefulProfileSupplement).sort(profileSupplementSort);
  }

  const keys = await listKeys(env, "crm:contact:");
  const prefixRows = await Promise.all(keys.map(async (key) => {
    const contact = await readSetupJson(env, key);
    return contact && typeof contact === "object" ? { ...contact, sourceKey: key } : null;
  }));

  return [...d1Rows, ...prefixRows]
    .filter(Boolean)
    .filter(hasUsefulProfileSupplement)
    .sort(profileSupplementSort);
}

function profileMatchesRegistrant(profile = {}, registrant = {}) {
  const profileEmail = cleanString(profile.email, 240).toLowerCase();
  const registrantEmail = cleanString(registrant.email, 240).toLowerCase();
  if (profileEmail && registrantEmail && profileEmail === registrantEmail) return true;

  const profileLinkedIn = cleanLinkedInProfileUrl(
    profile.linkedinProfileUrl ||
      profile.linkedInProfileUrl ||
      profile.linkedinUrl ||
      profile.linkedInUrl
  ).toLowerCase().replace(/\/+$/, "");
  const registrantLinkedIn = cleanLinkedInProfileUrl(
    registrant.linkedinProfileUrl ||
      registrant.linkedInProfileUrl ||
      registrant.linkedinUrl ||
      registrant.linkedInUrl
  ).toLowerCase().replace(/\/+$/, "");
  if (profileLinkedIn && registrantLinkedIn && profileLinkedIn === registrantLinkedIn) return true;

  const profileName = normalizedPersonName(profile.name || profile.displayName);
  const registrantName = normalizedPersonName(registrant.name || registrant.displayName);
  return Boolean(profileName && registrantName && profileName === registrantName);
}

function mergeContactProfileSupplement(registrant = {}, profiles = []) {
  const profile = profiles.find((candidate) => profileMatchesRegistrant(candidate, registrant));
  if (!profile) return registrant;

  const profilePhoto = publicPhotoFields(profile);
  return {
    ...registrant,
    photoKey: cleanString(registrant.photoKey, 500) || cleanString(profile.photoKey, 500),
    photoUrl: publicPhotoFields(registrant)?.photoUrl || profilePhoto?.photoUrl || cleanString(registrant.photoUrl, 500),
    linkedinProfileUrl: cleanLinkedInProfileUrl(
      registrant.linkedinProfileUrl ||
        registrant.linkedInProfileUrl ||
        registrant.linkedinUrl ||
        registrant.linkedInUrl
    ) || cleanLinkedInProfileUrl(
      profile.linkedinProfileUrl ||
        profile.linkedInProfileUrl ||
        profile.linkedinUrl ||
        profile.linkedInUrl
    ),
    title: cleanString(registrant.title, 180) || cleanString(profile.title, 180),
    company: cleanString(registrant.company || registrant.partnerCompany, 180) || cleanString(profile.company || profile.partnerCompany, 180),
    industry: cleanString(registrant.industry || registrant.organizationType, 140) || cleanString(profile.industry || profile.organizationType, 140),
    publicationUseCompany: registrant.publicationUseCompany === true || profile.publicationUseCompany === true
  };
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
  const registrants = [contactRows, r2Rows, kvRows];
  const map = new Map();

  for (const registrant of registrants.flat()) {
    if (!registrantMatchesEvent(registrant, event)) continue;
    const type = cleanString(registrant.type, 40) || "guest";
    const key = registrantIdentity(type, registrant, registrant.sourceKey);
    const previous = map.get(key) || {};
    map.set(key, mergeRegistrantRecords(previous, registrant, type));
  }

  const mergedRegistrants = [...map.values()];
  const contactProfiles = await contactProfileSupplements(env, mergedRegistrants);
  return mergedRegistrants.map((registrant) => mergeContactProfileSupplement(registrant, contactProfiles));
}

function featuredGuestsFromRegistrants(registrants) {
  const featuredRegistrants = registrants
    .filter(isPublicFeaturedRegistrant)
    .sort(publicLineupCompare);

  return featuredShowLineups.flatMap((show) => {
    const people = featuredRegistrants
      .filter((registrant) => registrantMatchesShow(registrant, show.id))
      .map((registrant) => publicFeaturedGuest(registrant, registrant.type));
    return slotFeaturedPeople(people);
  }).slice(0, 18);
}

function featuredGuestsByShowFromRegistrants(registrants) {
  const featuredRegistrants = registrants
    .filter(isPublicFeaturedRegistrant)
    .sort(publicLineupCompare);

  return featuredShowLineups.reduce((lineups, show) => {
    const people = featuredRegistrants
      .filter((registrant) => registrantMatchesShow(registrant, show.id))
      .map((registrant) => publicFeaturedGuest(registrant, registrant.type));
    lineups[show.id] = slotFeaturedPeople(people);
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

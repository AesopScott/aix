import { getSessionUser } from "../_auth.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const profilePrefixes = ["partner-company:", "crm:company:", "partner-profile-company:", "partner-profile:", "partner:"];
const contactPrefixes = ["crm:contact:", "partner-contact:", "partner-profile-contact:"];
const registrationSources = [
  { type: "partner", label: "Partner", prefixes: ["crm:partner-registrant:", "partner-registration:"] },
  { type: "member", label: "Member", prefixes: ["crm:member-registrant:", "member-registration:"] },
  { type: "guest", label: "Guest", prefixes: ["crm:guest-registrant:", "guest-registration:"] }
];
const tierLabels = new Set([
  "Partner Candidate",
  "Research Partner",
  "Summit Partner",
  "Strategic Partner"
]);
const legacyTierLabels = new Map([
  ["Council Partner", "Research Partner"],
  ["Partner", "Research Partner"],
  ["Intelligence Partner", "Research Partner"],
  ["Founding Partner", "Strategic Partner"]
]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function cleanText(value, max = 400) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeEmail(value) {
  return cleanText(value, 240).toLowerCase();
}

function cleanMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function companySlug(value) {
  return cleanText(value, 180)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function sameCompany(left, right) {
  const leftSlug = companySlug(left);
  const rightSlug = companySlug(right);
  return Boolean(leftSlug && rightSlug && leftSlug === rightSlug);
}

function companyFromRecord(record = {}) {
  return cleanText(
    record.organizationName ||
      record.partnerCompany ||
      record.company ||
      record.companyName ||
      record.name,
    180
  );
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

async function getJson(env, key) {
  return env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
}

async function recordsForPrefixes(env, prefixes) {
  const keys = [...new Set((await Promise.all(prefixes.map((prefix) => listKeys(env, prefix)))).flat())];
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await getJson(env, key);
      return record ? { key, record } : null;
    })
  );
  return records.filter(Boolean);
}

function normalizeEvent(event) {
  const name = cleanText(event?.name || event?.title || event?.eventName || event?.event, 180);
  const id = cleanText(event?.id || event?.eventId || event?.slug || event?.eventSlug || name, 140);
  return {
    id,
    slug: cleanText(event?.slug || event?.eventSlug || id, 140),
    name: name || "Untitled event",
    date: cleanText(event?.date || event?.eventDate || event?.startAt || event?.dateLabel, 80),
    location: cleanText(event?.location || event?.city || event?.format, 120),
    role: cleanText(event?.role || event?.participation || event?.attendanceRole || "Company participant", 120)
  };
}

function eventFromRegistration(registration) {
  if (registration.manualPartner) return null;
  if (!registration.eventId && !registration.eventSlug && !registration.eventName) return null;
  return normalizeEvent({
    id: registration.eventId,
    slug: registration.eventSlug,
    name: registration.eventName,
    date: registration.eventDate,
    role: registration.typeLabel
  });
}

function normalizePublication(publication) {
  return {
    id: cleanText(publication?.id || publication?.slug || publication?.title, 120),
    title: cleanText(publication?.title || "Untitled publication", 180),
    type: cleanText(publication?.type || publication?.format || "Publication", 120),
    date: cleanText(publication?.date || publication?.publishedAt, 80),
    role: cleanText(publication?.role || publication?.contribution || "Contributor", 120),
    url: cleanText(publication?.url || publication?.href, 500)
  };
}

function normalizeSubscription(subscription) {
  const amount = cleanMoney(subscription?.amount || subscription?.value || subscription?.price || subscription?.quarterlyPrice);
  const cadence = cleanText(subscription?.cadence || subscription?.billingCadence || subscription?.frequency || "per quarter", 80);
  return {
    id: cleanText(subscription?.id || subscription?.date || subscription?.subscription || subscription?.program, 120),
    date: cleanText(subscription?.date || subscription?.paidAt || subscription?.startedAt || subscription?.startDate, 80),
    subscription: cleanText(subscription?.subscription || subscription?.program || subscription?.event || subscription?.eventName || "Executive subscription", 160),
    tier: cleanText(subscription?.tier || subscription?.category || subscription?.type || "Partner subscription", 120),
    status: cleanText(subscription?.status || "Recorded", 80),
    amount,
    cadence,
    priceLabel: cleanText(subscription?.priceLabel || (amount ? `$${amount.toLocaleString("en-US")} ${cadence}` : ""), 120),
    executiveSlots: Number.isFinite(Number(subscription?.executiveSlots || subscription?.executiveSlotCount || subscription?.slots))
      ? Number(subscription?.executiveSlots || subscription?.executiveSlotCount || subscription?.slots)
      : 0
  };
}

function normalizeContact(contact = {}) {
  const email = normalizeEmail(contact.email || contact.primaryContactEmail || contact.contactEmail);
  const name = cleanText(contact.name || contact.primaryContactName || contact.contactName, 160);
  return {
    id: email || `${name}:${cleanText(contact.company || contact.partnerCompany, 120)}`,
    name,
    email,
    company: companyFromRecord(contact),
    title: cleanText(contact.title || contact.role || contact.jobTitle, 160),
    source: cleanText(contact.source, 80)
  };
}

function normalizeProfile(record = {}, fallbackCompany = "", fallbackEmail = "") {
  const rawTier = cleanText(record.tier || record.partnerTier || "Not assigned", 80);
  const tier = legacyTierLabels.get(rawTier) || rawTier;
  const contacts = [
    ...cleanArray(record.contacts),
    ...cleanArray(record.partnerContacts),
    ...cleanArray(record.contactEmails).map((email) => ({ email })),
    {
      name: record.primaryContactName || record.contactName,
      email: record.primaryContactEmail || record.email || fallbackEmail,
      company: companyFromRecord(record) || fallbackCompany,
      title: record.primaryContactTitle || record.contactTitle
    }
  ]
    .map(normalizeContact)
    .filter((contact) => contact.email || contact.name);

  return {
    organizationName: companyFromRecord(record) || fallbackCompany || "Partner profile",
    tier: tierLabels.has(tier) ? tier : tier,
    status: cleanText(record.status || "Profile active", 80),
    contacts,
    events: cleanArray(record.events || record.attendedEvents).map(normalizeEvent).filter((event) => event.id || event.name),
    publications: cleanArray(record.publications).map(normalizePublication).filter((publication) => publication.title),
    subscriptions: cleanArray(record.subscriptions || record.payments || record.contributions || record.sponsorships)
      .map(normalizeSubscription)
      .filter((subscription) => subscription.amount || subscription.subscription)
  };
}

function normalizeRegistration(entry, source) {
  const record = entry.record || {};
  return {
    key: entry.key,
    type: source.type,
    typeLabel: source.label,
    id: cleanText(record.id || entry.key, 180),
    name: cleanText(record.name, 160),
    email: normalizeEmail(record.email),
    company: companyFromRecord(record),
    title: cleanText(record.title, 160),
    eventId: cleanText(record.eventId || record.eventSlug || record.event || record.eventName, 180),
    eventSlug: cleanText(record.eventSlug, 180),
    eventName: cleanText(record.eventName || record.event, 180),
    eventDate: cleanText(record.eventDate || record.date || record.startAt, 80),
    role: cleanText(record.role || record.participation || source.label, 120),
    createdAt: cleanText(record.createdAt, 80),
    manualPartner: record.manualPartner === true
  };
}

async function allRegistrations(env) {
  const grouped = await Promise.all(
    registrationSources.map(async (source) => {
      const entries = await recordsForPrefixes(env, source.prefixes);
      return entries.map((entry) => normalizeRegistration(entry, source));
    })
  );
  return grouped.flat();
}

async function explicitContactCompany(env, email) {
  for (const prefix of contactPrefixes) {
    const record = await getJson(env, `${prefix}${email}`);
    if (!record) continue;
    const profileKey = cleanText(record.profileKey || record.companyProfileKey, 240);
    const company = cleanText(record.company || record.companyName || record.organizationName || record.partnerCompany, 180);
    const slug = cleanText(record.companySlug || record.slug || companySlug(company), 140);
    return { profileKey, company, slug, record };
  }
  return null;
}

async function profileByKey(env, key) {
  if (!key) return null;
  const record = await getJson(env, key);
  return record ? { key, record } : null;
}

async function profileByCompany(env, company) {
  const slug = companySlug(company);
  if (!slug) return null;
  for (const prefix of profilePrefixes) {
    const key = `${prefix}${slug}`;
    const record = await getJson(env, key);
    if (record) return { key, record };
  }
  return null;
}

async function profileByContactScan(env, email) {
  const entries = await recordsForPrefixes(env, profilePrefixes);
  return entries.find(({ record }) => {
    const profile = normalizeProfile(record, "", email);
    return profile.contacts.some((contact) => contact.email === email);
  }) || null;
}

async function legacyEmailProfile(env, email) {
  for (const prefix of ["partner-profile:", "partner:"]) {
    const key = `${prefix}${email}`;
    const record = await getJson(env, key);
    if (record) return { key, record };
  }
  return null;
}

async function resolveCompanyProfile(env, email, registrations) {
  const explicit = await explicitContactCompany(env, email);
  if (explicit?.profileKey) {
    const stored = await profileByKey(env, explicit.profileKey);
    if (stored) return { ...stored, company: explicit.company };
  }
  if (explicit?.company || explicit?.slug) {
    const stored = await profileByCompany(env, explicit.company || explicit.slug);
    if (stored) return { ...stored, company: explicit.company };
  }

  const scanned = await profileByContactScan(env, email);
  if (scanned) return { ...scanned, company: companyFromRecord(scanned.record) };

  const legacy = await legacyEmailProfile(env, email);
  if (legacy) return { ...legacy, company: companyFromRecord(legacy.record) };

  const ownRows = registrations.filter((row) => row.email === email);
  const company = companyFromRecord(ownRows[0] || {});
  if (company) {
    const stored = await profileByCompany(env, company);
    if (stored) return { ...stored, company };
    return { key: "", record: { organizationName: company, contacts: [{ email, company }] }, company };
  }

  return null;
}

function dedupeContacts(contacts) {
  const map = new Map();
  for (const contact of contacts.map(normalizeContact).filter((entry) => entry.email || entry.name)) {
    const key = contact.email || contact.id;
    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      ...contact,
      name: contact.name || existing.name || "",
      email: contact.email || existing.email || "",
      company: contact.company || existing.company || "",
      title: contact.title || existing.title || "",
      source: contact.source || existing.source || ""
    });
  }
  return [...map.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

function eventKey(event) {
  return cleanText(event.id || event.slug || event.name, 180).toLowerCase();
}

function dedupeEvents(events) {
  const map = new Map();
  for (const event of events.map(normalizeEvent).filter((entry) => entry.id || entry.name)) {
    const key = eventKey(event);
    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      ...event,
      name: event.name || existing.name || "Untitled event",
      date: event.date || existing.date || "",
      location: event.location || existing.location || "",
      role: event.role || existing.role || "Company participant"
    });
  }
  return [...map.values()].sort((a, b) => String(b.date || b.name).localeCompare(String(a.date || a.name)));
}

function eventMatchers(event) {
  return [event.id, event.slug, event.name].map((value) => cleanText(value, 180).toLowerCase()).filter(Boolean);
}

function registrationEventValues(row) {
  return [row.eventId, row.eventSlug, row.eventName].map((value) => cleanText(value, 180).toLowerCase()).filter(Boolean);
}

function attendedByCompany(profile, registrations) {
  const company = profile.organizationName;
  const knownEmails = new Set(profile.contacts.map((contact) => contact.email).filter(Boolean));
  return registrations.filter((row) => {
    if (knownEmails.has(row.email)) return true;
    return sameCompany(row.company, company);
  });
}

function attendeesForEvent(event, registrations) {
  const matchers = eventMatchers(event);
  const seen = new Set();
  return registrations
    .filter((row) => {
      const values = registrationEventValues(row);
      return values.some((value) => matchers.includes(value));
    })
    .map((row) => ({
      id: row.email || row.id,
      name: row.name,
      company: row.company,
      title: row.title,
      type: row.typeLabel
    }))
    .filter((row) => {
      const key = row.id || `${row.name}:${row.company}:${row.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user?.email) {
    return json({ error: "Sign in with a Mojo AI Summits partner account to view this company profile." }, { status: 401 });
  }

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Partner profile storage is not configured." }, { status: 500 });
  }

  const email = normalizeEmail(user.email);
  const registrations = await allRegistrations(env);
  const storedProfile = await resolveCompanyProfile(env, email, registrations);
  if (!storedProfile?.key) {
    return json({ error: "This account is not connected to a partner company profile." }, { status: 403 });
  }

  const profile = normalizeProfile(storedProfile?.record || {}, storedProfile?.company || "", email);
  const companyRows = attendedByCompany(profile, registrations);
  const contacts = dedupeContacts([
    ...profile.contacts,
    ...companyRows.map((row) => ({
      name: row.name,
      email: row.email,
      company: row.company || profile.organizationName,
      title: row.title,
      source: row.typeLabel
    }))
  ]);
  const companyEvents = dedupeEvents([
    ...profile.events,
    ...companyRows.map(eventFromRegistration).filter(Boolean)
  ]);
  const events = companyEvents.map((event) => ({
    ...event,
    attendees: attendeesForEvent(event, registrations)
  }));
  const totalSubscriptionPayments = profile.subscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const executiveSlots = profile.subscriptions.reduce((sum, subscription) => sum + subscription.executiveSlots, 0);

  return json({
    ok: true,
    configured: Boolean(storedProfile?.key),
    profile: {
      ...profile,
      contacts,
      events,
      subscriptions: profile.subscriptions,
      contributions: profile.subscriptions,
      totalSubscriptionPayments,
      totalContributed: totalSubscriptionPayments,
      executiveSlots
    },
    schema: {
      profileKey: storedProfile?.key || `partner-company:${companySlug(profile.organizationName)}`,
      contactKeys: contactPrefixes.map((prefix) => `${prefix}${email}`),
      note: "Partner profiles are company-based. Map contacts to a company profile with crm:contact:{email}, or store contacts on partner-company:{company-slug}."
    }
  });
}

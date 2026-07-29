import { getSessionUser } from "../_auth.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const profileKeys = (email) => [
  `partner-profile:${email}`,
  `partner:${email}`
];

const guestPrefixes = ["crm:guest-registrant:", "guest-registration:"];
const tierLabels = new Set([
  "Partner Candidate",
  "Council Partner",
  "Intelligence Partner",
  "Summit Partner",
  "Founding Partner"
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

async function readProfile(env, email) {
  for (const key of profileKeys(email)) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (record) return { key, record };
  }
  return null;
}

function normalizeEvent(event) {
  const id = cleanText(event?.id || event?.slug || event?.name, 120);
  return {
    id,
    slug: cleanText(event?.slug || id, 120),
    name: cleanText(event?.name || event?.title || "Untitled event", 160),
    date: cleanText(event?.date || event?.startAt || event?.dateLabel, 80),
    location: cleanText(event?.location || event?.city || event?.format, 120),
    role: cleanText(event?.role || event?.participation || "Partner participant", 120)
  };
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

function normalizeContribution(contribution) {
  return {
    id: cleanText(contribution?.id || contribution?.date || contribution?.event, 120),
    date: cleanText(contribution?.date || contribution?.paidAt || contribution?.pledgedAt, 80),
    event: cleanText(contribution?.event || contribution?.eventName || contribution?.program || "Network contribution", 160),
    category: cleanText(contribution?.category || contribution?.type || "Sponsorship", 120),
    status: cleanText(contribution?.status || "Recorded", 80),
    amount: cleanMoney(contribution?.amount || contribution?.value)
  };
}

function normalizeProfile(record, email) {
  const tier = cleanText(record?.tier || record?.partnerTier || "Not assigned", 80);
  const events = cleanArray(record?.events || record?.attendedEvents).map(normalizeEvent).filter((event) => event.id);
  const publications = cleanArray(record?.publications).map(normalizePublication).filter((publication) => publication.title);
  const contributions = cleanArray(record?.sponsorships || record?.contributions || record?.payments)
    .map(normalizeContribution)
    .filter((contribution) => contribution.amount || contribution.event);

  return {
    organizationName: cleanText(record?.organizationName || record?.company || record?.name || "Partner profile"),
    primaryContactName: cleanText(record?.primaryContactName || record?.contactName || ""),
    primaryContactEmail: normalizeEmail(record?.primaryContactEmail || record?.email || email),
    tier: tierLabels.has(tier) ? tier : tier,
    status: cleanText(record?.status || "Profile active", 80),
    events,
    publications,
    contributions
  };
}

function normalizeGuest(key, record) {
  return {
    key,
    id: cleanText(record?.id || key, 160),
    eventId: cleanText(record?.eventId || record?.eventSlug || record?.event || record?.eventName, 160),
    eventName: cleanText(record?.eventName || record?.event || "", 160),
    name: cleanText(record?.name, 160),
    email: normalizeEmail(record?.email),
    company: cleanText(record?.company, 160),
    title: cleanText(record?.title, 160)
  };
}

async function guestRegistrants(env) {
  const keyLists = await Promise.all(guestPrefixes.map((prefix) => listKeys(env, prefix)));
  const keys = [...new Set(keyLists.flat())];
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
      return record ? normalizeGuest(key, record) : null;
    })
  );
  return rows.filter(Boolean);
}

function eventMatchers(event) {
  return [event.id, event.slug, event.name].map(cleanText).filter(Boolean);
}

function guestsForEvent(event, guests) {
  const matchers = eventMatchers(event);
  return guests
    .filter((guest) => {
      const values = [guest.eventId, guest.eventName].map(cleanText).filter(Boolean);
      return values.some((value) => matchers.includes(value));
    })
    .map((guest) => ({
      name: guest.name,
      email: guest.email,
      company: guest.company,
      title: guest.title
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user?.email) {
    return json({ error: "Sign in with a Mojo AI Summits partner account to view this profile." }, { status: 401 });
  }

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Partner profile storage is not configured." }, { status: 500 });
  }

  const email = normalizeEmail(user.email);
  const storedProfile = await readProfile(env, email);
  const profile = normalizeProfile(storedProfile?.record || {}, email);
  const guests = await guestRegistrants(env);
  const events = profile.events.map((event) => ({
    ...event,
    guests: guestsForEvent(event, guests)
  }));
  const totalContributed = profile.contributions.reduce((sum, contribution) => sum + contribution.amount, 0);

  return json({
    ok: true,
    configured: Boolean(storedProfile),
    profile: {
      ...profile,
      events,
      totalContributed
    },
    schema: {
      profileKey: `partner-profile:${email}`,
      note: "Add events, publications, and sponsorships to the partner profile record to populate this page."
    }
  });
}

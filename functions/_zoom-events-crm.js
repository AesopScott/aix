import { readCrmD1Json } from "./_crm-d1.js";

const zoomEventsConfigKey = "crm:zoom-events-config";
const zoomEventsApiBase = "https://api.zoom.us/v2";
const zoomEventsTokenUrl = "https://zoom.us/oauth/token";
const defaultRegistrationSource = "Mojo CRM";
const syncVersion = "2026-09-03.1";
const featuredRoles = new Set(["featured-guest", "featured-author", "featured-partner"]);
const staffRoles = new Set(["staff", "host", "co-host", "cohost", "alternative-host", "moderator", "producer"]);
let cachedAccessToken = null;

function cleanString(value, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(value).toLowerCase());
}

function cleanEventShowId(value, fallback = "both") {
  const raw = cleanString(value, 80).toLowerCase();
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

function cleanRole(value) {
  const raw = cleanString(value, 120).toLowerCase().replace(/[\s_]+/g, "-");
  if (raw === "cohost") return "co-host";
  if (raw.includes("featured-partner")) return "featured-partner";
  if (raw.includes("featured-author")) return "featured-author";
  if (raw.includes("featured-guest")) return "featured-guest";
  if (raw.includes("featured-member")) return "featured-member";
  if (raw.includes("alternative-host")) return "alternative-host";
  if (raw.includes("co-host") || raw.includes("cohost")) return "co-host";
  if (raw.includes("moderator")) return "moderator";
  if (raw.includes("producer")) return "producer";
  if (raw.includes("staff")) return "staff";
  if (raw.includes("host")) return "host";
  if (raw.includes("speaker") || raw.includes("presenter")) return "presenter";
  if (raw.includes("partner")) return "partner";
  if (raw.includes("member")) return "member";
  return raw || "guest";
}

function registrationRole(record = {}, type = "") {
  if (cleanBoolean(record.isFeaturedPartner)) return "featured-partner";
  if (cleanBoolean(record.isFeaturedAuthor)) return "featured-author";
  if (cleanBoolean(record.isFeaturedGuest)) return "featured-guest";
  const role = cleanRole(
    record.zoomEventsRole ||
      record.staffRole ||
      record.registrationRole ||
      record.partnerRegistrationType ||
      record.guestRegistrationType ||
      record.role ||
      type
  );
  if (type === "partner" && role === "guest") return "partner";
  return role || "guest";
}

function registrationEmail(record = {}) {
  return cleanString(
    record.email ||
      record.contactEmail ||
      record.intendedGuestEmail ||
      record.invitedEmail ||
      record.guestEmail ||
      record.partnerContactEmail ||
      record.usedByEmail ||
      record.usedBy
  ).toLowerCase();
}

function eventSlug(record = {}) {
  const slug = cleanString(record.eventSlug, 240);
  if (slug) return slug;
  const eventId = cleanString(record.eventId, 240);
  if (eventId) return eventId.split(":")[0].trim();
  return cleanString(record.eventName, 240);
}

function splitName(name = "") {
  const parts = cleanString(name, 240).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] };
}

function personName(record = {}, email = "") {
  const name = cleanString(record.name || record.contactName || record.intendedGuestName || record.invitedName || record.guestName || record.partnerContactName, 240);
  return isEmail(name) ? email : name || email;
}

function alphanumericId(value = "", fallback = "") {
  const clean = cleanString(value, 500)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]/g, "");
  return (clean || fallback || "mojocrm").slice(0, 120);
}

function normalizedConfig(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const events = raw.events && typeof raw.events === "object" ? raw.events : {};
  for (const [key, value] of Object.entries(raw)) {
    if (!["defaults", "events", "staff", "staffRoles"].includes(key) && value && typeof value === "object") {
      events[key] = value;
    }
  }
  return {
    ...raw,
    events,
    defaults: raw.defaults && typeof raw.defaults === "object" ? raw.defaults : {}
  };
}

async function readStoredZoomEventsConfig(env) {
  const d1Record = await readCrmD1Json(env, zoomEventsConfigKey).catch(() => null);
  if (d1Record && typeof d1Record === "object") return d1Record.config && typeof d1Record.config === "object" ? d1Record.config : d1Record;
  if (env?.MOJO_SUMMITS_SETUP_STATE?.get) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(zoomEventsConfigKey, "json").catch(() => null);
    if (record && typeof record === "object") return record.config && typeof record.config === "object" ? record.config : record;
  }
  return {};
}

export async function readZoomEventsCrmConfig(env) {
  const rawEnv = cleanString(env?.MOJO_ZOOM_EVENTS_CONFIG_JSON, 200000);
  if (rawEnv) {
    try {
      return normalizedConfig(JSON.parse(rawEnv));
    } catch {
      return {
        events: {},
        defaults: {},
        configError: "MOJO_ZOOM_EVENTS_CONFIG_JSON is not valid JSON."
      };
    }
  }
  return normalizedConfig(await readStoredZoomEventsConfig(env));
}

function zoomEventsCredentials(env) {
  const accessToken = cleanString(env?.ZOOM_EVENTS_ACCESS_TOKEN, 4000);
  if (accessToken) return { mode: "static-token", accessToken };
  const accountId = cleanString(env?.ZOOM_EVENTS_ACCOUNT_ID, 500);
  const clientId = cleanString(env?.ZOOM_EVENTS_CLIENT_ID, 500);
  const clientSecret = cleanString(env?.ZOOM_EVENTS_CLIENT_SECRET, 500);
  return { mode: "server-to-server", accountId, clientId, clientSecret };
}

function missingCredentialNames(credentials = {}) {
  if (credentials.accessToken) return [];
  return [
    credentials.accountId ? "" : "ZOOM_EVENTS_ACCOUNT_ID",
    credentials.clientId ? "" : "ZOOM_EVENTS_CLIENT_ID",
    credentials.clientSecret ? "" : "ZOOM_EVENTS_CLIENT_SECRET"
  ].filter(Boolean);
}

function basicAuthValue(clientId, clientSecret) {
  const raw = `${clientId}:${clientSecret}`;
  if (typeof btoa === "function") return btoa(raw);
  if (typeof Buffer !== "undefined") return Buffer.from(raw, "utf8").toString("base64");
  throw new Error("This runtime cannot encode Zoom credentials.");
}

async function zoomEventsAccessToken(env) {
  const credentials = zoomEventsCredentials(env);
  if (credentials.accessToken) return credentials.accessToken;
  const missing = missingCredentialNames(credentials);
  if (missing.length) {
    const error = new Error(`Zoom Events credentials are missing: ${missing.join(", ")}.`);
    error.code = "zoom_events_credentials_missing";
    error.missing = missing;
    throw error;
  }

  const cacheKey = `${credentials.accountId}:${credentials.clientId}`;
  if (cachedAccessToken?.key === cacheKey && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  const url = `${zoomEventsTokenUrl}?grant_type=account_credentials&account_id=${encodeURIComponent(credentials.accountId)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${basicAuthValue(credentials.clientId, credentials.clientSecret)}`
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.access_token) {
    const error = new Error(cleanString(body?.message, 500) || `Zoom token request failed with HTTP ${response.status}.`);
    error.status = response.status;
    error.zoomBody = safeZoomBody(body);
    throw error;
  }

  cachedAccessToken = {
    key: cacheKey,
    token: body.access_token,
    expiresAt: Date.now() + Math.max(Number(body.expires_in || 3600) - 120, 60) * 1000
  };
  return cachedAccessToken.token;
}

function safeZoomBody(body = {}) {
  if (!body || typeof body !== "object") return {};
  return {
    code: cleanString(body.code || body.error || body.error_code, 120),
    message: cleanString(body.message || body.reason || body.error_description, 1000),
    errors: Array.isArray(body.errors)
      ? body.errors.slice(0, 10).map((entry) => ({
          email: cleanString(entry?.email, 240).toLowerCase(),
          errorCode: cleanString(entry?.error_code || entry?.code, 120),
          message: cleanString(entry?.message, 1000)
        }))
      : undefined
  };
}

async function zoomEventsRequest(env, path, options = {}) {
  const token = await zoomEventsAccessToken(env);
  const response = await fetch(`${zoomEventsApiBase}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json; charset=utf-8" } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return {};
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(cleanString(body?.message, 1000) || `Zoom Events API request failed with HTTP ${response.status}.`);
    error.status = response.status;
    error.zoomBody = safeZoomBody(body);
    throw error;
  }
  return body;
}

async function listZoomEventsPages(env, path, collectionName) {
  const rows = [];
  let nextPageToken = "";
  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextPageToken) params.set("next_page_token", nextPageToken);
    const body = await zoomEventsRequest(env, `${path}?${params.toString()}`);
    rows.push(...(Array.isArray(body?.[collectionName]) ? body[collectionName] : []));
    nextPageToken = cleanString(body?.next_page_token, 1000);
  } while (nextPageToken);
  return rows;
}

function eventConfigFor(config = {}, slug = "") {
  const cleanSlug = cleanString(slug, 240);
  if (!cleanSlug) return null;
  return config.events?.[cleanSlug] ||
    config.events?.[cleanSlug.toLowerCase()] ||
    config.events?.[cleanSlug.replace(/\s+/g, "-").toLowerCase()] ||
    null;
}

function showConfigFor(eventConfig = {}, showId = "") {
  const shows = eventConfig?.shows && typeof eventConfig.shows === "object" ? eventConfig.shows : {};
  return shows[showId] || {};
}

function syncKindFor(role = "") {
  const clean = cleanRole(role);
  if (featuredRoles.has(clean)) return "speaker-panelist";
  if (staffRoles.has(clean)) return "staff";
  return "attendee";
}

function targetForRegistration(record = {}, type = "", config = {}) {
  const email = registrationEmail(record);
  const slug = eventSlug(record);
  const role = registrationRole(record, type);
  const kind = syncKindFor(role);
  const showId = cleanEventShowId(record.eventShowId || record.showId || record.eventShow, kind === "speaker-panelist" ? "" : "both");
  const eventConfig = eventConfigFor(config, slug);
  const showConfig = showConfigFor(eventConfig, showId);
  const zoomEventId = cleanString(eventConfig?.zoomEventId || eventConfig?.eventId || eventConfig?.id, 240);
  const sessionId = cleanString(
    record.zoomEventsSessionId ||
      showConfig.sessionId ||
      eventConfig?.sessionId,
    240
  );
  const configuredStaffRoles = {
    ...(eventConfig?.staffRoles && typeof eventConfig.staffRoles === "object" ? eventConfig.staffRoles : {}),
    ...(showConfig?.staffRoles && typeof showConfig.staffRoles === "object" ? showConfig.staffRoles : {})
  };
  const staffZoomRole = cleanRole(record.zoomEventsStaffRole || configuredStaffRoles[role] || role);
  const ticketTypeId = cleanString(
    record.zoomEventsTicketTypeId ||
      (kind === "speaker-panelist" ? showConfig.speakerTicketTypeId || showConfig.panelistTicketTypeId : "") ||
      showConfig.ticketTypeId ||
      showConfig.attendeeTicketTypeId ||
      eventConfig?.ticketTypeId ||
      eventConfig?.attendeeTicketTypeId,
    240
  );

  return {
    email,
    slug,
    showId,
    role,
    kind,
    staffZoomRole,
    eventConfig,
    showConfig,
    zoomEventId,
    sessionId,
    ticketTypeId
  };
}

export function zoomEventsRegistrationFingerprint(record = {}, type = "") {
  const email = registrationEmail(record);
  const slug = eventSlug(record);
  const role = registrationRole(record, type);
  const showId = cleanEventShowId(record.eventShowId || record.showId || record.eventShow, "both");
  return [
    email,
    slug,
    showId,
    role,
    cleanString(record.name || record.contactName, 240),
    cleanString(record.company || record.partnerCompany, 240),
    cleanString(record.title || record.jobTitle, 240)
  ].join("|").toLowerCase();
}

function externalTicketId(record = {}, target = {}) {
  const existing = cleanString(record.zoomEventsSync?.externalTicketId, 240);
  if (existing) return existing;
  return alphanumericId(`mojo-${target.slug}-${target.showId}-${target.kind}-${target.email}-${record.id || record.registrationId || ""}`, "mojocrm");
}

function retryAt(retryCount = 0) {
  const minutes = [5, 15, 60, 240, 1440][Math.min(Math.max(retryCount, 0), 4)];
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function syncState(record = {}, updates = {}) {
  const previous = record.zoomEventsSync && typeof record.zoomEventsSync === "object" ? record.zoomEventsSync : {};
  return {
    ...previous,
    version: syncVersion,
    ...updates
  };
}

function pendingState(record = {}, target = {}, reason = "", details = {}) {
  const now = new Date().toISOString();
  return syncState(record, {
    status: "pending_configuration",
    synced: false,
    role: target.kind || "",
    crmRole: target.role || "",
    eventSlug: target.slug || "",
    eventShowId: target.showId || "",
    zoomEventId: target.zoomEventId || "",
    zoomSessionId: target.sessionId || "",
    ticketTypeId: target.ticketTypeId || "",
    attemptedAt: now,
    error: cleanString(reason, 1000),
    missing: Array.isArray(details.missing) ? details.missing : undefined,
    nextRetryAt: "",
    retryCount: Number(record.zoomEventsSync?.retryCount || 0)
  });
}

function skippedState(record = {}, target = {}) {
  return syncState(record, {
    status: "current",
    synced: true,
    role: target.kind,
    crmRole: target.role,
    eventSlug: target.slug,
    eventShowId: target.showId,
    zoomEventId: target.zoomEventId,
    zoomSessionId: target.sessionId,
    ticketTypeId: target.ticketTypeId,
    skippedAt: new Date().toISOString()
  });
}

function failedState(record = {}, target = {}, error) {
  const previousRetry = Number(record.zoomEventsSync?.retryCount || 0);
  const retryCount = previousRetry + 1;
  return syncState(record, {
    status: "failed",
    synced: false,
    role: target.kind || "",
    crmRole: target.role || "",
    eventSlug: target.slug || "",
    eventShowId: target.showId || "",
    zoomEventId: target.zoomEventId || "",
    zoomSessionId: target.sessionId || "",
    ticketTypeId: target.ticketTypeId || "",
    attemptedAt: new Date().toISOString(),
    retryCount,
    nextRetryAt: retryAt(retryCount),
    error: cleanString(error?.message || "Zoom Events sync failed.", 1000),
    httpStatus: Number(error?.status || 0) || undefined,
    zoom: error?.zoomBody || undefined
  });
}

function successState(record = {}, target = {}, details = {}) {
  return syncState(record, {
    status: "synced",
    synced: true,
    role: target.kind,
    crmRole: target.role,
    eventSlug: target.slug,
    eventShowId: target.showId,
    zoomEventId: target.zoomEventId,
    zoomSessionId: target.sessionId,
    ticketTypeId: target.ticketTypeId,
    externalTicketId: details.externalTicketId || record.zoomEventsSync?.externalTicketId || "",
    ticketId: details.ticketId || record.zoomEventsSync?.ticketId || "",
    ticketRoleType: details.ticketRoleType || record.zoomEventsSync?.ticketRoleType || "",
    speakerId: details.speakerId || record.zoomEventsSync?.speakerId || "",
    eventJoinLink: details.eventJoinLink || record.zoomEventsSync?.eventJoinLink || "",
    eventRegistrationLink: details.eventRegistrationLink || record.zoomEventsSync?.eventRegistrationLink || "",
    syncedAt: new Date().toISOString(),
    attemptedAt: new Date().toISOString(),
    retryCount: 0,
    nextRetryAt: "",
    error: ""
  });
}

function recordWithZoomEventsState(record = {}, state = {}) {
  const accessLink = cleanString(state.eventJoinLink || state.eventRegistrationLink, 1000);
  return {
    ...record,
    ...(accessLink ? {
      eventAccessLink: accessLink,
      accessLink,
      zoomJoinUrl: accessLink,
      zoomEventsJoinUrl: cleanString(state.eventJoinLink, 1000),
      zoomEventsRegistrationLink: cleanString(state.eventRegistrationLink, 1000)
    } : {}),
    zoomEventsSync: state
  };
}

function assertTargetReady(target = {}, credentials = {}, config = {}) {
  const missing = missingCredentialNames(credentials);
  if (config.configError) missing.push("MOJO_ZOOM_EVENTS_CONFIG_JSON(valid_json)");
  if (!target.email || !isEmail(target.email)) missing.push("registration.email");
  if (!target.slug) missing.push("registration.eventSlug");
  if (!target.eventConfig) missing.push(`MOJO_ZOOM_EVENTS_CONFIG_JSON.events.${target.slug}`);
  if (!target.zoomEventId) missing.push(`MOJO_ZOOM_EVENTS_CONFIG_JSON.events.${target.slug}.zoomEventId`);
  if (target.kind === "speaker-panelist" && !target.showId) missing.push("registration.eventShowId");
  if ((target.kind === "speaker-panelist" || target.kind === "staff") && !target.sessionId) missing.push(`MOJO_ZOOM_EVENTS_CONFIG_JSON.events.${target.slug}.shows.${target.showId}.sessionId`);
  if (target.kind === "staff" && !["alternative-host", "co-host", "cohost", "host"].includes(target.staffZoomRole)) {
    missing.push(`MOJO_ZOOM_EVENTS_CONFIG_JSON.events.${target.slug}.staffRoles.${target.role}`);
  }
  if (target.kind !== "staff" && !target.ticketTypeId) missing.push(`MOJO_ZOOM_EVENTS_CONFIG_JSON.events.${target.slug}.shows.${target.showId}.ticketTypeId`);
  return missing;
}

async function findExistingTicket(env, target = {}, externalId = "") {
  const tickets = await listZoomEventsPages(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/tickets`, "tickets");
  return tickets.find((ticket) => cleanString(ticket.external_ticket_id) === externalId) ||
    tickets.find((ticket) =>
      cleanString(ticket.email).toLowerCase() === target.email &&
      (!target.ticketTypeId || cleanString(ticket.ticket_type_id) === target.ticketTypeId)
    ) ||
    null;
}

function ticketPayload(record = {}, target = {}, config = {}, externalId = "") {
  const defaults = config.defaults || {};
  const names = splitName(personName(record, target.email));
  const includeSessionIds = target.showConfig?.includeSessionIds === true || defaults.includeSessionIds === true;
  const ticket = {
    email: target.email,
    ticket_type_id: target.ticketTypeId,
    external_ticket_id: externalId,
    send_notification: cleanBoolean(target.showConfig?.sendNotification ?? defaults.sendNotification),
    fast_join: cleanBoolean(target.showConfig?.fastJoin ?? defaults.fastJoin),
    registration_needed: cleanBoolean(target.showConfig?.registrationNeeded ?? defaults.registrationNeeded),
    authentication_method: cleanString(target.showConfig?.authenticationMethod || defaults.authenticationMethod || "zoom_account", 80),
    security_code_at_join: cleanBoolean(target.showConfig?.securityCodeAtJoin ?? defaults.securityCodeAtJoin),
    first_name: names.firstName,
    last_name: names.lastName,
    phone: cleanString(record.phone, 80),
    industry: cleanString(record.industry, 120),
    job_title: cleanString(record.title || record.jobTitle, 240),
    organization: cleanString(record.partnerCompany || record.company, 240),
    city: cleanString(record.city, 120),
    state: cleanString(record.stateCountry || record.state || record.country, 120),
    comments: cleanString(record.eventNotes || record.registrationNotes || record.crmNotes, 1000)
  };
  if (includeSessionIds && target.sessionId) ticket.session_ids = [target.sessionId];
  if (!ticket.fast_join) delete ticket.fast_join;
  if (!ticket.registration_needed) delete ticket.registration_needed;
  if (!ticket.security_code_at_join) delete ticket.security_code_at_join;
  for (const key of Object.keys(ticket)) {
    if (ticket[key] === "" || ticket[key] === undefined || ticket[key] === null) delete ticket[key];
  }
  return ticket;
}

async function ensureTicket(env, record = {}, target = {}, config = {}) {
  const externalId = externalTicketId(record, target);
  const existing = await findExistingTicket(env, target, externalId).catch(() => null);
  if (existing) {
    return {
      ticketId: cleanString(existing.ticket_id, 240),
      ticketRoleType: cleanString(existing.ticket_role_type, 120),
      eventJoinLink: cleanString(existing.event_join_link, 1000),
      eventRegistrationLink: cleanString(existing.event_registration_link, 1000),
      externalTicketId: cleanString(existing.external_ticket_id || externalId, 240),
      created: false
    };
  }

  const body = await zoomEventsRequest(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/tickets`, {
    method: "POST",
    body: JSON.stringify({
      registration_source: cleanString(config.registrationSource, 120) || defaultRegistrationSource,
      tickets: [ticketPayload(record, target, config, externalId)]
    })
  });
  const zoomError = Array.isArray(body?.errors)
    ? body.errors.find((entry) => cleanString(entry?.email).toLowerCase() === target.email) || body.errors[0]
    : null;
  if (zoomError) {
    const error = new Error(cleanString(zoomError.message, 1000) || "Zoom Events ticket creation failed.");
    error.zoomBody = safeZoomBody({ errors: [zoomError] });
    throw error;
  }
  const ticket = Array.isArray(body?.tickets)
    ? body.tickets.find((entry) => cleanString(entry?.email).toLowerCase() === target.email) || body.tickets[0]
    : null;
  if (!ticket) throw new Error("Zoom Events did not return a ticket for this registration.");
  return {
    ticketId: cleanString(ticket.ticket_id, 240),
    ticketRoleType: cleanString(ticket.ticket_role_type, 120),
    eventJoinLink: cleanString(ticket.event_join_link, 1000),
    eventRegistrationLink: cleanString(ticket.event_registration_link, 1000),
    externalTicketId: cleanString(ticket.external_ticket_id || externalId, 240),
    created: true
  };
}

async function findSpeakerByEmail(env, target = {}) {
  const speakers = await listZoomEventsPages(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/speakers`, "speakers");
  return speakers.find((speaker) => cleanString(speaker.email).toLowerCase() === target.email) || null;
}

async function ensureSpeaker(env, record = {}, target = {}) {
  const existing = await findSpeakerByEmail(env, target).catch(() => null);
  if (existing?.speaker_id) return { speakerId: cleanString(existing.speaker_id, 240), created: false };
  const body = await zoomEventsRequest(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/speakers`, {
    method: "POST",
    body: JSON.stringify({
      name: personName(record, target.email),
      email: target.email,
      job_title: cleanString(record.title || record.jobTitle, 240),
      company_name: cleanString(record.partnerCompany || record.company, 240),
      linkedin_url: cleanString(record.linkedinProfileUrl || record.linkedInProfileUrl || record.linkedinUrl || record.linkedInUrl, 500),
      featured_in_event_detail_page: target.showConfig?.featuredInEventDetailPage === true,
      visible_in_event_detail_page: target.showConfig?.visibleInEventDetailPage !== false,
      featured_in_lobby: target.showConfig?.featuredInLobby === true,
      visible_in_lobby: target.showConfig?.visibleInLobby !== false
    })
  }).catch(async (error) => {
    if (error?.zoomBody?.code === "1003" || /already been used/i.test(error?.message || "")) {
      const speaker = await findSpeakerByEmail(env, target);
      if (speaker?.speaker_id) return speaker;
    }
    throw error;
  });
  return {
    speakerId: cleanString(body.speaker_id, 240),
    created: true
  };
}

async function sessionForTarget(env, target = {}) {
  const sessions = await listZoomEventsPages(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/sessions`, "sessions");
  return sessions.find((session) => cleanString(session.session_id || session.id) === target.sessionId) || {};
}

async function ensureSessionParticipant(env, target = {}, speakerId = "") {
  const session = await sessionForTarget(env, target).catch(() => ({}));
  const panelists = new Set(
    [
      ...(Array.isArray(session.panelist) ? session.panelist : []),
      ...(Array.isArray(session.panelists) ? session.panelists.map((entry) => entry?.email || entry) : [])
    ]
      .map((entry) => cleanString(entry).toLowerCase())
      .filter(Boolean)
  );
  if (target.kind === "speaker-panelist") panelists.add(target.email);

  const alternativeHosts = new Set(
    [
      ...(Array.isArray(session.alternative_host) ? session.alternative_host : []),
      ...(Array.isArray(session.alternative_hosts) ? session.alternative_hosts.map((entry) => entry?.email || entry) : [])
    ]
      .map((entry) => cleanString(entry).toLowerCase())
      .filter(Boolean)
  );
  if (target.kind === "staff" && ["alternative-host", "co-host", "cohost", "host"].includes(target.staffZoomRole)) {
    alternativeHosts.add(target.email);
  }

  const sessionSpeakers = Array.isArray(session.session_speakers) ? session.session_speakers : [];
  const speakerIds = new Set(sessionSpeakers.map((entry) => cleanString(entry?.speaker_id)).filter(Boolean));
  const nextSessionSpeakers = [...sessionSpeakers];
  if (speakerId && !speakerIds.has(speakerId)) {
    nextSessionSpeakers.push({
      speaker_id: speakerId,
      access_to_edit_session: target.showConfig?.speakerCanEditSession === true,
      show_in_session_detail: target.showConfig?.showSpeakerInSessionDetail !== false,
      has_alternative_host_permission: target.showConfig?.speakerAlternativeHost === true
    });
  }

  await zoomEventsRequest(env, `/zoom_events/events/${encodeURIComponent(target.zoomEventId)}/sessions/${encodeURIComponent(target.sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(panelists.size ? { panelist: [...panelists] } : {}),
      ...(alternativeHosts.size ? { alternative_host: [...alternativeHosts] } : {}),
      ...(nextSessionSpeakers.length ? { session_speakers: nextSessionSpeakers } : {})
    })
  });
}

export async function syncZoomEventsRegistrationRecord(env, type = "guest", record = {}, options = {}) {
  const force = options.force === true;
  const config = await readZoomEventsCrmConfig(env);
  const target = targetForRegistration(record, type, config);
  const fingerprint = zoomEventsRegistrationFingerprint(record, type);
  const previous = record.zoomEventsSync && typeof record.zoomEventsSync === "object" ? record.zoomEventsSync : {};
  const credentials = zoomEventsCredentials(env);
  const missing = assertTargetReady(target, credentials, config);

  if (!force && previous.status === "synced" && previous.fingerprint === fingerprint) {
    const state = skippedState(record, target);
    const nextState = { ...state, fingerprint };
    return { record: recordWithZoomEventsState(record, nextState), result: nextState };
  }

  if (missing.length) {
    const state = pendingState(record, target, "Zoom Events sync is waiting for credentials or event mapping.", { missing });
    const nextState = { ...state, fingerprint };
    return { record: recordWithZoomEventsState(record, nextState), result: nextState };
  }

  try {
    let details = {};
    if (target.kind === "staff") {
      await ensureSessionParticipant(env, target, "");
    } else {
      details = await ensureTicket(env, record, target, config);
      if (target.kind === "speaker-panelist") {
        const speaker = await ensureSpeaker(env, record, target);
        await ensureSessionParticipant(env, target, speaker.speakerId);
        details = { ...details, speakerId: speaker.speakerId };
      }
    }
    const state = successState(record, target, details);
    const nextState = { ...state, fingerprint };
    return { record: recordWithZoomEventsState(record, nextState), result: nextState };
  } catch (error) {
    const state = failedState(record, target, error);
    const nextState = { ...state, fingerprint };
    return { record: recordWithZoomEventsState(record, nextState), result: nextState };
  }
}

export function staleZoomEventsSync(record = {}, reason = "crm_changed") {
  const previous = record.zoomEventsSync && typeof record.zoomEventsSync === "object" ? record.zoomEventsSync : {};
  if (!previous.status) return record;
  return {
    ...record,
    zoomEventsSync: {
      ...previous,
      status: "stale",
      synced: false,
      staleReason: cleanString(reason, 120),
      staleAt: new Date().toISOString()
    }
  };
}

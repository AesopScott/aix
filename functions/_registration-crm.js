const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const acceptedPhoneStatuses = new Set(["verified", "pending_sms_setup"]);
const blockedEmailDomains = new Set(["gmail.com", "googlemail.com"]);

const registrationConfig = {
  member: {
    label: "member",
    crmType: "member-registrant",
    source: "member-registration",
    legacyPrefix: "member-registration:",
    crmPrefix: "crm:member-registrant:",
    strictEnv: "MOJO_MEMBER_INVITE_CODES_STRICT"
  },
  guest: {
    label: "guest",
    crmType: "guest-registrant",
    source: "guest-registration",
    legacyPrefix: "guest-registration:",
    crmPrefix: "crm:guest-registrant:",
    strictEnv: "MOJO_GUEST_INVITE_CODES_STRICT"
  },
  partner: {
    label: "partner",
    crmType: "partner-registrant",
    source: "partner-registration",
    legacyPrefix: "partner-registration:",
    crmPrefix: "crm:partner-registrant:",
    strictEnv: "MOJO_PARTNER_INVITE_CODES_STRICT",
    strict: true
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

function cleanString(value) {
  return typeof value === "string"
    ? value.trim().slice(0, maxFieldLength)
    : "";
}

function cleanBoolean(value) {
  return value === true || value === "true";
}

function cleanGuestRegistrationType(value) {
  return {
    "featured-guest": "featured-guest",
    presenter: "presenter",
    roundtable: "roundtable-leader",
    "roundtable-leader": "roundtable-leader",
    guest: "guest"
  }[cleanString(value).toLowerCase()] || "guest";
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function registrationRoleLabel(type) {
  const labels = {
    member: "Member",
    guest: "Guest",
    partner: "Partner"
  };
  return labels[type] || cleanString(type) || "Registrant";
}

function registrationRoles(type, registration = {}) {
  const guestRegistrationType = cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole);
  const roles = [];
  if (type === "guest") {
    if (cleanBoolean(registration.isPresenter) || guestRegistrationType === "presenter") roles.push("Presenter");
    if (cleanBoolean(registration.isRoundtableLeader) || guestRegistrationType === "roundtable-leader") roles.push("Round Table Leader");
    if (cleanBoolean(registration.isFeaturedGuest) || guestRegistrationType === "featured-guest") roles.push("Featured Guest");
    if (!roles.length) roles.push("Guest");
  } else {
    roles.push(registrationRoleLabel(type));
  }
  if (cleanBoolean(registration.isFeaturedMember)) roles.push("Featured Member");
  return [...new Set(roles.filter(Boolean))];
}

function eventIdentity(registration = {}) {
  return cleanString(
    registration.eventId ||
      registration.eventSlug ||
      registration.eventName ||
      registration.inviteCode ||
      registration.id ||
      registration.createdAt
  );
}

function contactEventEntry(type, registration = {}, previous = {}, now = "") {
  const roles = registrationRoles(type, registration);
  const eventId = eventIdentity(registration);
  return {
    ...previous,
    id: eventId,
    eventId,
    eventSlug: cleanString(registration.eventSlug),
    eventName: cleanString(registration.eventName) || eventId || "Registration",
    eventDate: cleanString(registration.eventDate),
    inviteCode: cleanString(registration.inviteCode),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.guestRegistrationType),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(type),
    role: roles.join(", "),
    roles,
    registeredAt: cleanString(registration.createdAt) || now,
    attended: typeof previous.attended === "boolean" ? previous.attended : false,
    attendanceStatus: cleanString(previous.attendanceStatus) || "not_recorded",
    attendedAt: cleanString(previous.attendedAt),
    attendanceNotes: cleanString(previous.attendanceNotes),
    updatedAt: now
  };
}

function contactEventKey(event = {}) {
  return cleanString(event.registrationId || event.eventId || event.eventSlug || event.eventName || event.inviteCode || event.registeredAt)
    .toLowerCase();
}

function mergeContactEvents(existingEvents, type, registration, now) {
  const map = new Map();
  for (const event of Array.isArray(existingEvents) ? existingEvents : []) {
    const key = contactEventKey(event);
    if (key) map.set(key, event);
  }

  const next = contactEventEntry(type, registration, {}, now);
  const key = contactEventKey(next);
  const previous = key ? map.get(key) || {} : {};
  if (key) map.set(key, contactEventEntry(type, registration, previous, now));

  return [...map.values()].sort((a, b) => {
    const left = cleanString(b.eventDate || b.registeredAt || b.updatedAt);
    const right = cleanString(a.eventDate || a.registeredAt || a.updatedAt);
    return left.localeCompare(right);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBlockedEmail(email) {
  const domain = email.toLowerCase().split("@").pop();
  return blockedEmailDomains.has(domain);
}

function cleanPayload(payload, type = "") {
  return {
    inviteCode: cleanString(payload?.inviteCode),
    name: cleanString(payload?.name),
    company: cleanString(payload?.company),
    title: cleanString(payload?.title),
    industry: cleanString(payload?.industry),
    email: cleanString(payload?.email).toLowerCase(),
    phone: cleanString(payload?.phone),
    phoneVerificationStatus: cleanString(payload?.phoneVerificationStatus),
    publicationUseName: cleanBoolean(payload?.publicationUseName),
    publicationUseCompany: cleanBoolean(payload?.publicationUseCompany)
  };
}

async function writeRegistrationDebug(env, type, status, details = {}) {
  if (!env?.MOJO_SUMMITS_SETUP_STATE) return;
  const createdAt = cleanString(details.createdAt) || new Date().toISOString();
  const id = cleanString(details.id) || crypto.randomUUID();
  const entry = {
    id,
    createdAt,
    type: cleanString(type),
    status: cleanString(status),
    stage: cleanString(details.stage),
    name: cleanString(details.name),
    email: cleanString(details.email).toLowerCase(),
    company: cleanString(details.company),
    inviteCode: cleanString(details.inviteCode),
    eventName: cleanString(details.eventName),
    eventDate: cleanString(details.eventDate),
    contactKey: cleanString(details.contactKey),
    registrationKeys: Array.isArray(details.registrationKeys)
      ? details.registrationKeys.map(cleanString).filter(Boolean)
      : [],
    error: cleanString(details.error)
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(
    `crm:registration-debug:${createdAt}:${id}`,
    JSON.stringify(entry)
  ).catch(() => null);
}

function inviteMeta(inviteRecord) {
  const record = inviteRecord?.record || {};
  return {
    eventId: cleanString(record.eventId || record.eventSlug || record.eventName),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    intendedGuestName: cleanString(record.intendedGuestName || record.invitedName || record.guestName),
    invitedName: cleanString(record.invitedName || record.intendedGuestName || record.guestName),
    guestName: cleanString(record.guestName || record.intendedGuestName || record.invitedName),
    guestRegistrationType: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole),
    registrationRole: cleanGuestRegistrationType(record.registrationRole || record.guestRegistrationType),
    isPresenter: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "presenter",
    isRoundtableLeader: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "roundtable-leader",
    isFeaturedGuest: cleanGuestRegistrationType(record.guestRegistrationType || record.registrationRole) === "featured-guest",
    partnerCompany: cleanString(record.partnerCompany),
    partnerContactEmail: cleanString(record.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(record.partnerTier)
  };
}

function validateRegistration(registration, type = "") {
  if (!/^\d{6}$/.test(registration.inviteCode)) return "Enter a valid six-digit invite code.";
  if (!registration.name) return "Name is required.";
  if (!registration.company) return "Company is required.";
  if (!registration.title) return "Title is required.";
  if (!registration.industry) return "Industry is required.";
  if (!registration.email) return "Company email is required.";
  if (!isValidEmail(registration.email)) return "Enter a valid email address.";
  if (isBlockedEmail(registration.email)) return "Gmail and Googlemail addresses are not accepted.";
  if (!registration.phone) return "Phone number is required.";
  if (!acceptedPhoneStatuses.has(registration.phoneVerificationStatus)) {
    return "Phone verification status is required.";
  }
  return "";
}

function normalizeRegistrationForType(type, registration) {
  if (
    type === "guest" &&
    (!registration.phoneVerificationStatus ||
      registration.phoneVerificationStatus === "unverified" ||
      registration.phoneVerificationStatus === "code_sent")
  ) {
    return {
      ...registration,
      phoneVerificationStatus: "pending_sms_setup"
    };
  }
  return registration;
}

function codeKeys(type, code) {
  return [
    `${type}-invite-code:${code}`,
    `crm:${type}-invite-code:${code}`,
    `${type}-invite:${code}`
  ];
}

async function readInviteCode(env, type, code) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) return null;

  for (const key of codeKeys(type, code)) {
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (record) return { key, record };
  }

  return null;
}

function inviteCodeError(config, inviteRecord) {
  if (!inviteRecord) return "";
  const record = inviteRecord.record || {};
  const status = cleanString(record.status).toLowerCase();
  const expiresAt = cleanString(record.expiresAt);

  if (["used", "revoked", "expired", "disabled"].includes(status)) {
    return "That invite code is invalid or has already been used.";
  }
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return "That invite code has expired.";
  }
  if (record.type && cleanString(record.type).toLowerCase() !== config.label) {
    return "That invite code is not valid for this registration page.";
  }

  return "";
}

export async function validateInviteCode(env, type, code) {
  const config = registrationConfig[type];
  const inviteCode = cleanString(code).replace(/\D/g, "").slice(0, 6);
  if (!config || !/^\d{6}$/.test(inviteCode)) {
    return { ok: false, status: 400, error: "Enter a valid six-digit invite code." };
  }

  const inviteRecord = await readInviteCode(env, type, inviteCode);
  const error = inviteCodeError(config, inviteRecord);
  if (error) return { ok: false, status: 409, error };

  const strict = config.strict === true || env[config.strictEnv] === "true";
  if (strict && !inviteRecord) {
    return { ok: false, status: 404, error: "That invite code is invalid or has already been used." };
  }

  return {
    ok: true,
    code: inviteCode,
    mode: inviteRecord ? "stored" : "format-only",
    invite: inviteMeta(inviteRecord)
  };
}

async function markInviteCodeUsed(env, type, code, registration) {
  const inviteRecord = await readInviteCode(env, type, code);
  if (!inviteRecord) return;

  await env.MOJO_SUMMITS_SETUP_STATE.put(
    inviteRecord.key,
    JSON.stringify({
      ...inviteRecord.record,
      type,
      code,
      status: "used",
      usedAt: registration.createdAt,
      usedBy: registration.name || registration.email,
      usedByName: registration.name,
      usedByEmail: registration.email,
      registrationId: registration.id
    })
  );
}

export async function upsertRegistrationContact(env, type, registration, config = {}) {
  const email = cleanString(registration.email).toLowerCase();
  const company = cleanString(registration.partnerCompany || registration.company);
  const companySlug = slugify(company);
  if (!email || !company || !companySlug) return {};

  const now = registration.createdAt || new Date().toISOString();
  const companyKey = `crm:company:${companySlug}`;
  const partnerCompanyKey = `partner-company:${companySlug}`;
  const updatedBy = cleanString(config.updatedBy) || "registration";
  const contact = {
    id: email,
    email,
    name: cleanString(registration.name) || email,
    invitedName: cleanString(registration.invitedName || registration.intendedGuestName || registration.guestName),
    intendedGuestName: cleanString(registration.intendedGuestName || registration.invitedName || registration.guestName),
    guestRegistrationType: cleanGuestRegistrationType(registration.guestRegistrationType || registration.registrationRole),
    registrationRole: cleanGuestRegistrationType(registration.registrationRole || registration.guestRegistrationType),
    company,
    companySlug,
    companyKey,
    profileKey: type === "partner" ? partnerCompanyKey : companyKey,
    title: cleanString(registration.title),
    phone: cleanString(registration.phone),
    registrationId: cleanString(registration.id),
    registrationType: cleanString(config.label || type),
    source: cleanString(config.source || registration.source || `${type}-registration`),
    updatedAt: now,
    updatedBy
  };
  const contactKeys = [`crm:contact:${email}`];
  const companyKeys = [
    companyKey,
    `${type}-company:${companySlug}`
  ];

  if (type === "partner") {
    companyKeys.push(partnerCompanyKey);
  }

  for (const key of [...new Set(contactKeys)]) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
      ...(existing || {}),
      ...contact,
      id: email,
      name: contact.name || cleanString(existing?.name) || email,
      source: cleanString(existing?.source) || contact.source,
      createdAt: cleanString(existing?.createdAt) || now,
      events: mergeContactEvents(existing?.events, type, registration, now)
    }));
  }

  for (const key of [...new Set(companyKeys)]) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    const contacts = Array.isArray(existing?.contacts) ? existing.contacts : [];
    const contactMap = new Map(contacts.map((entry) => [
      cleanString(entry?.email).toLowerCase() || cleanString(entry?.name),
      entry
    ]));
    const previous = contactMap.get(email) || {};
    contactMap.set(email, {
      ...previous,
      ...contact,
      source: cleanString(previous.source) || contact.source
    });

    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify({
      ...(existing || {}),
      organizationName: cleanString(existing?.organizationName || existing?.company || company),
      company,
      companySlug,
      contacts: [...contactMap.values()],
      updatedAt: now,
      updatedBy
    }));
  }

  return {
    contactId: email,
    contactKey: `crm:contact:${email}`,
    companyKey: `crm:company:${companySlug}`,
    profileKey: type === "partner" ? partnerCompanyKey : `crm:company:${companySlug}`
  };
}

export async function handleInviteCodeValidation({ params, env }, type) {
  const result = await validateInviteCode(env, type, params?.code);
  if (!result.ok) return json({ error: result.error }, { status: result.status });

  return json({
    ok: true,
    code: result.code,
    mode: result.mode,
    invite: result.invite
  });
}

export async function handlePublicRegistration({ request, env }, type) {
  const config = registrationConfig[type];
  if (!config) return json({ error: "Registration type is not configured." }, { status: 500 });
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Registration storage is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const registration = normalizeRegistrationForType(type, cleanPayload(payload, type));
  const debugBase = {
    stage: "received",
    name: registration.name,
    email: registration.email,
    company: registration.company,
    inviteCode: registration.inviteCode
  };

  try {
    const validationError = validateRegistration(registration, type);
    if (validationError) {
      await writeRegistrationDebug(env, type, "rejected", {
        ...debugBase,
        stage: "validation",
        error: validationError
      });
      return json({ error: validationError }, { status: 400 });
    }

    const inviteValidation = await validateInviteCode(env, type, registration.inviteCode);
    if (!inviteValidation.ok) {
      await writeRegistrationDebug(env, type, "rejected", {
        ...debugBase,
        stage: "invite-validation",
        error: inviteValidation.error
      });
      return json({ error: inviteValidation.error }, { status: inviteValidation.status });
    }

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const record = {
      ...registration,
      ...(inviteValidation.invite || {}),
      id,
      createdAt,
      source: config.source,
      crmType: config.crmType,
      crmStatus: "new",
      crmNotes: "",
      crmUpdatedAt: "",
      crmUpdatedBy: ""
    };
    const contactRefs = await upsertRegistrationContact(env, type, record, config);
    const storedRecord = {
      ...record,
      ...contactRefs
    };
    const registrationKeys = [
      `${config.legacyPrefix}${createdAt}:${id}`,
      `${config.crmPrefix}${createdAt}:${id}`
    ];

    await env.MOJO_SUMMITS_SETUP_STATE.put(registrationKeys[0], JSON.stringify(storedRecord));
    await env.MOJO_SUMMITS_SETUP_STATE.put(registrationKeys[1], JSON.stringify(storedRecord));
    await markInviteCodeUsed(env, type, registration.inviteCode, storedRecord);
    await writeRegistrationDebug(env, type, "stored", {
      ...debugBase,
      ...storedRecord,
      stage: "complete",
      registrationKeys
    });

    return json({
      ok: true,
      id,
      createdAt
    }, { status: 201 });
  } catch (error) {
    await writeRegistrationDebug(env, type, "failed", {
      ...debugBase,
      stage: "exception",
      error: error.message || "Registration could not be stored."
    });
    return json({ error: error.message || "Registration could not be stored." }, { status: 500 });
  }
}

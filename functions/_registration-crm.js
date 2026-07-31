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

function cleanPhone(value) {
  return cleanString(value).replace(/[^\d+]/g, "");
}

function cleanBoolean(value) {
  return value === true || value === "true";
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean).slice(0, 12)
    : [];
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBlockedEmail(email) {
  const domain = email.toLowerCase().split("@").pop();
  return blockedEmailDomains.has(domain);
}

function isLikelyPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function cleanPayload(payload) {
  return {
    inviteCode: cleanString(payload?.inviteCode),
    name: cleanString(payload?.name),
    company: cleanString(payload?.company),
    title: cleanString(payload?.title),
    industry: cleanString(payload?.industry),
    email: cleanString(payload?.email).toLowerCase(),
    phone: cleanPhone(payload?.phone),
    phoneVerificationStatus: cleanString(payload?.phoneVerificationStatus),
    isPresenter: cleanBoolean(payload?.isPresenter),
    isRoundtableLeader: cleanBoolean(payload?.isRoundtableLeader),
    publicationUseName: cleanBoolean(payload?.publicationUseName),
    publicationUseCompany: cleanBoolean(payload?.publicationUseCompany),
    foodPreferences: cleanArray(payload?.foodPreferences),
    foodNotes: cleanString(payload?.foodNotes)
  };
}

function inviteMeta(inviteRecord) {
  const record = inviteRecord?.record || {};
  return {
    eventId: cleanString(record.eventId || record.eventSlug || record.eventName),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    partnerCompany: cleanString(record.partnerCompany),
    partnerContactEmail: cleanString(record.partnerContactEmail).toLowerCase(),
    partnerTier: cleanString(record.partnerTier)
  };
}

function validateRegistration(registration) {
  if (!/^\d{6}$/.test(registration.inviteCode)) return "Enter a valid six-digit invite code.";
  if (!registration.name) return "Name is required.";
  if (!registration.company) return "Company is required.";
  if (!registration.title) return "Title is required.";
  if (!registration.industry) return "Industry is required.";
  if (!registration.email) return "Company email is required.";
  if (!isValidEmail(registration.email)) return "Enter a valid email address.";
  if (isBlockedEmail(registration.email)) return "Gmail and Googlemail addresses are not accepted.";
  if (!isLikelyPhone(registration.phone)) return "Enter a valid mobile phone number.";
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
  const registration = normalizeRegistrationForType(type, cleanPayload(payload));
  const validationError = validateRegistration(registration);
  if (validationError) return json({ error: validationError }, { status: 400 });

  const inviteValidation = await validateInviteCode(env, type, registration.inviteCode);
  if (!inviteValidation.ok) {
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

  await env.MOJO_SUMMITS_SETUP_STATE.put(`${config.legacyPrefix}${createdAt}:${id}`, JSON.stringify(record));
  await env.MOJO_SUMMITS_SETUP_STATE.put(`${config.crmPrefix}${createdAt}:${id}`, JSON.stringify(record));
  await markInviteCodeUsed(env, type, registration.inviteCode, record);

  return json({
    ok: true,
    id,
    createdAt
  }, { status: 201 });
}

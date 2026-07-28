const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 2000;
const acceptedPhoneStatuses = new Set(["verified", "pending_sms_setup"]);

function json(data, init = {}) {
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
  return domain === "gmail.com" || domain === "googlemail.com";
}

function isLikelyPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function cleanPayload(payload) {
  return {
    inviteCode: cleanString(payload?.inviteCode),
    name: cleanString(payload?.name),
    email: cleanString(payload?.email).toLowerCase(),
    phone: cleanPhone(payload?.phone),
    phoneVerificationStatus: cleanString(payload?.phoneVerificationStatus),
    isPresenter: cleanBoolean(payload?.isPresenter),
    isRoundtableLeader: cleanBoolean(payload?.isRoundtableLeader),
    foodPreferences: cleanArray(payload?.foodPreferences),
    foodNotes: cleanString(payload?.foodNotes)
  };
}

function validateRegistration(registration) {
  if (!/^\d{6}$/.test(registration.inviteCode)) return "Enter a valid six-digit invite code.";
  if (!registration.name) return "Name is required.";
  if (!registration.email) return "Company email is required.";
  if (!isValidEmail(registration.email)) return "Enter a valid email address.";
  if (isBlockedEmail(registration.email)) return "Gmail and Googlemail addresses are not accepted.";
  if (!isLikelyPhone(registration.phone)) return "Enter a valid mobile phone number.";
  if (!acceptedPhoneStatuses.has(registration.phoneVerificationStatus)) {
    return "Phone verification status is required.";
  }
  return "";
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const registration = cleanPayload(payload);
  const error = validateRegistration(registration);

  if (error) return json({ error }, { status: 400 });

  const crmUrl = new URL("/crm/api/public/guest-registration", request.url);
  const response = await fetch(crmUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(registration)
  });
  const data = await response.json().catch(() => ({}));
  return json(data, { status: response.status });
}

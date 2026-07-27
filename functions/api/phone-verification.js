const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 200;

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

function isLikelyPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const action = cleanString(payload?.action);
  const phone = cleanPhone(payload?.phone);

  if (!isLikelyPhone(phone)) {
    return json({ error: "Enter a valid mobile phone number." }, { status: 400 });
  }

  if (action === "start") {
    if (env.SMS_PROVIDER_CONFIGURED !== "true") {
      return json({
        ok: true,
        requiresCode: false,
        status: "pending_sms_setup",
        message: "SMS verification is not configured yet. This phone will be saved for manual confirmation."
      });
    }

    return json({
      error: "SMS provider credentials are enabled, but no provider adapter has been implemented yet."
    }, { status: 501 });
  }

  if (action === "confirm") {
    if (env.SMS_PROVIDER_CONFIGURED !== "true") {
      return json({ error: "SMS code confirmation is not available until an SMS provider is configured." }, { status: 409 });
    }

    return json({
      error: "SMS provider credentials are enabled, but no provider adapter has been implemented yet."
    }, { status: 501 });
  }

  return json({ error: "Unknown phone verification action." }, { status: 400 });
}

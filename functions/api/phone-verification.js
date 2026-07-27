const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 200;
const otpTtlSeconds = 10 * 60;
const resendCooldownSeconds = 60;
const maxAttempts = 5;
const encoder = new TextEncoder();

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

function cleanEnvString(value) {
  return typeof value === "string"
    ? value.trim().slice(0, 4096)
    : "";
}

function cleanPhone(value) {
  return cleanString(value).replace(/[^\d+]/g, "");
}

function isLikelyPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isSmsConfigured(env) {
  return env.SMS_PROVIDER_CONFIGURED === "true" || env.SMS_PROVIDER === "aws-sns";
}

function awsConfig(env) {
  return {
    region: cleanEnvString(env.AWS_REGION || env.AWS_SNS_REGION || "us-east-1"),
    accessKeyId: cleanEnvString(env.AWS_ACCESS_KEY_ID),
    secretAccessKey: cleanEnvString(env.AWS_SECRET_ACCESS_KEY),
    sessionToken: cleanEnvString(env.AWS_SESSION_TOKEN),
    originationNumber: cleanString(env.AWS_SNS_SMS_ORIGINATION_NUMBER || env.AWS_MM_SMS_ORIGINATION_NUMBER),
    senderId: cleanString(env.AWS_SNS_SMS_SENDER_ID),
    otpSecret: cleanEnvString(env.PHONE_VERIFICATION_SECRET)
  };
}

function missingAwsConfig(config, env) {
  const missing = [];
  if (!env.MOJO_SUMMITS_SETUP_STATE) missing.push("MOJO_SUMMITS_SETUP_STATE");
  if (!config.region) missing.push("AWS_REGION");
  if (!config.accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!config.otpSecret) missing.push("PHONE_VERIFICATION_SECRET");
  return missing;
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function hmacBytes(key, value) {
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
}

async function hmacHex(key, value) {
  return toHex(await hmacBytes(key, value));
}

async function awsSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = await hmacBytes(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  return hmacBytes(kService, "aws4_request");
}

function utcStamp(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8)
  };
}

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1000000).padStart(6, "0");
}

async function codeHash(secret, phone, code, salt) {
  return hmacHex(secret, `${phone}:${code}:${salt}`);
}

function verificationKey(phone) {
  return `phone-verification:${phone}`;
}

function parseXmlTag(xml, tag) {
  const match = String(xml || "").match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
  return match ? match[1] : "";
}

async function signedAwsPost({ region, accessKeyId, secretAccessKey, sessionToken }, service, body) {
  const host = `${service}.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const { amzDate, dateStamp } = utcStamp();
  const headers = {
    "content-type": "application/x-www-form-urlencoded; charset=utf-8",
    host,
    "x-amz-date": amzDate
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const payloadHash = await sha256Hex(body);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await awsSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      authorization
    },
    body
  });
  const text = await response.text();

  if (!response.ok) {
    const message = parseXmlTag(text, "Message") || parseXmlTag(text, "Code") || "AWS SNS rejected the SMS request.";
    throw new Error(message);
  }

  return text;
}

async function publishSms(config, phone, message) {
  const params = new URLSearchParams();
  params.set("Action", "Publish");
  params.set("Version", "2010-03-31");
  params.set("PhoneNumber", phone);
  params.set("Message", message);
  let attributeIndex = 1;
  function addMessageAttribute(name, value) {
    params.set(`MessageAttributes.entry.${attributeIndex}.Name`, name);
    params.set(`MessageAttributes.entry.${attributeIndex}.Value.DataType`, "String");
    params.set(`MessageAttributes.entry.${attributeIndex}.Value.StringValue`, value);
    attributeIndex += 1;
  }

  addMessageAttribute("AWS.SNS.SMS.SMSType", "Transactional");

  if (config.originationNumber) {
    addMessageAttribute("AWS.MM.SMS.OriginationNumber", config.originationNumber);
  }

  if (config.senderId) {
    addMessageAttribute("AWS.SNS.SMS.SenderID", config.senderId);
  }

  const xml = await signedAwsPost(config, "sns", params.toString());
  return parseXmlTag(xml, "MessageId");
}

async function startVerification(phone, inviteCode, env) {
  const config = awsConfig(env);
  const missing = missingAwsConfig(config, env);
  if (missing.length) {
    return json(
      { error: `AWS SMS verification is missing configuration: ${missing.join(", ")}.` },
      { status: 500 }
    );
  }

  const key = verificationKey(phone);
  const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
  const now = Date.now();
  if (existing?.sentAt && now - Date.parse(existing.sentAt) < resendCooldownSeconds * 1000) {
    return json(
      { error: "A verification code was just sent. Wait a minute before requesting another one." },
      { status: 429 }
    );
  }

  const code = randomCode();
  const salt = crypto.randomUUID();
  const message = `MOJO AI Summits: Your verification code is ${code}. It expires in 10 minutes. Reply STOP to opt out or HELP for help.`;
  const messageId = await publishSms(config, phone, message);
  const sentAt = new Date().toISOString();
  const expiresAt = new Date(now + otpTtlSeconds * 1000).toISOString();

  await env.MOJO_SUMMITS_SETUP_STATE.put(
    key,
    JSON.stringify({
      phone,
      inviteCode: cleanString(inviteCode),
      codeHash: await codeHash(config.otpSecret, phone, code, salt),
      salt,
      sentAt,
      expiresAt,
      attempts: 0,
      provider: "aws-sns",
      messageId
    }),
    { expirationTtl: otpTtlSeconds }
  );

  return json({
    ok: true,
    requiresCode: true,
    status: "code_sent",
    expiresAt,
    message: "Code sent. Enter the SMS code to confirm this phone number."
  });
}

async function confirmVerification(phone, code, env) {
  const config = awsConfig(env);
  const missing = missingAwsConfig(config, env);
  if (missing.length) {
    return json(
      { error: `AWS SMS verification is missing configuration: ${missing.join(", ")}.` },
      { status: 500 }
    );
  }

  const key = verificationKey(phone);
  const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
  if (!record) return json({ error: "Verification code expired. Request a new code." }, { status: 400 });
  if (Date.parse(record.expiresAt) < Date.now()) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
    return json({ error: "Verification code expired. Request a new code." }, { status: 400 });
  }
  if ((record.attempts || 0) >= maxAttempts) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
    return json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  const cleanCode = cleanString(code);
  if (!/^\d{6}$/.test(cleanCode)) {
    return json({ error: "Enter the six-digit SMS code." }, { status: 400 });
  }

  const submittedHash = await codeHash(config.otpSecret, phone, cleanCode, record.salt);
  if (submittedHash !== record.codeHash) {
    const attempts = (record.attempts || 0) + 1;
    await env.MOJO_SUMMITS_SETUP_STATE.put(
      key,
      JSON.stringify({ ...record, attempts }),
      { expirationTtl: Math.max(60, Math.ceil((Date.parse(record.expiresAt) - Date.now()) / 1000)) }
    );
    return json({ error: "That code did not match. Try again." }, { status: 400 });
  }

  await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
  return json({
    ok: true,
    status: "verified",
    message: "Phone verified."
  });
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
    if (!isSmsConfigured(env)) {
      return json({
        ok: true,
        requiresCode: false,
        status: "pending_sms_setup",
        message: "SMS verification is not configured yet. This phone will be saved for manual confirmation."
      });
    }

    return startVerification(phone, payload?.inviteCode, env);
  }

  if (action === "confirm") {
    if (!isSmsConfigured(env)) {
      return json({ error: "SMS code confirmation is not available until an SMS provider is configured." }, { status: 409 });
    }

    return confirmVerification(phone, payload?.code, env);
  }

  return json({ error: "Unknown phone verification action." }, { status: 400 });
}

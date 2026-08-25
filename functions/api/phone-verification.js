const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const maxFieldLength = 200;
const otpTtlSeconds = 10 * 60;
const resendCooldownSeconds = 60;
const maxAttempts = 5;
const encoder = new TextEncoder();
const phoneDebugPrefix = "crm:phone-verification-debug";
const verifiedPhonePrefix = "sms:verified-phone:";
const verifiedPhoneObjectPrefix = "sms/verified-phones";

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
  const normalized = cleanString(value).replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "";
  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 4) return `+${digits.slice(2)}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return normalized;
}

function isLikelyPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function isSmsConfigured(env) {
  const config = awsConfig(env);
  return (
    env.SMS_PROVIDER_CONFIGURED === "true" ||
    env.SMS_PROVIDER === "aws-sns" ||
    (config.accessKeyId && config.secretAccessKey && config.otpSecret)
  );
}

function awsConfig(env) {
  return {
    region: cleanEnvString(env.AWS_REGION || env.AWS_SNS_REGION || "us-east-2"),
    accessKeyId: cleanEnvString(env.AWS_ACCESS_KEY_ID || env.AWS_Client_Access_key || env.AWS_CLIENT_ACCESS_KEY),
    secretAccessKey: cleanEnvString(env.AWS_SECRET_ACCESS_KEY || env.AWS_Client_Secret_Access_key || env.AWS_CLIENT_SECRET_ACCESS_KEY),
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

function verifiedPhoneKey(phone) {
  return `${verifiedPhonePrefix}${phone.replace(/\D/g, "")}`;
}

function verifiedPhoneObjectKey(phone) {
  return `${verifiedPhoneObjectPrefix}/${phone.replace(/\D/g, "")}.json`;
}

function maskPhone(phone) {
  const digits = cleanString(phone).replace(/\D/g, "");
  if (!digits) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function sanitizeError(error) {
  return cleanString(error?.message || error || "")
    .replace(/AKIA[0-9A-Z]{16}/g, "[aws-access-key]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
}

function configDebug(config = {}, env = {}) {
  return {
    region: cleanString(config.region),
    hasAccessKeyId: Boolean(config.accessKeyId),
    hasSecretAccessKey: Boolean(config.secretAccessKey),
    hasSessionToken: Boolean(config.sessionToken),
    hasOriginationNumber: Boolean(config.originationNumber),
    hasSenderId: Boolean(config.senderId),
    hasOtpSecret: Boolean(config.otpSecret),
    smsProvider: cleanString(env.SMS_PROVIDER),
    smsProviderConfigured: cleanString(env.SMS_PROVIDER_CONFIGURED),
    hasKvBinding: Boolean(env.MOJO_SUMMITS_SETUP_STATE)
  };
}

async function writePhoneDebug(env, stage, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    stage: cleanString(stage),
    action: cleanString(details.action),
    phone: maskPhone(details.phone),
    inviteCode: cleanString(details.inviteCode).replace(/\D/g, "").slice(0, 6),
    status: cleanString(details.status),
    provider: cleanString(details.provider),
    sendPath: cleanString(details.sendPath),
    messageId: cleanString(details.messageId),
    error: sanitizeError(details.error),
    config: details.config && typeof details.config === "object" ? details.config : undefined
  };

  console.log("phone-verification", JSON.stringify(entry));

  if (!env?.MOJO_SUMMITS_SETUP_STATE) return;
  await env.MOJO_SUMMITS_SETUP_STATE.put(
    `${phoneDebugPrefix}:${entry.createdAt}:${entry.id}`,
    JSON.stringify(entry),
    { expirationTtl: 7 * 24 * 60 * 60 }
  ).catch(() => null);
}

function parseXmlTag(xml, tag) {
  const match = String(xml || "").match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
  return match ? match[1] : "";
}

function parseAwsErrorMessage(text) {
  try {
    const data = JSON.parse(text);
    return data.message || data.Message || data.__type || "";
  } catch {
    return parseXmlTag(text, "Message") || parseXmlTag(text, "Code") || "";
  }
}

async function signedAwsPost({ region, accessKeyId, secretAccessKey, sessionToken }, service, body, extraHeaders = {}) {
  const host = `${service}.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const { amzDate, dateStamp } = utcStamp();
  const headers = {
    ...extraHeaders,
    "content-type": extraHeaders["content-type"] || "application/x-www-form-urlencoded; charset=utf-8",
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
    const message = parseAwsErrorMessage(text) || "AWS rejected the SMS request.";
    throw new Error(message);
  }

  return text;
}

async function signedAwsJsonPost(config, service, target, payload) {
  const text = await signedAwsPost(
    config,
    service,
    JSON.stringify(payload),
    {
      "content-type": "application/x-amz-json-1.0",
      "x-amz-target": target
    }
  );
  return JSON.parse(text);
}

async function sendSmsViaSmsVoiceV2(config, phone, message) {
  const payload = {
    DestinationPhoneNumber: phone,
    MessageBody: message,
    MessageType: "TRANSACTIONAL",
    TimeToLive: otpTtlSeconds
  };

  if (config.originationNumber) {
    payload.OriginationIdentity = config.originationNumber;
  }

  const result = await signedAwsJsonPost(
    config,
    "sms-voice",
    "PinpointSMSVoiceV2.SendTextMessage",
    payload
  );
  return result.MessageId || "";
}

async function publishSmsViaSns(config, phone, message) {
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

async function publishSms(config, phone, message) {
  try {
    return {
      messageId: await sendSmsViaSmsVoiceV2(config, phone, message),
      sendPath: config.originationNumber ? "sms-voice-v2-origination" : "sms-voice-v2"
    };
  } catch (v2Error) {
    throw new Error(`SMS-Voice V2 failed (${v2Error?.message || v2Error}).`);
  }
}

async function upsertVerifiedPhone(env, phone, details = {}) {
  if (!env?.MOJO_SUMMITS_STORAGE && !env?.MOJO_SUMMITS_SETUP_STATE) return;
  const now = new Date().toISOString();
  const r2Key = verifiedPhoneObjectKey(phone);
  const kvKey = verifiedPhoneKey(phone);
  const existingObject = env.MOJO_SUMMITS_STORAGE
    ? await env.MOJO_SUMMITS_STORAGE.get(r2Key).catch(() => null)
    : null;
  const existing = existingObject
    ? await existingObject.json().catch(() => null)
    : await env.MOJO_SUMMITS_SETUP_STATE?.get(kvKey, "json").catch(() => null);
  const record = {
    ...(existing || {}),
    phone,
    status: "verified",
    firstVerifiedAt: cleanString(existing?.firstVerifiedAt) || now,
    lastVerifiedAt: now,
    inviteCode: cleanString(details.inviteCode || existing?.inviteCode),
    source: cleanString(details.source || existing?.source) || "phone-verification"
  };

  if (env.MOJO_SUMMITS_STORAGE?.put) {
    await env.MOJO_SUMMITS_STORAGE.put(r2Key, JSON.stringify(record), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { area: "sms", kind: "verified-phone" }
    });
    return;
  }

  await env.MOJO_SUMMITS_SETUP_STATE.put(kvKey, JSON.stringify(record));
}

async function readVerifiedPhone(env, phone) {
  const r2Key = verifiedPhoneObjectKey(phone);
  const kvKey = verifiedPhoneKey(phone);
  const existingObject = env?.MOJO_SUMMITS_STORAGE?.get
    ? await env.MOJO_SUMMITS_STORAGE.get(r2Key).catch(() => null)
    : null;
  const existing = existingObject
    ? await existingObject.json().catch(() => null)
    : await env?.MOJO_SUMMITS_SETUP_STATE?.get(kvKey, "json").catch(() => null);
  return existing?.status === "verified" ? existing : null;
}

async function startVerification(phone, inviteCode, env) {
  const config = awsConfig(env);
  await writePhoneDebug(env, "start-received", {
    action: "start",
    phone,
    inviteCode,
    config: configDebug(config, env)
  });
  const existingVerifiedPhone = await readVerifiedPhone(env, phone);
  if (existingVerifiedPhone) {
    await writePhoneDebug(env, "start-skipped", {
      action: "start",
      phone,
      inviteCode,
      status: "already-verified",
      config: configDebug(config, env)
    });
    return json({
      ok: true,
      requiresCode: false,
      status: "verified",
      message: "Phone already verified."
    });
  }

  const missing = missingAwsConfig(config, env);
  if (missing.length) {
    await writePhoneDebug(env, "start-rejected", {
      action: "start",
      phone,
      inviteCode,
      status: "missing-config",
      error: `Missing configuration: ${missing.join(", ")}.`,
      config: configDebug(config, env)
    });
    return json(
      { error: `AWS SMS verification is missing configuration: ${missing.join(", ")}.` },
      { status: 500 }
    );
  }

  const key = verificationKey(phone);
  const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
  const now = Date.now();
  if (existing?.sentAt && now - Date.parse(existing.sentAt) < resendCooldownSeconds * 1000) {
    await writePhoneDebug(env, "start-rejected", {
      action: "start",
      phone,
      inviteCode,
      status: "cooldown",
      config: configDebug(config, env)
    });
    return json(
      { error: "A verification code was just sent. Wait a minute before requesting another one." },
      { status: 429 }
    );
  }

  const code = randomCode();
  const salt = crypto.randomUUID();
  const message = `${code} is your MOJO AI Summits verification code. It expires in 10 minutes. Reply STOP to opt out or HELP for help.`;

  let sendResult = { messageId: "", sendPath: "" };
  try {
    sendResult = await publishSms(config, phone, message);
  } catch (error) {
    await writePhoneDebug(env, "send-failed", {
      action: "start",
      phone,
      inviteCode,
      status: "provider-error",
      provider: "aws",
      error,
      config: configDebug(config, env)
    });
    return json(
      { error: error?.message || "The SMS provider could not send the verification code." },
      { status: 502 }
    );
  }

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
      messageId: sendResult.messageId
    }),
    { expirationTtl: otpTtlSeconds }
  );

  await writePhoneDebug(env, "send-succeeded", {
    action: "start",
    phone,
    inviteCode,
    status: "code_sent",
    provider: "aws",
    sendPath: sendResult.sendPath,
    messageId: sendResult.messageId,
    config: configDebug(config, env)
  });

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
  await writePhoneDebug(env, "confirm-received", {
    action: "confirm",
    phone,
    config: configDebug(config, env)
  });
  const missing = missingAwsConfig(config, env);
  if (missing.length) {
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "missing-config",
      error: `Missing configuration: ${missing.join(", ")}.`,
      config: configDebug(config, env)
    });
    return json(
      { error: `AWS SMS verification is missing configuration: ${missing.join(", ")}.` },
      { status: 500 }
    );
  }

  const key = verificationKey(phone);
  const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
  if (!record) {
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "missing-record",
      config: configDebug(config, env)
    });
    return json({ error: "Verification code expired. Request a new code." }, { status: 400 });
  }
  if (Date.parse(record.expiresAt) < Date.now()) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "expired",
      config: configDebug(config, env)
    });
    return json({ error: "Verification code expired. Request a new code." }, { status: 400 });
  }
  if ((record.attempts || 0) >= maxAttempts) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "too-many-attempts",
      config: configDebug(config, env)
    });
    return json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  const cleanCode = cleanString(code);
  if (!/^\d{6}$/.test(cleanCode)) {
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "invalid-code-format",
      config: configDebug(config, env)
    });
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
    await writePhoneDebug(env, "confirm-rejected", {
      action: "confirm",
      phone,
      status: "code-mismatch",
      config: configDebug(config, env)
    });
    return json({ error: "That code did not match. Try again." }, { status: 400 });
  }

  await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
  await upsertVerifiedPhone(env, phone, {
    inviteCode: record.inviteCode,
    source: "phone-verification-confirm"
  });
  await writePhoneDebug(env, "confirm-succeeded", {
    action: "confirm",
    phone,
    status: "verified",
    config: configDebug(config, env)
  });
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
    await writePhoneDebug(env, "request-rejected", {
      action,
      phone,
      status: "invalid-phone"
    });
    return json({ error: "Enter a valid mobile phone number with country code, such as +1 or +44." }, { status: 400 });
  }

  if (action === "start") {
    if (!isSmsConfigured(env)) {
      await writePhoneDebug(env, "start-rejected", {
        action: "start",
        phone,
        inviteCode: payload?.inviteCode,
        status: "not-configured",
        config: configDebug(awsConfig(env), env)
      });
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
      await writePhoneDebug(env, "confirm-rejected", {
        action: "confirm",
        phone,
        status: "not-configured",
        config: configDebug(awsConfig(env), env)
      });
      return json({ error: "SMS code confirmation is not available until an SMS provider is configured." }, { status: 409 });
    }

    return confirmVerification(phone, payload?.code, env);
  }

  await writePhoneDebug(env, "request-rejected", {
    action,
    phone,
    status: "unknown-action"
  });
  return json({ error: "Unknown phone verification action." }, { status: 400 });
}

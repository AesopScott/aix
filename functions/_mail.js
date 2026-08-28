const maxFieldLength = 2000;
const graphScope = "https://graph.microsoft.com/.default";

export function cleanMailString(value) {
  return typeof value === "string"
    ? value.trim().slice(0, maxFieldLength)
    : "";
}

function cleanMailContent(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function microsoftGraphAccessToken(env = {}) {
  const tenantId = cleanMailString(env.MOJO_MAIL_TENANT_ID || env.MOJO_MS_TENANT_ID || env.MICROSOFT_TENANT_ID || env.MS_TENANT_ID);
  const clientId = cleanMailString(env.MOJO_MAIL_CLIENT_ID || env.MOJO_MS_CLIENT_ID || env.MICROSOFT_CLIENT_ID || env.MS_CLIENT_ID);
  const clientSecret = String(env.MOJO_MAIL_CLIENT_SECRET || env.MOJO_MS_CLIENT_SECRET || env.MICROSOFT_CLIENT_SECRET || env.MS_CLIENT_SECRET || "");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph mail credentials are not configured.");
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", graphScope);
  body.set("grant_type", "client_credentials");

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Microsoft Graph token request failed.");
  }

  return payload.access_token;
}

function recipient(address, name = "") {
  const cleanAddress = cleanMailString(address);
  if (!cleanAddress) return null;
  return {
    emailAddress: {
      address: cleanAddress,
      ...(cleanMailString(name) ? { name: cleanMailString(name) } : {})
    }
  };
}

function normalizeRecipients(value) {
  return (Array.isArray(value) ? value : [value])
    .map((entry) => typeof entry === "string" ? recipient(entry) : recipient(entry?.address, entry?.name))
    .filter(Boolean);
}

export async function sendMicrosoftGraphMail(env = {}, options = {}) {
  const sender = cleanMailString(options.sender || env.MOJO_INVITE_EMAIL_SENDER);
  const toRecipients = normalizeRecipients(options.to);
  const ccRecipients = normalizeRecipients(options.cc);
  const bccRecipients = normalizeRecipients(options.bcc);
  if (!sender) throw new Error("Microsoft Graph sender mailbox is not configured.");
  if (!toRecipients.length) throw new Error("At least one email recipient is required.");

  const token = await microsoftGraphAccessToken(env);
  const attachments = Array.isArray(options.attachments)
    ? options.attachments
      .filter((attachment) => cleanMailString(attachment?.name) && cleanMailContent(attachment?.contentBytes))
      .map((attachment) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: cleanMailString(attachment.name),
        contentType: cleanMailString(attachment.contentType) || "application/octet-stream",
        contentBytes: cleanMailContent(attachment.contentBytes)
      }))
    : [];

  const message = {
    subject: cleanMailString(options.subject),
    body: {
      contentType: options.html ? "HTML" : "Text",
      content: cleanMailContent(options.html || options.text)
    },
    toRecipients,
    ...(ccRecipients.length ? { ccRecipients } : {}),
    ...(bccRecipients.length ? { bccRecipients } : {}),
    ...(normalizeRecipients(options.replyTo).length ? { replyTo: normalizeRecipients(options.replyTo) } : {}),
    ...(attachments.length ? { attachments } : {})
  };

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      message,
      saveToSentItems: options.saveToSentItems !== false
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || "Microsoft Graph sendMail failed.");
  }

  return { ok: true, sender };
}

function resendAddresses(value) {
  return normalizeRecipients(value).map((entry) => entry.emailAddress.address);
}

export async function sendResendMail(env = {}, options = {}) {
  const apiKey = cleanMailString(env.RESEND_API_KEY, 400);
  if (!apiKey) throw new Error("Resend is not configured (missing RESEND_API_KEY).");

  const sender = cleanMailString(env.MOJO_RESEND_FROM || options.sender || env.MOJO_INVITE_EMAIL_SENDER);
  const toRecipients = resendAddresses(options.to);
  const ccRecipients = resendAddresses(options.cc);
  const bccRecipients = resendAddresses(options.bcc);
  const replyToRecipients = resendAddresses(options.replyTo);
  if (!sender) throw new Error("Resend sender mailbox is not configured.");
  if (!toRecipients.length) throw new Error("At least one email recipient is required.");

  const attachments = Array.isArray(options.attachments)
    ? options.attachments
      .filter((attachment) => cleanMailString(attachment?.name) && cleanMailContent(attachment?.contentBytes))
      .map((attachment) => ({
        filename: cleanMailString(attachment.name),
        content: cleanMailContent(attachment.contentBytes),
        ...(cleanMailString(attachment.contentType) ? { content_type: cleanMailString(attachment.contentType) } : {})
      }))
    : [];

  const payload = {
    from: sender,
    to: toRecipients,
    subject: cleanMailString(options.subject),
    ...(cleanMailContent(options.html) ? { html: cleanMailContent(options.html) } : {}),
    ...(cleanMailContent(options.text) ? { text: cleanMailContent(options.text) } : {}),
    ...(ccRecipients.length ? { cc: ccRecipients } : {}),
    ...(bccRecipients.length ? { bcc: bccRecipients } : {}),
    ...(replyToRecipients.length ? { reply_to: replyToRecipients } : {}),
    ...(attachments.length ? { attachments } : {})
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || "Resend could not send the email.");
  }

  return { ok: true, sender, id: body.id || "" };
}

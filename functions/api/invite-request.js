import { upsertRegistrationContact } from "../_registration-crm.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const allowedTypes = new Set(["executive", "conversation", "partner", "partner-subscription", "dallas-invite"]);
const maxFieldLength = 2000;
const notificationRecipients = [
  "angel@mojoaisummits.com",
  "scott@mojoaisummits.com"
];
const partnerSubscriptionRecipients = [
  "miller@mojoaisummits.com",
  "jodi@mojoaisummits.com"
];
const defaultNotificationSender = "scott@mojoaisummits.com";

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

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean).slice(0, 12)
    : [];
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanPayload(payload) {
  const type = cleanString(payload?.type);
  const request = {
    type,
    name: cleanString(payload?.name),
    email: cleanString(payload?.email),
    phone: cleanString(payload?.phone),
    company: cleanString(payload?.company),
    title: cleanString(payload?.title),
    track: cleanString(payload?.track),
    stage: cleanString(payload?.stage),
    goal: cleanString(payload?.goal),
    sessionTitle: cleanString(payload?.sessionTitle),
    format: cleanString(payload?.format),
    story: cleanString(payload?.story),
    link: cleanString(payload?.link),
    teamSize: cleanString(payload?.teamSize),
    notes: cleanString(payload?.notes),
    sourcePage: cleanString(payload?.sourcePage),
    learningProgramMember: cleanBoolean(payload?.learningProgramMember),
    addons: cleanArray(payload?.addons)
  };

  Object.keys(request).forEach((key) => {
    if (request[key] === "" || request[key] === undefined || (Array.isArray(request[key]) && request[key].length === 0)) {
      delete request[key];
    }
  });

  return request;
}

function validateRequest(request) {
  if (!allowedTypes.has(request.type)) return "Unknown request type.";
  if (!request.name || !request.email || !request.company || !request.title) {
    return "Name, email, company, and title are required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    return "Enter a valid email address.";
  }
  if (request.type === "partner-subscription" && !request.phone) {
    return "Phone is required.";
  }
  return "";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function requestLabel(type = "") {
  return {
    "dallas-invite": "Dallas invite request",
    executive: "Executive invite request",
    conversation: "Conversation proposal",
    "partner-subscription": "Partner subscription information request",
    partner: "Partner access request"
  }[type] || "Invite request";
}

function requestEmailText(record) {
  return [
    `${requestLabel(record.type)} received from mojoaisummits.com.`,
    "",
    `Name: ${record.name || ""}`,
    `Email: ${record.email || ""}`,
    record.phone ? `Phone: ${record.phone}` : "",
    `Title: ${record.title || ""}`,
    `Company: ${record.company || ""}`,
    `MojoAIstudio.com learning program member: ${record.learningProgramMember ? "True" : "False"}`,
    record.sourcePage ? `Source page: ${record.sourcePage}` : "",
    "",
    `Submitted: ${record.createdAt}`,
    `Request ID: ${record.id}`
  ].filter(Boolean).join("\n");
}

function requestEmailHtml(record) {
  const rows = [
    ["Name", record.name],
    ["Email", record.email],
    ["Phone", record.phone],
    ["Title", record.title],
    ["Company", record.company],
    ["MojoAIstudio.com learning program member", record.learningProgramMember ? "True" : "False"],
    ["Source page", record.sourcePage],
    ["Submitted", record.createdAt],
    ["Request ID", record.id]
  ].filter(([, value]) => value);

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 14px">${escapeHtml(requestLabel(record.type))}</h1>
      <p style="margin:0 0 18px">A new request was submitted from mojoaisummits.com.</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px">
        ${rows.map(([label, value]) => `
          <tr>
            <th style="text-align:left;vertical-align:top;padding:8px 12px;border:1px solid #d8dee9;background:#f4f7fb;width:140px">${escapeHtml(label)}</th>
            <td style="padding:8px 12px;border:1px solid #d8dee9">${escapeHtml(value)}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;
}

async function sendInviteNotification(env, record) {
  const shouldNotify = ["dallas-invite", "executive", "partner-subscription"].includes(record.type);
  if (!shouldNotify) return null;

  try {
    const token = await microsoftGraphAccessToken(env);
    const sender = cleanString(env.MOJO_INVITE_EMAIL_SENDER) || defaultNotificationSender;
    const recipients = record.type === "partner-subscription"
      ? partnerSubscriptionRecipients
      : notificationRecipients;
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject: `${requestLabel(record.type)}: ${record.name} at ${record.company}`,
          body: {
            contentType: "HTML",
            content: requestEmailHtml(record)
          },
          toRecipients: recipients.map((email) => ({
            emailAddress: { address: email }
          })),
          replyTo: [
            {
              emailAddress: {
                address: record.email,
                name: record.name
              }
            }
          ]
        },
        saveToSentItems: false
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message || "Microsoft Graph sendMail failed.");
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Email notification failed.",
      code: error?.code || ""
    };
  }
}

async function microsoftGraphAccessToken(env) {
  const tenantId = cleanString(env.MOJO_MAIL_TENANT_ID || env.MOJO_MS_TENANT_ID || env.MICROSOFT_TENANT_ID || env.MS_TENANT_ID);
  const clientId = cleanString(env.MOJO_MAIL_CLIENT_ID || env.MOJO_MS_CLIENT_ID || env.MICROSOFT_CLIENT_ID || env.MS_CLIENT_ID);
  const clientSecret = String(env.MOJO_MAIL_CLIENT_SECRET || env.MOJO_MS_CLIENT_SECRET || env.MICROSOFT_CLIENT_SECRET || env.MS_CLIENT_SECRET || "");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph mail credentials are not configured.");
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
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

async function storePartnerCandidateContact(env, record) {
  const registration = {
    id: record.id,
    createdAt: record.createdAt,
    name: record.name,
    email: record.email,
    phone: record.phone,
    company: record.company,
    partnerCompany: record.company,
    title: record.title,
    partnerTier: "Partner Candidate",
    source: "partner-subscription-request",
    eventId: `partner-subscription:${record.id}`,
    eventName: "Partner subscription information request",
    eventDate: record.createdAt,
    registrationRole: "partner-candidate"
  };
  const refs = await upsertRegistrationContact(env, "partner", registration, {
    label: "Partner Candidate",
    source: "partner-subscription-request",
    updatedBy: "partner-subscription-request",
    writeCompanyRollups: true
  });

  if (refs.contactKey) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(refs.contactKey, "json").catch(() => null);
    const events = Array.isArray(existing?.events)
      ? existing.events.map((event) => event.registrationId === record.id
        ? {
            ...event,
            registrationType: "Partner Candidate",
            role: "Partner Candidate",
            roles: ["Partner Candidate"]
          }
        : event)
      : [];
    await env.MOJO_SUMMITS_SETUP_STATE.put(refs.contactKey, JSON.stringify({
      ...(existing || {}),
      partnerTier: "Partner Candidate",
      contactStatus: "partner candidate",
      registrationType: "Partner Candidate",
      source: "partner-subscription-request",
      crmStatus: "new",
      events
    }));
  }

  if (refs.profileKey) {
    const existing = await env.MOJO_SUMMITS_SETUP_STATE.get(refs.profileKey, "json").catch(() => null);
    if (existing) {
      const contacts = Array.isArray(existing.contacts)
        ? existing.contacts.map((contact) => cleanString(contact?.email).toLowerCase() === record.email
          ? { ...contact, partnerTier: "Partner Candidate", registrationType: "Partner Candidate" }
          : contact)
        : [];
      await env.MOJO_SUMMITS_SETUP_STATE.put(refs.profileKey, JSON.stringify({
        ...existing,
        tier: cleanString(existing.tier) || "Partner Candidate",
        contacts,
        updatedAt: record.createdAt,
        updatedBy: "partner-subscription-request"
      }));
    }
  }

  return refs;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const inviteRequest = cleanPayload(payload);
  const error = validateRequest(inviteRequest);

  if (error) return json({ error }, { status: 400 });

  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Invite request storage is not configured." }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {
    id,
    createdAt,
    source: "mojoaisummits.com",
    ...inviteRequest
  };

  await env.MOJO_SUMMITS_SETUP_STATE.put(`invite-request:${createdAt}:${id}`, JSON.stringify(record));
  const contact = record.type === "partner-subscription"
    ? await storePartnerCandidateContact(env, record)
    : null;
  const notification = await sendInviteNotification(env, record);

  if (["dallas-invite", "executive", "partner-subscription"].includes(record.type) && !notification?.ok) {
    return json({
      error: "Invite request was saved, but the notification email could not be sent.",
      notification
    }, { status: 502 });
  }

  return json({ ok: true, id, contact });
}

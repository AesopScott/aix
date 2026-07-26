const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const allowedTypes = new Set(["executive", "conversation", "partner"]);
const maxFieldLength = 2000;

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

function cleanPayload(payload) {
  const type = cleanString(payload?.type);
  const request = {
    type,
    name: cleanString(payload?.name),
    email: cleanString(payload?.email),
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
    addons: cleanArray(payload?.addons)
  };

  Object.keys(request).forEach((key) => {
    if (request[key] === "" || (Array.isArray(request[key]) && request[key].length === 0)) {
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
  return "";
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

  return json({ ok: true, id });
}

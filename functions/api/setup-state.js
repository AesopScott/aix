const STATE_KEY = "master-event-execution-checklist";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

async function readState(env) {
  const stored = await env.MOJO_SUMMITS_SETUP_STATE.get(STATE_KEY, "json");
  return stored && typeof stored === "object"
    ? stored
    : { assignments: {}, updatedAt: null };
}

function sanitizeAssignment(value) {
  if (!value || typeof value !== "object") return null;

  return {
    owner: String(value.owner || ""),
    support: String(value.support || ""),
    priority: String(value.priority || ""),
    deliverable: String(value.deliverable || ""),
    dueDate: String(value.dueDate || ""),
    status: String(value.status || "")
  };
}

async function writeState(env, state) {
  const next = {
    assignments: state.assignments || {},
    updatedAt: new Date().toISOString()
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(STATE_KEY, JSON.stringify(next));
  return next;
}

export async function onRequestGet({ env }) {
  return json(await readState(env));
}

export async function onRequestPatch({ request, env }) {
  const payload = await request.json().catch(() => null);
  const id = typeof payload?.id === "string" ? payload.id : "";
  const assignment = sanitizeAssignment(payload?.assignment);

  if (!id || !assignment) {
    return json({ error: "Expected an item id and assignment." }, { status: 400 });
  }

  const state = await readState(env);
  state.assignments = state.assignments || {};
  state.assignments[id] = assignment;

  return json(await writeState(env, state));
}

export async function onRequestPut({ request, env }) {
  const payload = await request.json().catch(() => null);
  const incoming = payload?.assignments;

  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return json({ error: "Expected assignments object." }, { status: 400 });
  }

  const assignments = {};
  for (const [id, assignment] of Object.entries(incoming)) {
    if (typeof id !== "string") continue;
    const clean = sanitizeAssignment(assignment);
    if (clean) assignments[id] = clean;
  }

  return json(await writeState(env, { assignments }));
}

export async function onRequestDelete({ env }) {
  return json(await writeState(env, { assignments: {} }));
}

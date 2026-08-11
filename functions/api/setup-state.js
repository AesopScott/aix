const STATE_KEY = "master-event-execution-checklist";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const assignmentFields = ["owner", "support", "priority", "deliverable", "dueDate", "status", "notes"];
const customItemFields = ["id", "text", "phase", "subsection"];

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
    : { assignments: {}, customItems: [], deletedItemIds: [], updatedAt: null };
}

function sanitizeAssignment(value) {
  if (!value || typeof value !== "object") return null;

  return Object.fromEntries(assignmentFields.map((field) => [field, String(value[field] || "")]));
}

function sanitizeCustomItem(value) {
  if (!value || typeof value !== "object") return null;
  const text = String(value.text || "").trim();
  const id = String(value.id || "").trim();
  if (!id || !text) return null;

  const item = Object.fromEntries(customItemFields.map((field) => [field, String(value[field] || "").trim()]));
  item.id = id;
  item.text = text.slice(0, 240);
  item.phase = item.phase || "Setup Tracker Inbox";
  item.subsection = item.subsection || "Quick Adds";
  return item;
}

function sanitizeCustomItems(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  value.forEach((entry) => {
    const item = sanitizeCustomItem(entry);
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  });
  return items;
}

function sanitizeDeletedItemIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function writeState(env, state) {
  const next = {
    assignments: state.assignments || {},
    customItems: sanitizeCustomItems(state.customItems),
    deletedItemIds: sanitizeDeletedItemIds(state.deletedItemIds),
    updatedAt: new Date().toISOString()
  };
  await env.MOJO_SUMMITS_SETUP_STATE.put(STATE_KEY, JSON.stringify(next));
  return next;
}

export async function onRequestGet({ env }) {
  const state = await readState(env);
  return json({
    assignments: state.assignments || {},
    customItems: sanitizeCustomItems(state.customItems),
    deletedItemIds: sanitizeDeletedItemIds(state.deletedItemIds),
    updatedAt: state.updatedAt || null
  });
}

export async function onRequestPatch({ request, env }) {
  const payload = await request.json().catch(() => null);
  const id = typeof payload?.id === "string" ? payload.id : "";

  if (payload?.action === "delete-item") {
    if (!id) {
      return json({ error: "Expected an item id." }, { status: 400 });
    }

    const state = await readState(env);
    const deletedItemIds = sanitizeDeletedItemIds(state.deletedItemIds);
    if (!deletedItemIds.includes(id)) deletedItemIds.push(id);
    state.deletedItemIds = deletedItemIds;
    state.customItems = sanitizeCustomItems(state.customItems).filter((item) => item.id !== id);
    state.assignments = state.assignments || {};
    delete state.assignments[id];

    return json(await writeState(env, state));
  }

  const assignment = sanitizeAssignment(payload?.assignment);
  const fields = Array.isArray(payload?.fields)
    ? payload.fields.filter((field) => assignmentFields.includes(field))
    : assignmentFields;

  if (!id || !assignment) {
    return json({ error: "Expected an item id and assignment." }, { status: 400 });
  }

  const state = await readState(env);
  state.assignments = state.assignments || {};
  const existing = sanitizeAssignment(state.assignments[id]) || {};
  state.assignments[id] = { ...existing };
  fields.forEach((field) => {
    state.assignments[id][field] = assignment[field];
  });

  return json(await writeState(env, state));
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const item = sanitizeCustomItem(payload?.customItem);

  if (!item) {
    return json({ error: "Expected a custom item with id and text." }, { status: 400 });
  }

  const state = await readState(env);
  const customItems = sanitizeCustomItems(state.customItems).filter((existing) => existing.id !== item.id);
  customItems.push(item);
  state.customItems = customItems;
  state.deletedItemIds = sanitizeDeletedItemIds(state.deletedItemIds).filter((id) => id !== item.id);
  state.assignments = state.assignments || {};
  state.assignments[item.id] = sanitizeAssignment(item);

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

  const state = await readState(env);
  return json(await writeState(env, {
    assignments,
    customItems: payload?.customItems === undefined ? state.customItems : payload.customItems,
    deletedItemIds: payload?.deletedItemIds === undefined ? state.deletedItemIds : payload.deletedItemIds
  }));
}

export async function onRequestDelete({ env }) {
  const state = await readState(env);
  return json(await writeState(env, {
    assignments: {},
    customItems: state.customItems,
    deletedItemIds: state.deletedItemIds
  }));
}

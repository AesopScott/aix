import { json, readContacts } from "../../_live-crm-api.js";

function cleanId(value) {
  return decodeURIComponent(String(value || "")).trim().toLowerCase();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet({ env, params }) {
  try {
    const id = cleanId(params?.id);
    const contacts = await readContacts(env);
    const contact = contacts.find((row) => row.id === id || row.key === id || row.contact_id === id);
    if (!contact) return json({ error: "Contact was not found." }, { status: 404 });
    return json({ ok: true, contact });
  } catch (error) {
    return json({ error: error.message || "Contact could not be loaded." }, { status: 500 });
  }
}

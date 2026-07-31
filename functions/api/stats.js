import { json, statsResponse } from "../_live-crm-api.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet({ env }) {
  try {
    return await statsResponse(env);
  } catch (error) {
    return json({ error: error.message || "CRM stats could not be loaded." }, { status: 500 });
  }
}

import { json } from "../_live-crm-api.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet() {
  return json({
    ok: true,
    activities: [],
    items: [],
    data: [],
    total: 0
  });
}

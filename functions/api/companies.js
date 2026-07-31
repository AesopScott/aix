import { companiesResponse, json } from "../_live-crm-api.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet({ request, env }) {
  try {
    return await companiesResponse(request, env);
  } catch (error) {
    return json({ error: error.message || "Companies could not be loaded." }, { status: 500 });
  }
}

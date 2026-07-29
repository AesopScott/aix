import { handlePublicRegistration, json } from "../_registration-crm.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function onRequestPost(context) {
  const response = await handlePublicRegistration(context, "partner");
  const data = await response.json().catch(() => ({}));
  return json(data, { status: response.status });
}

import { handlePublicRegistration } from "../_registration-crm.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function onRequestPost(context) {
  return handlePublicRegistration(context, "guest");
}

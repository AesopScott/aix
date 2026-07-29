import { handleInviteCodeValidation } from "../../../../_registration-crm.js";

export async function onRequestGet(context) {
  return handleInviteCodeValidation(context, "partner");
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "content-type": "application/json; charset=utf-8" } });
}

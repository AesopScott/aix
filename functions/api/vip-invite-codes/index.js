import { vipInviteCodesResponse } from "../../_live-crm-api.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

export async function onRequestGet() {
  return vipInviteCodesResponse();
}

import { json } from "../../_access-control.js";
import { createBooking, requireStore } from "../../_scheduling.js";

async function rateLimit(request, env, input) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const email = String(input?.guestEmail || input?.email || "").trim().toLowerCase();
  const hour = new Date().toISOString().slice(0, 13);
  const key = `scheduling:rate:${hour}:${ip}:${email}`;
  const count = Number(await env.MOJO_SUMMITS_SETUP_STATE.get(key).catch(() => "0")) || 0;
  if (count >= 8) {
    return json({ error: "Too many booking attempts. Try again later." }, { status: 429 });
  }
  await env.MOJO_SUMMITS_SETUP_STATE.put(key, String(count + 1), { expirationTtl: 3700 });
  return null;
}

export async function onRequestPost({ request, env }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return json({ error: "Send booking details as JSON." }, { status: 400 });
  }
  if (String(input.website || "").trim()) {
    return json({ error: "Unable to confirm booking." }, { status: 400 });
  }

  const rateLimited = await rateLimit(request, env, input);
  if (rateLimited) return rateLimited;

  try {
    const result = await createBooking(env, input);
    if (result.response) return result.response;
    return json(result);
  } catch (error) {
    return json({ error: error.message || "Unable to confirm booking." }, { status: 502 });
  }
}

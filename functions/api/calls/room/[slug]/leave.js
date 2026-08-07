import { leaveRoom } from "../../../../_virtual-event-room.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost({ request, env, params }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { participantId } = payload || {};
  if (!participantId) return json({ error: "Missing participantId." }, { status: 400 });

  await leaveRoom(env, params.slug, participantId);
  return json({ ok: true });
}

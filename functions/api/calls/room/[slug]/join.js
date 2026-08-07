import { callsFetch, CallsConfigError } from "../../../../_calls.js";
import { joinRoom, listRoomParticipants } from "../../../../_virtual-event-room.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// Publishes the caller's local tracks to Cloudflare Calls, registers them
// in the room's presence record, and returns the list of other
// participants already in the room so the client can pull their tracks next.
export async function onRequestPost({ request, env, params }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { sdp, tracks, participantId } = payload || {};
  if (!sdp || !Array.isArray(tracks) || !tracks.length || !participantId) {
    return json({ error: "Missing sdp, tracks, or participantId." }, { status: 400 });
  }

  try {
    const session = await callsFetch(env, "/sessions/new", {});
    const sessionId = session.sessionId;

    const published = await callsFetch(env, `/sessions/${sessionId}/tracks/new`, {
      sessionDescription: { type: "offer", sdp },
      tracks: tracks.map((t) => ({ location: "local", mid: t.mid, trackName: t.trackName }))
    });

    const others = await joinRoom(
      env,
      params.slug,
      participantId,
      sessionId,
      tracks.map((t) => t.trackName)
    );

    return json({
      ok: true,
      sessionId,
      publishAnswer: published.sessionDescription,
      others // [{ participantId, sessionId, trackNames }]
    });
  } catch (err) {
    const status = err instanceof CallsConfigError ? 500 : 502;
    return json({ error: String(err.message || err) }, { status });
  }
}

export async function onRequestGet({ env, params }) {
  const participants = await listRoomParticipants(env, params.slug);
  return json({ participants });
}

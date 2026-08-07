import { callsFetch, CallsConfigError } from "../../../../_calls.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// Pulls one remote participant's tracks into the caller's own Calls
// session. May require a client-side renegotiate step (see renegotiate.js)
// if the caller's session doesn't already have a matching transceiver.
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { sessionId, remoteSessionId, trackNames } = payload || {};
  if (!sessionId || !remoteSessionId || !Array.isArray(trackNames) || !trackNames.length) {
    return json({ error: "Missing sessionId, remoteSessionId, or trackNames." }, { status: 400 });
  }

  try {
    const pulled = await callsFetch(env, `/sessions/${sessionId}/tracks/new`, {
      tracks: trackNames.map((trackName) => ({
        location: "remote",
        sessionId: remoteSessionId,
        trackName
      }))
    });

    return json({
      ok: true,
      pullOffer: pulled.sessionDescription || null,
      tracks: pulled.tracks || [],
      requiresRenegotiation: Boolean(pulled.requiresImmediateRenegotiation)
    });
  } catch (err) {
    const status = err instanceof CallsConfigError ? 500 : 502;
    return json({ error: String(err.message || err) }, { status });
  }
}

import { callsFetch, CallsConfigError } from "../../../../_calls.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { sessionId, sdp } = payload || {};
  if (!sessionId || !sdp) {
    return json({ error: "Missing sessionId or sdp." }, { status: 400 });
  }

  try {
    await callsFetch(env, `/sessions/${sessionId}/renegotiate`, {
      sessionDescription: { type: "answer", sdp }
    });
    return json({ ok: true });
  } catch (err) {
    const status = err instanceof CallsConfigError ? 500 : 502;
    return json({ error: String(err.message || err) }, { status });
  }
}

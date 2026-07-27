import {
  getVirtualEvent,
  publicVirtualEvent,
  zoomKey
} from "../../_virtual-events.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function publicZoom(zoom) {
  return zoom
    ? {
        meetingId: zoom.meetingId || "",
        joinUrl: zoom.joinUrl || "",
        passcode: zoom.passcode || ""
      }
    : null;
}

export async function onRequestGet({ env, params }) {
  const event = getVirtualEvent(params.slug);
  if (!event) return json({ error: "Virtual event not found." }, { status: 404 });

  const now = new Date();
  const publicEvent = publicVirtualEvent(event, now);
  const storedZoom = await env.MOJO_SUMMITS_SETUP_STATE
    ?.get(zoomKey(event.slug), "json")
    .catch(() => null);

  return json({
    ok: true,
    event: publicEvent,
    zoomConfigured: Boolean(storedZoom?.joinUrl),
    zoom: publicEvent.locked ? null : publicZoom(storedZoom),
    message: publicEvent.locked
      ? "This virtual event room is locked. The Zoom link is no longer available from this page."
      : storedZoom?.joinUrl
        ? "The Zoom room is available for invited guests."
        : "The Zoom room is being configured."
  });
}

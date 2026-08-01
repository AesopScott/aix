import { onRequestOptions, onRequestPost } from "../functions/api/invite-request.js";

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/invite-request") {
      return json({ error: "Not found." }, { status: 404 });
    }

    if (request.method === "OPTIONS") return onRequestOptions();
    if (request.method === "POST") return onRequestPost({ request, env });

    return json({ error: "Method not allowed." }, { status: 405 });
  }
};

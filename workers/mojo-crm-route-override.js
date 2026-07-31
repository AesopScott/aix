const PAGES_ORIGIN = "https://mojo-ai-summits.pages.dev";

function removedLegacyAsset() {
  return new Response("The legacy CRM React asset has been removed.", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function rewriteRedirect(response, request) {
  if (response.status < 300 || response.status >= 400) return response;

  const location = response.headers.get("location");
  if (!location) return response;

  const requestUrl = new URL(request.url);
  const nextLocation = new URL(location, PAGES_ORIGIN);
  if (nextLocation.origin === PAGES_ORIGIN) {
    nextLocation.protocol = requestUrl.protocol;
    nextLocation.host = requestUrl.host;
  }

  const headers = new Headers(response.headers);
  headers.set("location", nextLocation.toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/crm/assets/")) {
      return removedLegacyAsset();
    }

    const target = new URL(url.pathname + url.search, PAGES_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
      cf: {
        cacheEverything: false,
        cacheTtl: 0
      }
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = request.body;
    }

    const response = await fetch(target, init);
    return noStore(rewriteRedirect(response, request));
  }
};

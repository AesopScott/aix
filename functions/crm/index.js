function responseWithNoStore(response) {
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

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const assetUrl = new URL("/crm/index.html", url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));
  return responseWithNoStore(response);
}

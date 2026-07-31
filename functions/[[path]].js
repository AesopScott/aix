export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (!/^\/book-[a-z0-9-]+\/?$/i.test(url.pathname)) {
    return context.next();
  }

  const assetUrl = new URL("/book/index.html", url);
  const assetRequest = new Request(assetUrl.toString(), {
    headers: context.request.headers,
    method: "GET"
  });
  return context.env.ASSETS.fetch(assetRequest);
}

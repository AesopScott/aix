export async function onRequest() {
  return new Response("The legacy CRM React asset has been removed.", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

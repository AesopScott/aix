export function legacyCrmRemoved() {
  return new Response(JSON.stringify({
    error: "The legacy React CRM has been removed.",
    replacement: "/crm/ now uses the maintained Mojo CRM backed by /api/crm."
  }), {
    status: 410,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

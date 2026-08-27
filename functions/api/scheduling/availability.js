import { json } from "../../_access-control.js";
import { availability, availabilitySummary, requireStore } from "../../_scheduling.js";

export async function onRequestGet({ request, env }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const url = new URL(request.url);
  try {
    const query = Object.fromEntries(url.searchParams.entries());
    const result = query.start || query.end
      ? await availabilitySummary(env, query)
      : await availability(env, query);
    if (result.response) return result.response;
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ error: error.message || "Unable to load availability." }, { status: 502 });
  }
}

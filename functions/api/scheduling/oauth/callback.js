import { json } from "../../../_access-control.js";
import { finishMicrosoftCalendarOAuth, requireStore } from "../../../_scheduling.js";

export async function onRequestGet({ request, env }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return Response.redirect(`${url.origin}/schedule-admin/?calendar=denied`, 302);
  }

  try {
    return await finishMicrosoftCalendarOAuth(env, request, Object.fromEntries(url.searchParams.entries()));
  } catch (error) {
    return json({ error: error.message || "Unable to connect calendar." }, { status: 400 });
  }
}

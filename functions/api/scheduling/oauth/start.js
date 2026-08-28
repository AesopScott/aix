import { json } from "../../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../../_auth.js";
import { beginMicrosoftCalendarOAuth, requireStore } from "../../../_scheduling.js";

function hasSchedulingAccess(user, data = {}) {
  return canManageAccess(user) || (
    data.auth?.accessControlEnabled === true &&
    data.auth?.email === user.email
  );
}

export async function onRequestGet({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user) return json({ error: "Sign in with a Mojo AI Summits account approved for scheduling." }, { status: 401 });
  if (!hasSchedulingAccess(user, data)) return json({ error: "This account is not approved to connect scheduling calendars." }, { status: 403 });

  const url = new URL(request.url);
  const result = await beginMicrosoftCalendarOAuth(env, request, {
    slug: url.searchParams.get("slug"),
    email: url.searchParams.get("email"),
    actor: user.email
  });
  if (result.response?.status === 503 && !(request.headers.get("accept") || "").includes("application/json")) {
    return Response.redirect(`${url.origin}/schedule-admin/?calendar=not-configured`, 302);
  }
  return result.response || result;
}

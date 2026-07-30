import { json } from "../../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../../_auth.js";
import { beginMicrosoftCalendarOAuth, requireStore } from "../../../_scheduling.js";

export async function onRequestGet({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user) return json({ error: "Sign in with a Mojo AI Summits admin account." }, { status: 401 });
  if (!canManageAccess(user)) return json({ error: "Only owners and admins can connect scheduling calendars." }, { status: 403 });

  const url = new URL(request.url);
  const result = await beginMicrosoftCalendarOAuth(env, request, {
    slug: url.searchParams.get("slug"),
    email: url.searchParams.get("email"),
    actor: user.email
  });
  return result.response || result;
}

import { json } from "../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../_auth.js";
import { calendarFeedDiagnostics, requireStore } from "../../_scheduling.js";

function hasSchedulingAccess(user, data = {}) {
  return canManageAccess(user) || (
    data.auth?.accessControlEnabled === true &&
    data.auth?.email === user.email
  );
}

async function requireSchedulingAccess(request, env, data = {}) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user) return { response: json({ error: "Sign in with a Mojo AI Summits account approved for scheduling." }, { status: 401 }) };
  if (!hasSchedulingAccess(user, data)) return { response: json({ error: "This account is not approved to manage scheduling." }, { status: 403 }) };
  return { user };
}

export async function onRequestGet({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const access = await requireSchedulingAccess(request, env, data);
  if (access.response) return access.response;

  const url = new URL(request.url);
  try {
    const result = await calendarFeedDiagnostics(env, Object.fromEntries(url.searchParams.entries()));
    if (result.response) return result.response;
    return json(result);
  } catch (error) {
    return json({ error: error.message || "Unable to test calendar feeds." }, { status: 502 });
  }
}

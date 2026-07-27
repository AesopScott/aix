import {
  canManageAccess,
  createInvite,
  getSessionUser,
  listInvites,
  revokeInvite
} from "../_auth.js";
import { json } from "../_access-control.js";

async function requireManager(request, env, data) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!canManageAccess(user)) {
    return {
      response: json({ error: "Only access administrators can manage invites." }, { status: 403 })
    };
  }
  return { user };
}

export async function onRequestGet({ request, env, data }) {
  const access = await requireManager(request, env, data);
  if (access.response) return access.response;

  return json({
    ok: true,
    invites: await listInvites(env)
  });
}

export async function onRequestPost({ request, env, data }) {
  const access = await requireManager(request, env, data);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  try {
    const { invite, acceptUrl } = await createInvite(env, payload, access.user.email, request.url);
    return json({ ok: true, invite, acceptUrl }, { status: 201 });
  } catch (error) {
    return json({ error: error?.message || "Invite could not be created." }, { status: 400 });
  }
}

export async function onRequestDelete({ request, env, data }) {
  const access = await requireManager(request, env, data);
  if (access.response) return access.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    const invite = await revokeInvite(env, id, access.user.email);
    return json({ ok: true, invite });
  } catch (error) {
    return json({ error: error?.message || "Invite could not be revoked." }, { status: 400 });
  }
}

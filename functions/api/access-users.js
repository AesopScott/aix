import {
  canManageAccess,
  createUser,
  getSessionUser,
  listUsers,
  updateUser
} from "../_auth.js";
import { json } from "../_access-control.js";

async function requireManager(request, env) {
  const user = await getSessionUser(request, env);
  if (!canManageAccess(user)) {
    return {
      response: json({ error: "Only access administrators can manage users." }, { status: 403 })
    };
  }
  return { user };
}

export async function onRequestGet({ request, env }) {
  const access = await requireManager(request, env);
  if (access.response) return access.response;

  return json({
    ok: true,
    users: await listUsers(env)
  });
}

export async function onRequestPost({ request, env }) {
  const access = await requireManager(request, env);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  try {
    const user = await createUser(env, payload, access.user.email);
    return json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return json({ error: error?.message || "User could not be created." }, { status: 400 });
  }
}

export async function onRequestPut({ request, env }) {
  const access = await requireManager(request, env);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  try {
    const user = await updateUser(env, payload?.email, payload, access.user.email);
    return json({ ok: true, user });
  } catch (error) {
    return json({ error: error?.message || "User could not be updated." }, { status: 400 });
  }
}

export async function onRequestDelete({ request, env }) {
  const access = await requireManager(request, env);
  if (access.response) return access.response;

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  try {
    const user = await updateUser(env, email, { status: "disabled" }, access.user.email);
    return json({ ok: true, user });
  } catch (error) {
    return json({ error: error?.message || "User could not be disabled." }, { status: 400 });
  }
}

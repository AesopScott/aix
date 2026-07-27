import {
  authStorageKind,
  countUsers,
  getSessionUser
} from "../../_auth.js";
import { json } from "../../_access-control.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  const userCount = await countUsers(env).catch(() => 0);

  return json({
    ok: true,
    authenticated: Boolean(user),
    user,
    bootstrapRequired: userCount === 0,
    storage: authStorageKind(env)
  });
}

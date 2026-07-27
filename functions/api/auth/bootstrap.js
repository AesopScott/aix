import {
  countUsers,
  createUser,
  sessionCookie,
  createSession
} from "../../_auth.js";
import { json } from "../../_access-control.js";

function bearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.replace(/^Bearer\s+/i, "").trim();
}

export async function onRequestPost({ request, env }) {
  if (!env.MOJO_AUTH_BOOTSTRAP_TOKEN) {
    return json({ error: "Bootstrap is not enabled." }, { status: 403 });
  }

  if (bearerToken(request) !== env.MOJO_AUTH_BOOTSTRAP_TOKEN) {
    return json({ error: "Bootstrap token is invalid." }, { status: 403 });
  }

  if ((await countUsers(env)) > 0) {
    return json({ error: "Bootstrap has already been completed." }, { status: 409 });
  }

  const payload = await request.json().catch(() => null);
  try {
    const user = await createUser(
      env,
      {
        ...payload,
        role: "owner",
        status: "active"
      },
      "bootstrap"
    );
    const { token } = await createSession(env, user, request.headers.get("user-agent") || "");
    return json(
      { ok: true, user },
      {
        status: 201,
        headers: {
          "set-cookie": sessionCookie(token, request)
        }
      }
    );
  } catch (error) {
    return json({ error: error?.message || "Owner account could not be created." }, { status: 400 });
  }
}

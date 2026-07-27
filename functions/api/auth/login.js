import {
  authenticateUser,
  createSession,
  sessionCookie
} from "../../_auth.js";
import { json } from "../../_access-control.js";

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");
  const user = await authenticateUser(env, email, password);

  if (!user) {
    return json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const { token } = await createSession(env, user, request.headers.get("user-agent") || "");
  return json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    },
    {
      headers: {
        "set-cookie": sessionCookie(token, request)
      }
    }
  );
}

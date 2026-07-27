import {
  acceptInvite,
  createSession,
  createFirstOwnerInvite,
  invitePreview,
  sessionCookie
} from "../../_auth.js";
import { json } from "../../_access-control.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";

  try {
    return json({
      ok: true,
      invite: await invitePreview(env, token)
    });
  } catch (error) {
    return json({ error: error?.message || "Invite link could not be loaded." }, { status: 400 });
  }
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  if (payload?.action === "first-owner") {
    try {
      const result = await createFirstOwnerInvite(env, request.url);
      return json({ ok: true, ...result }, { status: 201 });
    } catch (error) {
      return json({ error: error?.message || "First owner invite could not be created." }, { status: 400 });
    }
  }

  const token = String(payload?.token || "");
  const password = String(payload?.password || "");

  try {
    const user = await acceptInvite(env, token, password);
    const { token: sessionToken } = await createSession(
      env,
      user,
      request.headers.get("user-agent") || ""
    );
    return json(
      { ok: true, user },
      {
        status: 201,
        headers: {
          "set-cookie": sessionCookie(sessionToken, request)
        }
      }
    );
  } catch (error) {
    return json({ error: error?.message || "Invite could not be accepted." }, { status: 400 });
  }
}

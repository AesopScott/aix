import {
  clearSessionCookie,
  revokeSession
} from "../../_auth.js";
import { json } from "../../_access-control.js";

export async function onRequestPost({ request, env }) {
  await revokeSession(request, env);
  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": clearSessionCookie(request)
      }
    }
  );
}

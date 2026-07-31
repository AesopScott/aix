import {
  createSession,
  createUser,
  getUserByEmail,
  sessionCookie
} from "../../_auth.js";
import {
  emailsForGroups,
  expandAccessConfig,
  json,
  readAccessConfig
} from "../../_access-control.js";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function allowedRegistrationGroups(config, env, email) {
  const expanded = expandAccessConfig(config, env);
  const normalized = normalizeEmail(email);
  const matchedGroups = (expanded.groups || [])
    .filter((group) => group.id !== "public" && (group.emails || []).includes(normalized));
  const groupIds = matchedGroups.map((group) => group.id);
  const routeEmails = (expanded.routes || []).flatMap((route) => [
    ...(route.allowedEmails || []),
    ...emailsForGroups(expanded.groups || [], route.allowedGroupIds || [])
  ]);
  const allowedEmails = new Set([
    ...(expanded.allowedEmails || []),
    ...routeEmails
  ].map(normalizeEmail));

  return {
    allowed: matchedGroups.length > 0 || allowedEmails.has(normalized),
    groupIds
  };
}

function roleForGroups(groupIds) {
  return groupIds.includes("admin") ? "admin" : "member";
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");
  const name = cleanText(payload?.name || email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid approved email address." }, { status: 400 });
  }

  if (password.length < 12) {
    return json({ error: "Password must be at least 12 characters." }, { status: 400 });
  }

  if (await getUserByEmail(env, email)) {
    return json({ error: "An account already exists for this email. Sign in with that account or ask an admin to reset it." }, { status: 409 });
  }

  const config = await readAccessConfig(env);
  const registration = allowedRegistrationGroups(config, env, email);
  if (!registration.allowed) {
    return json({ error: "This email is not approved for Mojo AI Summits access yet." }, { status: 403 });
  }

  try {
    const user = await createUser(
      env,
      {
        email,
        name,
        password,
        role: roleForGroups(registration.groupIds),
        status: "active"
      },
      "self-registration"
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
    return json({ error: error?.message || "Account could not be created." }, { status: 400 });
  }
}

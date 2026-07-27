import {
  ACCESS_MODES,
  DEFAULT_ACCESS_CONFIG,
  DEFAULT_ACCESS_RULES,
  accessModeLabel,
  envAllowedEmails,
  expandAccessConfig,
  json,
  readAccessConfig,
  writeAccessConfig
} from "../_access-control.js";
import {
  authStorageKind,
  canManageAccess,
  getSessionUser
} from "../_auth.js";

async function managerFromRequest(request, env, data) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!canManageAccess(user)) {
    return {
      response: json({ error: "Only access administrators can change route access." }, { status: 403 })
    };
  }
  return { user };
}

function publicConfig(config, env) {
  const expanded = expandAccessConfig(config, env);
  const savedRouteModes = new Map((config.routes || []).map((route) => [route.id, route.mode]));

  return {
    version: expanded.version,
    updatedAt: expanded.updatedAt,
    updatedBy: expanded.updatedBy,
    allowedEmails: config.allowedEmails || [],
    envAllowedEmails: envAllowedEmails(env),
    effectiveAllowedEmails: expanded.allowedEmails,
    routes: expanded.routes.map((route) => ({
      id: route.id,
      kind: route.kind,
      group: route.group,
      label: route.label,
      summary: route.summary,
      mode: savedRouteModes.get(route.id) || route.mode,
      defaultMode: DEFAULT_ACCESS_RULES.find((definition) => definition.id === route.id)?.mode || route.mode,
      cloudflareDomains: route.cloudflareDomains
    }))
  };
}

export async function onRequestGet({ request, env, data }) {
  const config = await readAccessConfig(env);
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);

  return json({
    ok: true,
    actor: user?.email || "",
    modes: ACCESS_MODES.map((mode) => ({ value: mode, label: accessModeLabel(mode) })),
    authProvider: "mojo-auth",
    storage: authStorageKind(env),
    syncAvailable: false,
    config: publicConfig(config, env)
  });
}

export async function onRequestPut({ request, env, data }) {
  const access = await managerFromRequest(request, env, data);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "Expected access configuration JSON." }, { status: 400 });
  }

  try {
    const config = await writeAccessConfig(env, payload, access.user.email);
    return json({ ok: true, config: publicConfig(config, env) });
  } catch (error) {
    return json({ error: error?.message || "Access configuration could not be saved." }, { status: 500 });
  }
}

export async function onRequestPost({ request }) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "sync") {
    return json({ error: "Unknown access configuration action." }, { status: 400 });
  }

  return json(
    {
      error:
        "External access sync is disabled. Route access is enforced by the Mojo AI Summits app session middleware."
    },
    { status: 410 }
  );
}

export async function onRequestDelete({ request, env, data }) {
  const access = await managerFromRequest(request, env, data);
  if (access.response) return access.response;

  try {
    const config = await writeAccessConfig(env, DEFAULT_ACCESS_CONFIG, access.user.email);
    return json({ ok: true, config: publicConfig(config, env) });
  } catch (error) {
    return json({ error: error?.message || "Access configuration could not be reset." }, { status: 500 });
  }
}

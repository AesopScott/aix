import {
  ACCESS_MODES,
  DEFAULT_ACCESS_CONFIG,
  DEFAULT_ACCESS_RULES,
  accessModeLabel,
  accessSessionEmail,
  envAllowedEmails,
  expandAccessConfig,
  json,
  readAccessConfig,
  writeAccessConfig
} from "../_access-control.js";

const MANAGED_APP_PREFIX = "Mojo AI Summits";

function actorFromContext(request, data) {
  return data?.auth?.email || accessSessionEmail(request) || "unknown@mojoaisummits.com";
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

function configuredProtectedDomains(config) {
  return expandAccessConfig(config)
    .routes
    .filter((route) => route.mode === "authenticated" || route.mode === "allowlist")
    .flatMap((route) =>
      route.cloudflareDomains.map((domain) => ({
        route,
        domain
      }))
    );
}

function allManagedDomains() {
  return DEFAULT_ACCESS_RULES.flatMap((route) => route.cloudflareDomains);
}

function accessPolicyFor(route, config, env) {
  const allowedEmails = expandAccessConfig(config, env).allowedEmails;
  if (route.mode === "authenticated") {
    return {
      name: `${route.label} - authenticated users`,
      decision: "allow",
      precedence: 1,
      include: [{ everyone: {} }]
    };
  }

  if (allowedEmails.length === 0) {
    throw new Error("Add at least one allowed email before syncing allowlist routes.");
  }

  return {
    name: `${route.label} - allowed users`,
    decision: "allow",
    precedence: 1,
    include: allowedEmails.map((email) => ({ email: { email } }))
  };
}

function appPayload(route, domain, config, env) {
  return {
    name: `${MANAGED_APP_PREFIX} ${route.label}`,
    domain,
    type: "self_hosted",
    session_duration: "24h",
    auto_redirect_to_identity: false,
    policies: [accessPolicyFor(route, config, env)]
  };
}

async function cloudflare(env, path, options = {}) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for sync.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/access${path}`,
    {
      ...options,
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "content-type": "application/json",
        ...(options.headers || {})
      }
    }
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    const details = Array.isArray(body.errors)
      ? body.errors.map((error) => `${error.code}: ${error.message}`).join("; ")
      : response.statusText;
    throw new Error(`Cloudflare API failed for ${path}: ${details}`);
  }

  return body.result;
}

async function listApplications(env) {
  const result = await cloudflare(env, "/apps");
  return Array.isArray(result) ? result : result?.result || [];
}

async function listIdentityProviders(env) {
  const result = await cloudflare(env, "/identity_providers");
  return Array.isArray(result) ? result : result?.result || [];
}

async function ensureOneTimePinIdentityProvider(env, existingProviders) {
  const existing = existingProviders.find((provider) => provider.type === "onetimepin");
  if (existing) return { action: "exists", name: existing.name };

  const created = await cloudflare(env, "/identity_providers", {
    method: "POST",
    body: JSON.stringify({
      name: "One-time PIN login",
      type: "onetimepin",
      config: {}
    })
  });

  return { action: "created", name: created.name || "One-time PIN login" };
}

async function ensureApplication(env, route, domain, config, existingApps) {
  const payload = appPayload(route, domain, config, env);
  const existing = existingApps.find((app) => app.domain === domain || app.name === payload.name);
  if (existing) {
    await cloudflare(env, `/apps/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return { action: "updated", name: payload.name, domain };
  }

  await cloudflare(env, "/apps", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return { action: "created", name: payload.name, domain };
}

async function removeUnwantedApplications(env, config, existingApps) {
  const desiredDomains = new Set(configuredProtectedDomains(config).map((entry) => entry.domain));
  const managedDomains = new Set(allManagedDomains());
  const removed = [];

  for (const app of existingApps) {
    const isManagedRoute = managedDomains.has(app.domain) && String(app.name || "").startsWith(MANAGED_APP_PREFIX);
    if (!isManagedRoute || desiredDomains.has(app.domain)) continue;
    await cloudflare(env, `/apps/${app.id}`, { method: "DELETE" });
    removed.push({ action: "removed", name: app.name, domain: app.domain });
  }

  return removed;
}

async function syncCloudflareAccess(env, config) {
  const existingProviders = await listIdentityProviders(env);
  const provider = await ensureOneTimePinIdentityProvider(env, existingProviders);
  const existingApps = await listApplications(env);
  const removed = await removeUnwantedApplications(env, config, existingApps);
  const ensured = [];

  for (const { route, domain } of configuredProtectedDomains(config)) {
    ensured.push(await ensureApplication(env, route, domain, config, existingApps));
  }

  return {
    ok: true,
    provider,
    removed,
    ensured,
    protectedDomains: configuredProtectedDomains(config).length,
    syncedAt: new Date().toISOString()
  };
}

export async function onRequestGet({ request, env, data }) {
  const config = await readAccessConfig(env);
  return json({
    ok: true,
    actor: actorFromContext(request, data),
    modes: ACCESS_MODES.map((mode) => ({ value: mode, label: accessModeLabel(mode) })),
    syncAvailable: Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN),
    config: publicConfig(config, env)
  });
}

export async function onRequestPut({ request, env, data }) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "Expected access configuration JSON." }, { status: 400 });
  }

  try {
    const config = await writeAccessConfig(env, payload, actorFromContext(request, data));
    return json({ ok: true, config: publicConfig(config, env) });
  } catch (error) {
    return json({ error: error?.message || "Access configuration could not be saved." }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "sync") {
    return json({ error: "Unknown access configuration action." }, { status: 400 });
  }

  try {
    const config = await readAccessConfig(env);
    return json(await syncCloudflareAccess(env, config));
  } catch (error) {
    return json({ error: error?.message || "Cloudflare Access sync failed." }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env, data }) {
  try {
    const config = await writeAccessConfig(env, DEFAULT_ACCESS_CONFIG, actorFromContext(request, data));
    return json({ ok: true, config: publicConfig(config, env) });
  } catch (error) {
    return json({ error: error?.message || "Access configuration could not be reset." }, { status: 500 });
  }
}

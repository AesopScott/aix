import {
  ACCESS_MODES,
  DEFAULT_ACCESS_CONFIG,
  DEFAULT_ACCESS_RULES,
  accessModeLabel,
  emailsForGroups,
  envAllowedEmails,
  expandAccessConfig,
  json,
  readAccessConfig,
  sanitizeAccessConfig,
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
  const savedRoutes = new Map((config.routes || []).map((route) => [route.id, route]));
  const defaultRoutes = new Map(DEFAULT_ACCESS_RULES.map((definition) => [definition.id, definition]));

  return {
    version: expanded.version,
    enabled: expanded.enabled === true,
    updatedAt: expanded.updatedAt,
    updatedBy: expanded.updatedBy,
    allowedEmails: config.allowedEmails || [],
    envAllowedEmails: envAllowedEmails(env),
    effectiveAllowedEmails: expanded.allowedEmails,
    groups: expanded.groups,
    discoveredRoutes: expanded.discoveredRoutes || [],
    routes: expanded.routes.map((route) => ({
      id: route.id,
      kind: route.kind,
      group: route.group,
      label: route.label,
      summary: route.summary,
      mode: savedRoutes.get(route.id)?.mode || route.mode,
      allowedGroupIds: route.allowedGroupIds || [],
      allowedEmails: route.allowedEmails || [],
      effectiveAllowedEmails: (route.allowedEmails || []).length || (route.allowedGroupIds || []).length
        ? [...new Set([...emailsForGroups(expanded.groups, route.allowedGroupIds), ...(route.allowedEmails || [])])].sort()
        : route.mode === "allowlist"
          ? expanded.allowedEmails
          : [],
      defaultMode: defaultRoutes.get(route.id)?.mode || route.mode,
      discovered: route.discovered === true,
      domains: route.domains
    }))
  };
}

function normalizePath(path) {
  const value = String(path || "").trim();
  if (!value.startsWith("/")) return "";
  if (value === "/") return value;
  return value.endsWith("/") ? value : `${value}/`;
}

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function routeIdFromPath(path) {
  if (path === "/") return "home";
  return String(path || "")
    .replace(/^\/|\/$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function titleFromPath(path, title = "") {
  const cleanedTitle = cleanText(title, 120)
    .replace(/\s*[|-]\s*Mojo AI Summits.*$/i, "")
    .replace(/^MOJO AI Summits\s*[:|-]\s*/i, "")
    .trim();
  if (cleanedTitle) return cleanedTitle;
  if (path === "/") return "Home";
  return path
    .replace(/^\/|\/$/g, "")
    .split("/")
    .pop()
    .split("-")
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : "")
    .join(" ");
}

function accessForAdminGroup(group) {
  if (group === "Public") return { mode: "public", groupIds: ["public"] };
  if (group === "Admin") return { mode: "allowlist", groupIds: ["admin"] };
  return { mode: "allowlist", groupIds: ["mojo-team"] };
}

function routeFromPath(path, input = {}) {
  const normalized = normalizePath(path);
  if (!normalized) return null;
  const access = accessForAdminGroup(input.group);
  return {
    id: routeIdFromPath(normalized),
    kind: "page",
    group: cleanText(input.group || "Discovered", 80),
    label: titleFromPath(normalized, input.title),
    summary: cleanText(input.summary || "Discovered from the Company Hub.", 240),
    mode: access.mode,
    defaultGroupIds: access.groupIds,
    path: normalized
  };
}

function stringField(block, field) {
  const match = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`).exec(block);
  return match?.[1] || "";
}

function routesFromAdminHtml(html) {
  const routes = [];
  const objectBlocks = String(html || "").match(/\{[\s\S]*?path\s*:\s*["'][^"']+["'][\s\S]*?\}/g) || [];
  objectBlocks.forEach((block) => {
    const route = routeFromPath(stringField(block, "path"), {
      group: stringField(block, "group"),
      title: stringField(block, "title"),
      summary: stringField(block, "summary")
    });
    if (route) routes.push(route);
  });

  const candidateBlock = /const\s+candidateRoutes\s*=\s*\[([\s\S]*?)\]/.exec(String(html || ""))?.[1] || "";
  for (const match of candidateBlock.matchAll(/["']([^"']+)["']/g)) {
    const route = routeFromPath(match[1], {
      group: "Discovered",
      summary: "Discovered from the Company Hub refresh candidates."
    });
    if (route) routes.push(route);
  }

  return routes;
}

function routePrimaryPath(route) {
  const exact = (route.matches || []).find((match) => match.exact)?.exact;
  const prefix = (route.matches || []).find((match) => match.prefix)?.prefix;
  return normalizePath(exact || prefix || route.path || "");
}

async function fetchText(url, request) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html",
      cookie: request.headers.get("cookie") || ""
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Could not read ${new URL(url).pathname}.`);
  return response.text();
}

async function fetchOptionalText(path, request) {
  const response = await fetch(new URL(path, request.url), {
    headers: {
      accept: "text/plain",
      cookie: request.headers.get("cookie") || ""
    },
    cache: "no-store"
  }).catch(() => null);
  if (!response?.ok) return "";
  return response.text();
}

async function pageTitleIfExists(path, request) {
  const url = new URL(path, request.url);
  const response = await fetch(url, {
    headers: {
      accept: "text/html",
      cookie: request.headers.get("cookie") || ""
    },
    cache: "no-store"
  }).catch(() => null);
  if (!response?.ok) return "";
  const text = await response.text();
  return /<title>([\s\S]*?)<\/title>/i.exec(text)?.[1] || "";
}

async function redirectRoutes(request) {
  const text = await fetchOptionalText("/_redirects", request);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter((line) => !line.split(/\s+/)[0].includes("*"))
    .map((line) => normalizePath(line.split(/\s+/)[0]))
    .filter(Boolean)
    .map((path) => routeFromPath(path, {
      group: "Discovered",
      summary: "Discovered from the Company Hub route refresh."
    }))
    .filter(Boolean);
}

async function headerRoutes(request) {
  const text = await fetchOptionalText("/_headers", request);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("/") && !line.includes("*") && !line.startsWith("/api/"))
    .map(normalizePath)
    .filter(Boolean)
    .map((path) => routeFromPath(path, {
      group: "Discovered",
      summary: "Discovered from the Company Hub header scan."
    }))
    .filter(Boolean);
}

async function discoverAdminRoutes(request, config) {
  const adminHtml = await fetchText(new URL("/admin/", request.url), request);
  const expanded = expandAccessConfig(config);
  const existingPaths = new Set(expanded.routes.map(routePrimaryPath).filter(Boolean));
  const existingIds = new Set(expanded.routes.map((route) => route.id));
  const discovered = new Map((config.discoveredRoutes || []).map((route) => [route.id, route]));
  const found = [];

  const candidates = [
    ...routesFromAdminHtml(adminHtml),
    ...(await redirectRoutes(request)),
    ...(await headerRoutes(request))
  ];

  for (const route of candidates) {
    if (!route.path || route.path === "/admin/" || route.path.startsWith("/mockups/")) continue;
    if (existingPaths.has(route.path)) continue;
    if (existingIds.has(route.id) || discovered.has(route.id)) continue;
    const title = await pageTitleIfExists(route.path, request);
    const next = {
      ...route,
      label: titleFromPath(route.path, route.label || title),
      summary: route.summary || "Discovered by refreshing from the Company Hub."
    };
    discovered.set(next.id, next);
    found.push(next);
  }

  return {
    addedRoutes: found,
    discoveredRoutes: [...discovered.values()]
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

export async function onRequestPost({ request, env, data }) {
  const access = await managerFromRequest(request, env, data);
  if (access.response) return access.response;

  const payload = await request.json().catch(() => null);
  if (payload?.action !== "refresh-admin-routes") {
    return json({ error: "POST is only supported for route refresh." }, { status: 405 });
  }

  try {
    const baseConfig = payload.config && typeof payload.config === "object"
      ? sanitizeAccessConfig(payload.config, access.user.email)
      : await readAccessConfig(env);
    const discovery = await discoverAdminRoutes(request, baseConfig);
    const config = await writeAccessConfig(
      env,
      {
        ...baseConfig,
        discoveredRoutes: discovery.discoveredRoutes
      },
      access.user.email
    );
    return json({
      ok: true,
      addedRoutes: discovery.addedRoutes,
      addedCount: discovery.addedRoutes.length,
      config: publicConfig(config, env)
    });
  } catch (error) {
    return json({ error: error?.message || "Routes could not be refreshed from the Company Hub." }, { status: 500 });
  }
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

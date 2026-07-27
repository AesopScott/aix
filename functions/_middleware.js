import {
  accessModeLabel,
  emailsForGroups,
  expandAccessConfig,
  isLocalRequest,
  json,
  readAccessConfig,
  routeForPath
} from "./_access-control.js";
import {
  canManageAccess,
  getSessionUser
} from "./_auth.js";

function forbidden(route, message, status = 403) {
  return json(
    {
      error: message,
      route: route.label,
      mode: accessModeLabel(route.mode)
    },
    { status }
  );
}

function wantsHtml(request) {
  return String(request.headers.get("accept") || "").includes("text/html");
}

function loginRedirect(request) {
  const url = new URL(request.url);
  const loginUrl = new URL("/access/", url);
  loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
  return Response.redirect(loginUrl, 302);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const config = await readAccessConfig(context.env);
  const route = routeForPath(url.pathname, config);

  if (!route) return context.next();

  if (config.enabled !== true) {
    context.data.auth = { email: "", mode: "public", accessControlEnabled: false };
    return context.next();
  }

  if (route.mode === "public") {
    context.data.auth = { email: "", mode: "public", accessControlEnabled: true };
    return context.next();
  }

  const openForLocalDev =
    isLocalRequest(url) ||
    context.env.MOJO_ACCESS_ALLOW_OPEN === "true" ||
    context.env.MOJO_STORAGE_ALLOW_OPEN === "true";
  if (openForLocalDev) {
    context.data.auth = {
      email: "local-dev@mojoaisummits.com",
      name: "Local Development",
      role: "owner",
      status: "active",
      mode: route.mode,
      accessControlEnabled: true
    };
    return context.next();
  }

  if (route.mode === "closed") {
    return forbidden(route, "This Mojo AI Summits route is closed.");
  }

  const user = await getSessionUser(context.request, context.env);
  if (!user) {
    return wantsHtml(context.request)
      ? loginRedirect(context.request)
      : forbidden(route, "Sign in with a Mojo AI Summits account to continue.", 401);
  }

  const expanded = expandAccessConfig(config, context.env);
  const assignedRouteEmails = Array.isArray(route.allowedEmails) ? route.allowedEmails : [];
  const assignedGroupEmails = emailsForGroups(expanded.groups, route.allowedGroupIds);
  const effectiveAllowedEmails = assignedRouteEmails.length
    ? [...new Set([...assignedGroupEmails, ...assignedRouteEmails])].sort()
    : assignedGroupEmails.length
      ? assignedGroupEmails
    : route.mode === "allowlist"
      ? expanded.allowedEmails
      : [];
  if (
    ["authenticated", "allowlist"].includes(route.mode) &&
    effectiveAllowedEmails.length > 0 &&
    !canManageAccess(user) &&
    !effectiveAllowedEmails.includes(user.email)
  ) {
    return forbidden(route, "This account is not approved for this Mojo AI Summits route.");
  }

  context.data.auth = { ...user, mode: route.mode, accessControlEnabled: true };
  return context.next();
}

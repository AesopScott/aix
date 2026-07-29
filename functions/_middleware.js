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

function isPartnerRegistrationShell(pathname) {
  return pathname === "/partner-registration" || pathname === "/partner-registration/";
}

function inviteCodeFromUrl(url) {
  return String(url.searchParams.get("invite") || "").replace(/\D/g, "").slice(0, 6);
}

function isPartnerRegistrationPreview(url) {
  const previewCode = String(url.searchParams.get("preview") || url.searchParams.get("code") || "").trim();
  return previewCode === "4321";
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function nextPathForLogin(url) {
  if (url.pathname === "/access" || url.pathname.startsWith("/access/")) return "";
  return `${url.pathname}${url.search}`;
}

function loginRedirect(request) {
  const url = new URL(request.url);
  const loginUrl = new URL("/access/", url);
  const nextPath = nextPathForLogin(url);
  if (nextPath) loginUrl.searchParams.set("next", nextPath);
  return Response.redirect(loginUrl, 302);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (
    isPartnerRegistrationShell(url.pathname) &&
    !/^\d{6}$/.test(inviteCodeFromUrl(url)) &&
    !isPartnerRegistrationPreview(url)
  ) {
    return notFound();
  }

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

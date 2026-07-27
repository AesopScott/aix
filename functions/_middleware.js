import {
  accessModeLabel,
  accessSessionEmail,
  expandAccessConfig,
  isLocalRequest,
  json,
  readAccessConfig,
  routeForPath
} from "./_access-control.js";

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

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const config = await readAccessConfig(context.env);
  const route = routeForPath(url.pathname, config);

  if (!route || route.mode === "public") return context.next();

  const openForLocalDev =
    isLocalRequest(url) ||
    context.env.MOJO_ACCESS_ALLOW_OPEN === "true" ||
    context.env.MOJO_STORAGE_ALLOW_OPEN === "true";
  if (openForLocalDev) {
    context.data.auth = { email: "local-dev@mojoaisummits.com", mode: route.mode };
    return context.next();
  }

  if (route.mode === "closed") {
    return forbidden(route, "This Mojo AI Summits route is closed.");
  }

  const email = accessSessionEmail(context.request);
  if (!email) {
    return forbidden(
      route,
      "This page is restricted. Sign in through Cloudflare Access to continue."
    );
  }

  const normalizedEmail = email.toLowerCase();
  const expanded = expandAccessConfig(config, context.env);
  if (route.mode === "allowlist" && !expanded.allowedEmails.includes(normalizedEmail)) {
    return forbidden(route, "This account is not approved for this Mojo AI Summits route.");
  }

  context.data.auth = { email: normalizedEmail, mode: route.mode };
  return context.next();
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const protectedRoutes = [
  { exact: "/admin", label: "Admin links" },
  { prefix: "/admin/", label: "Admin links" },
  { exact: "/setup", label: "Setup checklist" },
  { prefix: "/setup/", label: "Setup checklist" },
  { exact: "/events", label: "Event playbook" },
  { prefix: "/events/", label: "Event playbook" },
  { exact: "/crm", label: "CRM" },
  { exact: "/crm/", label: "CRM" },
  { exact: "/storage", label: "Storage" },
  { prefix: "/storage/", label: "Storage" },
  { exact: "/budget", label: "Budget" },
  { prefix: "/budget/", label: "Budget" },
  { exact: "/mockups", label: "Design mockups" },
  { prefix: "/mockups/", label: "Design mockups" },
  { exact: "/api/crm", label: "CRM API" },
  { prefix: "/api/crm/", label: "CRM API" },
  { exact: "/api/storage", label: "Storage API" },
  { prefix: "/api/storage/", label: "Storage API" },
  { exact: "/api/budget", label: "Budget API" },
  { prefix: "/api/budget/", label: "Budget API" },
  { exact: "/api/events", label: "Event playbook API" },
  { prefix: "/api/events/", label: "Event playbook API" },
  { exact: "/api/setup-state", label: "Setup state API" },
  { prefix: "/api/setup-state/", label: "Setup state API" }
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function protectedRoute(pathname) {
  return protectedRoutes.find((route) =>
    route.exact === pathname || (route.prefix && pathname.startsWith(route.prefix))
  );
}

function parseAllowedEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function parseCookies(value) {
  return Object.fromEntries(
    String(value || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  return atob(padded);
}

function emailFromAccessJwt(token) {
  const [, payload] = String(token || "").split(".");
  if (!payload) return "";

  try {
    const claims = JSON.parse(decodeBase64Url(payload));
    return String(claims.email || claims.common_name || "").toLowerCase();
  } catch {
    return "";
  }
}

function accessSessionEmail(request) {
  const headerEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (headerEmail) return headerEmail.toLowerCase();

  const assertionEmail = emailFromAccessJwt(request.headers.get("Cf-Access-Jwt-Assertion"));
  if (assertionEmail) return assertionEmail;

  const cookies = parseCookies(request.headers.get("cookie"));
  return emailFromAccessJwt(cookies.CF_Authorization);
}

function isLocalRequest(url) {
  return ["127.0.0.1", "localhost", "::1"].includes(url.hostname.toLowerCase());
}

function allowedEmails(env) {
  return [
    ...parseAllowedEmails(env.MOJO_ACCESS_ALLOWED_EMAILS),
    ...parseAllowedEmails(env.MOJO_STORAGE_ALLOWED_EMAILS)
  ];
}

function forbidden(route, message) {
  return json(
    {
      error: message,
      route: route.label
    },
    { status: 403 }
  );
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const route = protectedRoute(url.pathname);
  if (!route) return context.next();

  const openForLocalDev =
    isLocalRequest(url) ||
    context.env.MOJO_ACCESS_ALLOW_OPEN === "true" ||
    context.env.MOJO_STORAGE_ALLOW_OPEN === "true";
  if (openForLocalDev) return context.next();

  const email = accessSessionEmail(context.request);
  if (!email) {
    return forbidden(
      route,
      "This page is restricted. Sign in through Cloudflare Access to continue."
    );
  }

  const allowlist = allowedEmails(context.env);
  if (allowlist.length > 0 && !allowlist.includes(email.toLowerCase())) {
    return forbidden(route, "This account is not approved for this Mojo AI Summits page.");
  }

  context.data.auth = { email: email.toLowerCase() };
  return context.next();
}

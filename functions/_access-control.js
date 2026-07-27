export const ACCESS_CONFIG_KEY = "access-control:config:v1";

export const ACCESS_MODES = ["public", "authenticated", "allowlist", "closed"];

export const DEFAULT_ACCESS_RULES = [
  {
    id: "admin",
    kind: "page",
    group: "Company",
    label: "Company Hub",
    summary: "Internal route directory and operating links.",
    mode: "allowlist",
    matches: [{ exact: "/admin" }, { prefix: "/admin/" }],
    cloudflareDomains: ["mojoaisummits.com/admin", "mojoaisummits.com/admin/*"]
  },
  {
    id: "access",
    kind: "page",
    group: "Company",
    label: "Access Console",
    summary: "Authentication and route access controls.",
    mode: "allowlist",
    matches: [{ exact: "/access" }, { prefix: "/access/" }],
    cloudflareDomains: ["mojoaisummits.com/access", "mojoaisummits.com/access/*"]
  },
  {
    id: "setup",
    kind: "page",
    group: "Operations",
    label: "Setup Checklist",
    summary: "Master checklist, owners, due dates, and status.",
    mode: "allowlist",
    matches: [{ exact: "/setup" }, { prefix: "/setup/" }],
    cloudflareDomains: ["mojoaisummits.com/setup", "mojoaisummits.com/setup/*"]
  },
  {
    id: "events",
    kind: "page",
    group: "Operations",
    label: "Event Playbook",
    summary: "Internal event playbook builder and event pages.",
    mode: "allowlist",
    matches: [{ exact: "/events" }, { prefix: "/events/" }],
    cloudflareDomains: ["mojoaisummits.com/events", "mojoaisummits.com/events/*"]
  },
  {
    id: "crm",
    kind: "page",
    group: "Data",
    label: "CRM",
    summary: "VIP registrants, notes, statuses, and exports.",
    mode: "allowlist",
    matches: [{ exact: "/crm" }, { prefix: "/crm/" }],
    cloudflareDomains: ["mojoaisummits.com/crm", "mojoaisummits.com/crm/*"]
  },
  {
    id: "storage",
    kind: "page",
    group: "Data",
    label: "Storage",
    summary: "Private files, event assets, media, and receipts.",
    mode: "allowlist",
    matches: [{ exact: "/storage" }, { prefix: "/storage/" }],
    cloudflareDomains: ["mojoaisummits.com/storage", "mojoaisummits.com/storage/*"]
  },
  {
    id: "budget",
    kind: "page",
    group: "Data",
    label: "Budget and P&L",
    summary: "Receipts, reimbursement state, and expense reporting.",
    mode: "allowlist",
    matches: [{ exact: "/budget" }, { prefix: "/budget/" }],
    cloudflareDomains: ["mojoaisummits.com/budget", "mojoaisummits.com/budget/*"]
  },
  {
    id: "mockups",
    kind: "page",
    group: "Design",
    label: "Design Mockups",
    summary: "Internal mockups and website experiments.",
    mode: "allowlist",
    matches: [{ exact: "/mockups" }, { prefix: "/mockups/" }],
    cloudflareDomains: ["mojoaisummits.com/mockups", "mojoaisummits.com/mockups/*"]
  },
  {
    id: "home",
    kind: "page",
    group: "Public",
    label: "Homepage",
    summary: "Primary public website entry point.",
    mode: "public",
    matches: [{ exact: "/" }],
    cloudflareDomains: ["mojoaisummits.com"]
  },
  {
    id: "dallas",
    kind: "page",
    group: "Public",
    label: "Dallas",
    summary: "Public Dallas summit page.",
    mode: "public",
    matches: [{ exact: "/dallas" }, { prefix: "/dallas/" }],
    cloudflareDomains: ["mojoaisummits.com/dallas", "mojoaisummits.com/dallas/*"]
  },
  {
    id: "virtual",
    kind: "page",
    group: "Public",
    label: "Virtual Events",
    summary: "Public Fall 2026 virtual event series page.",
    mode: "public",
    matches: [{ exact: "/virtual" }, { prefix: "/virtual/" }],
    cloudflareDomains: ["mojoaisummits.com/virtual", "mojoaisummits.com/virtual/*"]
  },
  {
    id: "vip-registration",
    kind: "page",
    group: "Guest",
    label: "VIP Registration",
    summary: "Direct invite registration surface.",
    mode: "public",
    matches: [{ exact: "/vip-registration" }, { prefix: "/vip-registration/" }],
    cloudflareDomains: ["mojoaisummits.com/vip-registration", "mojoaisummits.com/vip-registration/*"]
  },
  {
    id: "privacy",
    kind: "page",
    group: "Public",
    label: "Privacy",
    summary: "Public privacy policy.",
    mode: "public",
    matches: [{ exact: "/privacy" }, { prefix: "/privacy/" }],
    cloudflareDomains: ["mojoaisummits.com/privacy", "mojoaisummits.com/privacy/*"]
  },
  {
    id: "sms-terms",
    kind: "page",
    group: "Public",
    label: "SMS Terms",
    summary: "Public SMS consent and terms page.",
    mode: "public",
    matches: [{ exact: "/sms-terms" }, { prefix: "/sms-terms/" }],
    cloudflareDomains: ["mojoaisummits.com/sms-terms", "mojoaisummits.com/sms-terms/*"]
  },
  {
    id: "api-access-config",
    kind: "api",
    group: "APIs",
    label: "Access API",
    summary: "Access console configuration endpoint.",
    mode: "allowlist",
    matches: [{ exact: "/api/access-config" }, { prefix: "/api/access-config/" }],
    cloudflareDomains: ["mojoaisummits.com/api/access-config", "mojoaisummits.com/api/access-config/*"]
  },
  {
    id: "api-setup-state",
    kind: "api",
    group: "APIs",
    label: "Setup State API",
    summary: "Shared checklist assignment state.",
    mode: "allowlist",
    matches: [{ exact: "/api/setup-state" }, { prefix: "/api/setup-state/" }],
    cloudflareDomains: ["mojoaisummits.com/api/setup-state", "mojoaisummits.com/api/setup-state/*"]
  },
  {
    id: "api-events",
    kind: "api",
    group: "APIs",
    label: "Events API",
    summary: "Event playbook creation and retrieval.",
    mode: "allowlist",
    matches: [{ exact: "/api/events" }, { prefix: "/api/events/" }],
    cloudflareDomains: ["mojoaisummits.com/api/events", "mojoaisummits.com/api/events/*"]
  },
  {
    id: "api-crm",
    kind: "api",
    group: "APIs",
    label: "CRM API",
    summary: "VIP registrant records and exports.",
    mode: "allowlist",
    matches: [{ exact: "/api/crm" }, { prefix: "/api/crm/" }],
    cloudflareDomains: ["mojoaisummits.com/api/crm", "mojoaisummits.com/api/crm/*"]
  },
  {
    id: "api-storage",
    kind: "api",
    group: "APIs",
    label: "Storage API",
    summary: "Private file upload, listing, and download.",
    mode: "allowlist",
    matches: [{ exact: "/api/storage" }, { prefix: "/api/storage/" }],
    cloudflareDomains: ["mojoaisummits.com/api/storage", "mojoaisummits.com/api/storage/*"]
  },
  {
    id: "api-budget",
    kind: "api",
    group: "APIs",
    label: "Budget API",
    summary: "Budget ledger, receipt review, and exports.",
    mode: "allowlist",
    matches: [{ exact: "/api/budget" }, { prefix: "/api/budget/" }],
    cloudflareDomains: ["mojoaisummits.com/api/budget", "mojoaisummits.com/api/budget/*"]
  },
  {
    id: "api-invite-request",
    kind: "api",
    group: "APIs",
    label: "Invite Request API",
    summary: "Public invite request form endpoint.",
    mode: "public",
    matches: [{ exact: "/api/invite-request" }, { prefix: "/api/invite-request/" }],
    cloudflareDomains: ["mojoaisummits.com/api/invite-request", "mojoaisummits.com/api/invite-request/*"]
  },
  {
    id: "api-phone-verification",
    kind: "api",
    group: "APIs",
    label: "Phone Verification API",
    summary: "Public guest phone verification endpoint.",
    mode: "public",
    matches: [{ exact: "/api/phone-verification" }, { prefix: "/api/phone-verification/" }],
    cloudflareDomains: ["mojoaisummits.com/api/phone-verification", "mojoaisummits.com/api/phone-verification/*"]
  },
  {
    id: "api-vip-registration",
    kind: "api",
    group: "APIs",
    label: "VIP Registration API",
    summary: "Public VIP registration submission endpoint.",
    mode: "public",
    matches: [{ exact: "/api/vip-registration" }, { prefix: "/api/vip-registration/" }],
    cloudflareDomains: ["mojoaisummits.com/api/vip-registration", "mojoaisummits.com/api/vip-registration/*"]
  }
];

export const DEFAULT_ACCESS_CONFIG = {
  version: 1,
  updatedAt: null,
  updatedBy: "",
  allowedEmails: [],
  routes: DEFAULT_ACCESS_RULES.map((rule) => ({ id: rule.id, mode: rule.mode }))
};

export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

export function parseAllowedEmails(value) {
  const source = Array.isArray(value) ? value.join(",") : value;
  return [
    ...new Set(
      String(source || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  ];
}

function routeDefinition(id) {
  return DEFAULT_ACCESS_RULES.find((route) => route.id === id);
}

export function envAllowedEmails(env) {
  return [
    ...new Set([
      ...parseAllowedEmails(env.MOJO_ACCESS_ALLOWED_EMAILS),
      ...parseAllowedEmails(env.MOJO_STORAGE_ALLOWED_EMAILS)
    ])
  ];
}

export function sanitizeAccessConfig(input = {}, actor = "") {
  const incomingRoutes = new Map(
    (Array.isArray(input.routes) ? input.routes : [])
      .filter((route) => route && typeof route === "object")
      .map((route) => [String(route.id || ""), route])
  );

  const routes = DEFAULT_ACCESS_RULES.map((definition) => {
    const incoming = incomingRoutes.get(definition.id) || {};
    const mode = ACCESS_MODES.includes(incoming.mode) ? incoming.mode : definition.mode;
    return {
      id: definition.id,
      mode: definition.id === "access" || definition.id === "api-access-config"
        ? mode === "public" ? "allowlist" : mode
        : mode
    };
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actor || String(input.updatedBy || ""),
    allowedEmails: parseAllowedEmails(input.allowedEmails),
    routes
  };
}

export async function readAccessConfig(env) {
  const stored = await env.MOJO_SUMMITS_SETUP_STATE
    ?.get(ACCESS_CONFIG_KEY, "json")
    .catch(() => null);
  const merged = sanitizeAccessConfig(stored || DEFAULT_ACCESS_CONFIG, stored?.updatedBy || "");
  return {
    ...merged,
    updatedAt: stored?.updatedAt || null
  };
}

export async function writeAccessConfig(env, input, actor = "") {
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    throw new Error("MOJO_SUMMITS_SETUP_STATE is not configured.");
  }

  const config = sanitizeAccessConfig(input, actor);
  await env.MOJO_SUMMITS_SETUP_STATE.put(ACCESS_CONFIG_KEY, JSON.stringify(config));
  return config;
}

export function expandAccessConfig(config, env = {}) {
  const routeSettings = new Map((config.routes || []).map((route) => [route.id, route]));
  const allowedEmails = [
    ...new Set([...parseAllowedEmails(config.allowedEmails), ...envAllowedEmails(env)])
  ];

  return {
    ...config,
    allowedEmails,
    envAllowedEmails: envAllowedEmails(env),
    routes: DEFAULT_ACCESS_RULES.map((definition) => ({
      ...definition,
      mode: routeSettings.get(definition.id)?.mode || definition.mode
    }))
  };
}

function pathMatchesRule(pathname, rule) {
  return rule.matches.some((match) => {
    if (match.exact) return pathname === match.exact;
    if (match.prefix) return pathname.startsWith(match.prefix);
    return false;
  });
}

export function routeForPath(pathname, config) {
  const expanded = expandAccessConfig(config);
  return [...expanded.routes]
    .sort((a, b) => {
      const aLength = Math.max(...a.matches.map((match) => (match.exact || match.prefix || "").length));
      const bLength = Math.max(...b.matches.map((match) => (match.exact || match.prefix || "").length));
      return bLength - aLength;
    })
    .find((rule) => pathMatchesRule(pathname, rule));
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

export function accessSessionEmail(request) {
  const headerEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (headerEmail) return headerEmail.toLowerCase();

  const assertionEmail = emailFromAccessJwt(request.headers.get("Cf-Access-Jwt-Assertion"));
  if (assertionEmail) return assertionEmail;

  const cookies = parseCookies(request.headers.get("cookie"));
  return emailFromAccessJwt(cookies.CF_Authorization);
}

export function isLocalRequest(url) {
  return ["127.0.0.1", "localhost", "::1"].includes(url.hostname.toLowerCase());
}

export function accessModeLabel(mode) {
  return {
    public: "Public",
    authenticated: "Authenticated",
    allowlist: "Allowlist",
    closed: "Closed"
  }[mode] || "Unknown";
}

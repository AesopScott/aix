export const ACCESS_CONFIG_KEY = "access-control:config:v1";

export const ACCESS_MODES = ["public", "authenticated", "allowlist", "closed"];

export const DEFAULT_ACCESS_GROUPS = [
  {
    id: "public",
    label: "Public",
    summary: "No login required.",
    emails: []
  },
  {
    id: "admin",
    label: "Admin",
    summary: "Access administrators and protected admin surfaces.",
    emails: ["scott@mojoaisummits.com"]
  },
  {
    id: "mojo-team",
    label: "Teams access",
    summary: "Internal Mojo team members who can use protected operating tools.",
    emails: []
  },
  {
    id: "storage-users",
    label: "Storage users",
    summary: "People who can upload, view, and download Storage files.",
    emails: []
  },
  {
    id: "partners",
    label: "Partners",
    summary: "Partner contacts who can view their private partner profile.",
    emails: []
  },
  {
    id: "members",
    label: "Members",
    summary: "Accepted members who can view their private member profile.",
    emails: []
  },
  {
    id: "guests-and-members",
    label: "Guests and members",
    summary: "CRM contacts, guests, members, and partners who can participate in community forums.",
    emails: []
  }
];

export const DEFAULT_ACCESS_RULES = [
  {
    id: "admin",
    kind: "page",
    group: "Company",
    label: "Company Hub",
    summary: "Internal route directory and operating links.",
    mode: "allowlist",
    matches: [{ exact: "/admin" }, { prefix: "/admin/" }],
    domains: ["mojoaisummits.com/admin", "mojoaisummits.com/admin/*"]
  },
  {
    id: "access",
    kind: "page",
    group: "Company",
    label: "Access Console",
    summary: "Authentication and route access controls.",
    mode: "public",
    matches: [{ exact: "/access" }, { prefix: "/access/" }],
    domains: ["mojoaisummits.com/access", "mojoaisummits.com/access/*"]
  },
  {
    id: "setup",
    kind: "page",
    group: "Operations",
    label: "Setup Checklist",
    summary: "Master checklist, owners, due dates, and status.",
    mode: "allowlist",
    matches: [{ exact: "/setup" }, { prefix: "/setup/" }],
    domains: ["mojoaisummits.com/setup", "mojoaisummits.com/setup/*"]
  },
  {
    id: "events",
    kind: "page",
    group: "Operations",
    label: "Event Playbook",
    summary: "Internal event playbook builder and event pages.",
    mode: "allowlist",
    matches: [{ exact: "/events" }, { prefix: "/events/" }],
    domains: ["mojoaisummits.com/events", "mojoaisummits.com/events/*"]
  },
  {
    id: "book",
    kind: "page",
    group: "Public",
    label: "Booking",
    summary: "Public employee booking surface.",
    mode: "public",
    matches: [{ exact: "/book" }, { prefix: "/book/" }, { prefix: "/book-" }],
    domains: ["mojoaisummits.com/book", "mojoaisummits.com/book/*", "mojoaisummits.com/book-*"]
  },
  {
    id: "schedule-admin",
    kind: "page",
    group: "Operations",
    label: "Scheduling Admin",
    summary: "Employee booking profile and availability configuration.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/schedule-admin" }, { prefix: "/schedule-admin/" }],
    domains: ["mojoaisummits.com/schedule-admin", "mojoaisummits.com/schedule-admin/*"]
  },
  {
    id: "crm",
    kind: "page",
    group: "Data",
    label: "CRM",
    summary: "CRM shell for member, guest, and partner registrants. CRM data remains protected by the API route.",
    mode: "public",
    matches: [{ exact: "/crm" }, { prefix: "/crm/" }],
    domains: ["mojoaisummits.com/crm", "mojoaisummits.com/crm/*"]
  },
  {
    id: "walkthrough",
    kind: "page",
    group: "Operations",
    label: "Walkthrough Reviews",
    summary: "Team review center for registration, profile, and invite workflows.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/walkthrough" }, { prefix: "/walkthrough/" }],
    domains: ["mojoaisummits.com/walkthrough", "mojoaisummits.com/walkthrough/*"]
  },
  {
    id: "storage",
    kind: "page",
    group: "Data",
    label: "Storage",
    summary: "Private files, event assets, media, and receipts.",
    mode: "allowlist",
    defaultGroupIds: ["storage-users"],
    matches: [{ exact: "/storage" }, { prefix: "/storage/" }],
    domains: ["mojoaisummits.com/storage", "mojoaisummits.com/storage/*"]
  },
  {
    id: "files",
    kind: "page",
    group: "Data",
    label: "Storage Portal",
    summary: "Private files, event assets, media, and receipts.",
    mode: "allowlist",
    defaultGroupIds: ["storage-users"],
    matches: [{ exact: "/files" }, { prefix: "/files/" }],
    domains: ["mojoaisummits.com/files", "mojoaisummits.com/files/*"]
  },
  {
    id: "budget",
    kind: "page",
    group: "Data",
    label: "Budget and P&L",
    summary: "Receipts, reimbursement state, and expense reporting.",
    mode: "allowlist",
    defaultGroupIds: ["admin"],
    matches: [{ exact: "/budget" }, { prefix: "/budget/" }],
    domains: ["mojoaisummits.com/budget", "mojoaisummits.com/budget/*"]
  },
  {
    id: "sms-notifications",
    kind: "page",
    group: "Data",
    label: "SMS Notifications",
    summary: "Internal SMS sender for verified registration phone numbers.",
    mode: "allowlist",
    defaultGroupIds: ["admin", "mojo-team"],
    strictGroups: true,
    matches: [{ exact: "/SMS" }, { prefix: "/SMS/" }, { exact: "/sms" }, { prefix: "/sms/" }],
    domains: ["mojoaisummits.com/SMS", "mojoaisummits.com/SMS/*", "mojoaisummits.com/sms", "mojoaisummits.com/sms/*"]
  },
  {
    id: "mockups",
    kind: "page",
    group: "Design",
    label: "Design Mockups",
    summary: "Internal mockups and website experiments.",
    mode: "allowlist",
    matches: [{ exact: "/mockups" }, { prefix: "/mockups/" }],
    domains: ["mojoaisummits.com/mockups", "mojoaisummits.com/mockups/*"]
  },
  {
    id: "partner-profile",
    kind: "page",
    group: "Partner",
    label: "Partner Profile",
    summary: "Private partner status, event, guest, publication, and sponsorship record.",
    mode: "allowlist",
    defaultGroupIds: ["partners"],
    matches: [{ exact: "/partner-profile" }, { prefix: "/partner-profile/" }],
    domains: ["mojoaisummits.com/partner-profile", "mojoaisummits.com/partner-profile/*"]
  },
  {
    id: "partner-registration",
    kind: "page",
    group: "Partner",
    label: "Partner Registration",
    summary: "Invite-code partner registration surface.",
    mode: "public",
    matches: [{ exact: "/partner-registration" }, { prefix: "/partner-registration/" }],
    domains: ["mojoaisummits.com/partner-registration", "mojoaisummits.com/partner-registration/*"]
  },
  {
    id: "member-profile",
    kind: "page",
    group: "Member",
    label: "Member Profile",
    summary: "Private member tier, invite, directory, Discord, and staff contact profile.",
    mode: "public",
    matches: [{ exact: "/member-profile" }, { prefix: "/member-profile/" }],
    domains: ["mojoaisummits.com/member-profile", "mojoaisummits.com/member-profile/*"]
  },
  {
    id: "forums",
    kind: "page",
    group: "Community",
    label: "Forums",
    summary: "Private Mojo community forums for team members and CRM contacts.",
    mode: "allowlist",
    defaultGroupIds: ["admin", "mojo-team", "guests-and-members"],
    strictGroups: true,
    matches: [{ exact: "/forums" }, { prefix: "/forums/" }],
    domains: ["mojoaisummits.com/forums", "mojoaisummits.com/forums/*"]
  },
  {
    id: "home",
    kind: "page",
    group: "Public",
    label: "Homepage",
    summary: "Primary public website entry point.",
    mode: "public",
    matches: [{ exact: "/" }],
    domains: ["mojoaisummits.com"]
  },
  {
    id: "dallas",
    kind: "page",
    group: "Public",
    label: "Dallas",
    summary: "Public Dallas summit page.",
    mode: "public",
    matches: [{ exact: "/dallas" }, { prefix: "/dallas/" }],
    domains: ["mojoaisummits.com/dallas", "mojoaisummits.com/dallas/*"]
  },
  {
    id: "virtual",
    kind: "page",
    group: "Public",
    label: "Virtual Events",
    summary: "Public Fall 2026 virtual event series page.",
    mode: "public",
    matches: [{ exact: "/virtual" }, { prefix: "/virtual/" }],
    domains: ["mojoaisummits.com/virtual", "mojoaisummits.com/virtual/*"]
  },
  {
    id: "membership",
    kind: "page",
    group: "Public",
    label: "Membership",
    summary: "Public Executive Intelligence Network membership page.",
    mode: "public",
    matches: [{ exact: "/membership" }, { prefix: "/membership/" }],
    domains: ["mojoaisummits.com/membership", "mojoaisummits.com/membership/*"]
  },
  {
    id: "fellowships",
    kind: "page",
    group: "Public",
    label: "Fellowships",
    summary: "Public fellowship pathway page.",
    mode: "public",
    matches: [{ exact: "/fellowships" }, { prefix: "/fellowships/" }],
    domains: ["mojoaisummits.com/fellowships", "mojoaisummits.com/fellowships/*"]
  },
  {
    id: "partners",
    kind: "page",
    group: "Public",
    label: "Strategic Intelligence Partners",
    summary: "Public partner page for vendor leaders and strategic contributors.",
    mode: "public",
    matches: [{ exact: "/partners" }, { prefix: "/partners/" }],
    domains: ["mojoaisummits.com/partners", "mojoaisummits.com/partners/*"]
  },
  {
    id: "member-registration",
    kind: "page",
    group: "Guest",
    label: "Member Registration",
    summary: "Direct invite registration surface.",
    mode: "public",
    matches: [{ exact: "/member-registration" }, { prefix: "/member-registration/" }],
    domains: ["mojoaisummits.com/member-registration", "mojoaisummits.com/member-registration/*"]
  },
  {
    id: "guest-registration",
    kind: "page",
    group: "Guest",
    label: "Guest Registration",
    summary: "Direct guest registration surface.",
    mode: "public",
    matches: [{ exact: "/guest" }, { prefix: "/guest/" }],
    domains: ["mojoaisummits.com/guest", "mojoaisummits.com/guest/*"]
  },
  {
    id: "privacy",
    kind: "page",
    group: "Public",
    label: "Privacy",
    summary: "Public privacy policy.",
    mode: "public",
    matches: [{ exact: "/privacy" }, { prefix: "/privacy/" }],
    domains: ["mojoaisummits.com/privacy", "mojoaisummits.com/privacy/*"]
  },
  {
    id: "sms-terms",
    kind: "page",
    group: "Public",
    label: "SMS Terms",
    summary: "Public SMS consent and terms page.",
    mode: "public",
    matches: [{ exact: "/sms-terms" }, { prefix: "/sms-terms/" }],
    domains: ["mojoaisummits.com/sms-terms", "mojoaisummits.com/sms-terms/*"]
  },
  {
    id: "api-access-config",
    kind: "api",
    group: "APIs",
    label: "Access API",
    summary: "Access console configuration endpoint.",
    mode: "allowlist",
    matches: [{ exact: "/api/access-config" }, { prefix: "/api/access-config/" }],
    domains: ["mojoaisummits.com/api/access-config", "mojoaisummits.com/api/access-config/*"]
  },
  {
    id: "api-access-users",
    kind: "api",
    group: "APIs",
    label: "Access Users API",
    summary: "App-owned user database management endpoint.",
    mode: "allowlist",
    matches: [{ exact: "/api/access-users" }, { prefix: "/api/access-users/" }],
    domains: ["mojoaisummits.com/api/access-users", "mojoaisummits.com/api/access-users/*"]
  },
  {
    id: "api-access-invites",
    kind: "api",
    group: "APIs",
    label: "Access Invites API",
    summary: "Invite creation and revocation endpoint.",
    mode: "allowlist",
    matches: [{ exact: "/api/access-invites" }, { prefix: "/api/access-invites/" }],
    domains: ["mojoaisummits.com/api/access-invites", "mojoaisummits.com/api/access-invites/*"]
  },
  {
    id: "api-auth",
    kind: "api",
    group: "APIs",
    label: "Authentication API",
    summary: "Login, logout, session, and invite endpoints.",
    mode: "public",
    matches: [{ exact: "/api/auth" }, { prefix: "/api/auth/" }],
    domains: ["mojoaisummits.com/api/auth", "mojoaisummits.com/api/auth/*"]
  },
  {
    id: "api-setup-state",
    kind: "api",
    group: "APIs",
    label: "Setup State API",
    summary: "Shared checklist assignment state.",
    mode: "allowlist",
    matches: [{ exact: "/api/setup-state" }, { prefix: "/api/setup-state/" }],
    domains: ["mojoaisummits.com/api/setup-state", "mojoaisummits.com/api/setup-state/*"]
  },
  {
    id: "api-events",
    kind: "api",
    group: "APIs",
    label: "Events API",
    summary: "Event playbook creation and retrieval.",
    mode: "allowlist",
    matches: [{ exact: "/api/events" }, { prefix: "/api/events/" }],
    domains: ["mojoaisummits.com/api/events", "mojoaisummits.com/api/events/*"]
  },
  {
    id: "api-virtual-events",
    kind: "api",
    group: "APIs",
    label: "Virtual Events API",
    summary: "Public virtual event details and Zoom availability.",
    mode: "public",
    matches: [{ exact: "/api/virtual-events" }, { prefix: "/api/virtual-events/" }],
    domains: ["mojoaisummits.com/api/virtual-events", "mojoaisummits.com/api/virtual-events/*"]
  },
  {
    id: "api-scheduling-admin",
    kind: "api",
    group: "APIs",
    label: "Scheduling Admin API",
    summary: "Protected employee booking profile configuration.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/api/scheduling/admin" }, { prefix: "/api/scheduling/admin/" }],
    domains: ["mojoaisummits.com/api/scheduling/admin", "mojoaisummits.com/api/scheduling/admin/*"]
  },
  {
    id: "api-scheduling-oauth",
    kind: "api",
    group: "APIs",
    label: "Scheduling Calendar OAuth API",
    summary: "Protected authenticated calendar connection endpoints.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/api/scheduling/oauth" }, { prefix: "/api/scheduling/oauth/" }],
    domains: ["mojoaisummits.com/api/scheduling/oauth", "mojoaisummits.com/api/scheduling/oauth/*"]
  },
  {
    id: "api-scheduling-feed-diagnostics",
    kind: "api",
    group: "APIs",
    label: "Scheduling Feed Diagnostics API",
    summary: "Protected published calendar feed diagnostics for scheduling admin.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/api/scheduling/feed-diagnostics" }, { prefix: "/api/scheduling/feed-diagnostics/" }],
    domains: ["mojoaisummits.com/api/scheduling/feed-diagnostics", "mojoaisummits.com/api/scheduling/feed-diagnostics/*"]
  },
  {
    id: "api-scheduling-public",
    kind: "api",
    group: "APIs",
    label: "Scheduling Public API",
    summary: "Public employee booking, availability, and confirmation endpoints.",
    mode: "public",
    matches: [{ exact: "/api/scheduling" }, { prefix: "/api/scheduling/" }],
    domains: ["mojoaisummits.com/api/scheduling", "mojoaisummits.com/api/scheduling/*"]
  },
  {
    id: "api-scheduling-team",
    kind: "api",
    group: "APIs",
    label: "Scheduling Team API",
    summary: "Public team directory endpoint used by the booking surface.",
    mode: "public",
    matches: [{ exact: "/api/scheduling/team" }, { prefix: "/api/scheduling/team/" }],
    domains: ["mojoaisummits.com/api/scheduling/team", "mojoaisummits.com/api/scheduling/team/*"]
  },
  {
    id: "api-crm",
    kind: "api",
    group: "APIs",
    label: "CRM API",
    summary: "Protected CRM contacts, invite links, diagnostics, notes, and exports.",
    mode: "allowlist",
    defaultGroupIds: ["mojo-team"],
    matches: [{ exact: "/api/crm" }, { prefix: "/api/crm/" }],
    domains: ["mojoaisummits.com/api/crm", "mojoaisummits.com/api/crm/*"]
  },
  {
    id: "api-partner-profile",
    kind: "api",
    group: "APIs",
    label: "Partner Profile API",
    summary: "Private partner profile, event guest, publication, and sponsorship records.",
    mode: "allowlist",
    defaultGroupIds: ["partners"],
    matches: [{ exact: "/api/partner-profile" }, { prefix: "/api/partner-profile/" }],
    domains: ["mojoaisummits.com/api/partner-profile", "mojoaisummits.com/api/partner-profile/*"]
  },
  {
    id: "api-partner-registration",
    kind: "api",
    group: "APIs",
    label: "Partner Registration API",
    summary: "Public partner registration submission endpoint.",
    mode: "public",
    matches: [{ exact: "/api/partner-registration" }, { prefix: "/api/partner-registration/" }],
    domains: ["mojoaisummits.com/api/partner-registration", "mojoaisummits.com/api/partner-registration/*"]
  },
  {
    id: "api-member-profile",
    kind: "api",
    group: "APIs",
    label: "Member Profile API",
    summary: "Member-authenticated profile, directory, guest invite, and member nomination endpoint.",
    mode: "public",
    matches: [{ exact: "/api/member-profile" }, { prefix: "/api/member-profile/" }],
    domains: ["mojoaisummits.com/api/member-profile", "mojoaisummits.com/api/member-profile/*"]
  },
  {
    id: "api-forums",
    kind: "api",
    group: "APIs",
    label: "Forums API",
    summary: "Private community forum topics, replies, and moderation.",
    mode: "allowlist",
    defaultGroupIds: ["admin", "mojo-team", "guests-and-members"],
    strictGroups: true,
    matches: [{ exact: "/api/forums" }, { prefix: "/api/forums/" }],
    domains: ["mojoaisummits.com/api/forums", "mojoaisummits.com/api/forums/*"]
  },
  {
    id: "api-storage",
    kind: "api",
    group: "APIs",
    label: "Storage API",
    summary: "Private file upload, listing, and download.",
    mode: "allowlist",
    defaultGroupIds: ["storage-users"],
    matches: [{ exact: "/api/storage" }, { prefix: "/api/storage/" }],
    domains: ["mojoaisummits.com/api/storage", "mojoaisummits.com/api/storage/*"]
  },
  {
    id: "api-budget",
    kind: "api",
    group: "APIs",
    label: "Budget API",
    summary: "Budget ledger, receipt review, and exports.",
    mode: "allowlist",
    defaultGroupIds: ["admin"],
    matches: [{ exact: "/api/budget" }, { prefix: "/api/budget/" }],
    domains: ["mojoaisummits.com/api/budget", "mojoaisummits.com/api/budget/*"]
  },
  {
    id: "api-sms-notifications",
    kind: "api",
    group: "APIs",
    label: "SMS Notifications API",
    summary: "Send custom SMS notifications to verified registration phone numbers.",
    mode: "allowlist",
    defaultGroupIds: ["admin", "mojo-team"],
    strictGroups: true,
    matches: [{ exact: "/api/sms-notifications" }, { prefix: "/api/sms-notifications/" }],
    domains: ["mojoaisummits.com/api/sms-notifications", "mojoaisummits.com/api/sms-notifications/*"]
  },
  {
    id: "api-invite-request",
    kind: "api",
    group: "APIs",
    label: "Invite Request API",
    summary: "Public invite request form endpoint.",
    mode: "public",
    matches: [{ exact: "/api/invite-request" }, { prefix: "/api/invite-request/" }],
    domains: ["mojoaisummits.com/api/invite-request", "mojoaisummits.com/api/invite-request/*"]
  },
  {
    id: "api-phone-verification",
    kind: "api",
    group: "APIs",
    label: "Phone Verification API",
    summary: "Public guest phone verification endpoint.",
    mode: "public",
    matches: [{ exact: "/api/phone-verification" }, { prefix: "/api/phone-verification/" }],
    domains: ["mojoaisummits.com/api/phone-verification", "mojoaisummits.com/api/phone-verification/*"]
  },
  {
    id: "api-member-registration",
    kind: "api",
    group: "APIs",
    label: "Member Registration API",
    summary: "Public member registration submission endpoint.",
    mode: "public",
    matches: [{ exact: "/api/member-registration" }, { prefix: "/api/member-registration/" }],
    domains: ["mojoaisummits.com/api/member-registration", "mojoaisummits.com/api/member-registration/*"]
  },
  {
    id: "api-member-invite-codes",
    kind: "api",
    group: "APIs",
    label: "Member Invite Codes API",
    summary: "Public member invite-code validation endpoint used by member registration.",
    mode: "public",
    matches: [{ exact: "/api/member-invite-codes" }, { prefix: "/api/member-invite-codes/" }],
    domains: ["mojoaisummits.com/api/member-invite-codes", "mojoaisummits.com/api/member-invite-codes/*"]
  },
  {
    id: "api-guest-registration",
    kind: "api",
    group: "APIs",
    label: "Guest Registration API",
    summary: "Public guest registration submission endpoint.",
    mode: "public",
    matches: [{ exact: "/api/guest-registration" }, { prefix: "/api/guest-registration/" }],
    domains: ["mojoaisummits.com/api/guest-registration", "mojoaisummits.com/api/guest-registration/*"]
  },
  {
    id: "api-guest-invite-codes",
    kind: "api",
    group: "APIs",
    label: "Guest Invite Codes API",
    summary: "Public guest invite-code validation endpoint used by guest registration.",
    mode: "public",
    matches: [{ exact: "/api/guest-invite-codes" }, { prefix: "/api/guest-invite-codes/" }],
    domains: ["mojoaisummits.com/api/guest-invite-codes", "mojoaisummits.com/api/guest-invite-codes/*"]
  },
  {
    id: "api-partner-invite-codes",
    kind: "api",
    group: "APIs",
    label: "Partner Invite Codes API",
    summary: "Public partner invite-code validation endpoint used by partner registration.",
    mode: "public",
    matches: [{ exact: "/api/partner-invite-codes" }, { prefix: "/api/partner-invite-codes/" }],
    domains: ["mojoaisummits.com/api/partner-invite-codes", "mojoaisummits.com/api/partner-invite-codes/*"]
  },
  {
    id: "crm-api-public-member-registration",
    kind: "api",
    group: "APIs",
    label: "CRM Public Member Registration API",
    summary: "Public member invite-code validation and registration callback endpoints.",
    mode: "public",
    matches: [
      { exact: "/crm/api/public/member-registration" },
      { prefix: "/crm/api/public/member-registration/" },
      { exact: "/crm/api/public/member-invite-codes" },
      { prefix: "/crm/api/public/member-invite-codes/" }
    ],
    domains: [
      "mojoaisummits.com/crm/api/public/member-registration",
      "mojoaisummits.com/crm/api/public/member-registration/*",
      "mojoaisummits.com/crm/api/public/member-invite-codes",
      "mojoaisummits.com/crm/api/public/member-invite-codes/*"
    ]
  },
  {
    id: "crm-api-public-guest-registration",
    kind: "api",
    group: "APIs",
    label: "CRM Public Guest Registration API",
    summary: "Public guest invite-code validation and registration callback endpoints.",
    mode: "public",
    matches: [
      { exact: "/crm/api/public/guest-registration" },
      { prefix: "/crm/api/public/guest-registration/" },
      { exact: "/crm/api/public/guest-invite-codes" },
      { prefix: "/crm/api/public/guest-invite-codes/" }
    ],
    domains: [
      "mojoaisummits.com/crm/api/public/guest-registration",
      "mojoaisummits.com/crm/api/public/guest-registration/*",
      "mojoaisummits.com/crm/api/public/guest-invite-codes",
      "mojoaisummits.com/crm/api/public/guest-invite-codes/*"
    ]
  },
  {
    id: "crm-api-public-partner-registration",
    kind: "api",
    group: "APIs",
    label: "CRM Public Partner Registration API",
    summary: "Public partner invite-code validation and registration callback endpoints.",
    mode: "public",
    matches: [
      { exact: "/crm/api/public/partner-registration" },
      { prefix: "/crm/api/public/partner-registration/" },
      { exact: "/crm/api/public/partner-invite-codes" },
      { prefix: "/crm/api/public/partner-invite-codes/" }
    ],
    domains: [
      "mojoaisummits.com/crm/api/public/partner-registration",
      "mojoaisummits.com/crm/api/public/partner-registration/*",
      "mojoaisummits.com/crm/api/public/partner-invite-codes",
      "mojoaisummits.com/crm/api/public/partner-invite-codes/*"
    ]
  }
];

export const DEFAULT_ACCESS_CONFIG = {
  version: 1,
  enabled: false,
  updatedAt: null,
  updatedBy: "",
  allowedEmails: [],
  groups: DEFAULT_ACCESS_GROUPS,
  discoveredRoutes: [],
  routes: DEFAULT_ACCESS_RULES.map((rule) => ({
    id: rule.id,
    mode: rule.mode,
    allowedGroupIds: defaultGroupsForRoute(rule),
    allowedEmails: []
  }))
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

function normalizeGroupId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function uniqueValues(values) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function defaultGroupsForRoute(rule) {
  if (rule.mode === "public") return ["public"];
  if (Array.isArray(rule.defaultGroupIds) && rule.defaultGroupIds.length) return rule.defaultGroupIds;
  if (["admin", "api-access-config", "api-access-users", "api-access-invites"].includes(rule.id)) {
    return ["admin"];
  }
  return ["mojo-team"];
}

function mustRemainPublicRoute(id) {
  return ["access", "api-auth"].includes(id);
}

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanPath(value) {
  const path = String(value || "").trim();
  if (!path.startsWith("/")) return "";
  if (path === "/") return path;
  return path.endsWith("/") ? path : `${path}/`;
}

function cleanRouteId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function matchesForPath(path) {
  const clean = cleanPath(path);
  if (!clean) return [];
  if (clean === "/") return [{ exact: "/" }];
  return [{ exact: clean.replace(/\/$/, "") }, { prefix: clean }];
}

function domainsForPath(path) {
  const clean = cleanPath(path);
  if (!clean) return [];
  if (clean === "/") return ["mojoaisummits.com"];
  const withoutLeading = clean.replace(/^\//, "");
  return [`mojoaisummits.com/${withoutLeading.replace(/\/$/, "")}`, `mojoaisummits.com/${withoutLeading}*`];
}

function sanitizeDiscoveredRoutes(inputRoutes = []) {
  const defaultIds = new Set(DEFAULT_ACCESS_RULES.map((route) => route.id));
  const seenIds = new Set();
  return (Array.isArray(inputRoutes) ? inputRoutes : [])
    .filter((route) => route && typeof route === "object")
    .map((route) => {
      const path = cleanPath(route.path || route.matches?.[0]?.exact || route.matches?.[0]?.prefix);
      const id = cleanRouteId(route.id || path);
      if (!id || defaultIds.has(id) || seenIds.has(id) || !path) return null;
      seenIds.add(id);
      const mode = ACCESS_MODES.includes(route.mode) ? route.mode : "allowlist";
      return {
        id,
        kind: route.kind === "api" ? "api" : "page",
        group: cleanText(route.group || "Discovered", 80),
        label: cleanText(route.label || route.title || id, 120),
        summary: cleanText(route.summary || "Discovered from the Company Hub.", 240),
        mode,
        defaultGroupIds: sanitizeGroupIds(route.defaultGroupIds || route.allowedGroupIds || ["mojo-team"], new Set(DEFAULT_ACCESS_GROUPS.map((group) => group.id))),
        matches: matchesForPath(path),
        domains: domainsForPath(path),
        discovered: true
      };
    })
    .filter(Boolean);
}

function accessRuleDefinitions(input = {}) {
  return [...DEFAULT_ACCESS_RULES, ...sanitizeDiscoveredRoutes(input.discoveredRoutes)];
}

function sanitizeAccessGroups(inputGroups = []) {
  const incoming = new Map(
    (Array.isArray(inputGroups) ? inputGroups : [])
      .filter((group) => group && typeof group === "object")
      .map((group) => [normalizeGroupId(group.id || group.label), group])
      .filter(([id]) => id)
  );

  return DEFAULT_ACCESS_GROUPS.map((definition) => {
    const group = incoming.get(definition.id) || {};
    return {
      ...definition,
      emails: definition.id === "public" ? [] : parseAllowedEmails(group.emails)
    };
  });
}

function sanitizeGroupIds(value, validGroupIds) {
  const source = Array.isArray(value) ? value : [value];
  const ids = uniqueValues(source.map(normalizeGroupId));
  return ids.filter((id) => validGroupIds.has(id));
}

export function envAllowedEmails() {
  return [];
}

export function sanitizeAccessConfig(input = {}, actor = "") {
  const groups = sanitizeAccessGroups(input.groups);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const routeDefinitions = accessRuleDefinitions(input);
  const incomingRoutes = new Map(
    (Array.isArray(input.routes) ? input.routes : [])
      .filter((route) => route && typeof route === "object")
      .map((route) => [String(route.id || ""), route])
  );

  const routes = routeDefinitions.map((definition) => {
    if (mustRemainPublicRoute(definition.id)) {
      return {
        id: definition.id,
        mode: "public",
        allowedGroupIds: ["public"],
        allowedEmails: []
      };
    }

    const incoming = incomingRoutes.get(definition.id) || {};
    const incomingGroupIds = sanitizeGroupIds(incoming.allowedGroupIds, validGroupIds);
    const defaultGroupIds = defaultGroupsForRoute(definition);
    const locked = ["api-access-config", "api-access-users", "api-access-invites"].includes(definition.id);
    const allowedGroupIds = locked
      ? (incomingGroupIds.filter((id) => id !== "public").length ? incomingGroupIds.filter((id) => id !== "public") : ["admin"])
      : (incomingGroupIds.length ? incomingGroupIds : defaultGroupIds);
    const requestedMode = ACCESS_MODES.includes(incoming.mode) ? incoming.mode : definition.mode;
    const mode = allowedGroupIds.includes("public") ? "public" : requestedMode === "public" ? "allowlist" : requestedMode;
    return {
      id: definition.id,
      mode: locked
        ? mode === "public" ? "allowlist" : mode
        : mode,
      allowedGroupIds,
      allowedEmails: parseAllowedEmails(incoming.allowedEmails)
    };
  });

  return {
    version: 1,
    enabled: input.enabled === true,
    updatedAt: new Date().toISOString(),
    updatedBy: actor || String(input.updatedBy || ""),
    allowedEmails: parseAllowedEmails(input.allowedEmails),
    groups,
    discoveredRoutes: sanitizeDiscoveredRoutes(input.discoveredRoutes),
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
  const routeDefinitions = accessRuleDefinitions(config);
  const routeSettings = new Map((config.routes || []).map((route) => [route.id, route]));
  const groups = sanitizeAccessGroups(config.groups);
  const allowedEmails = [
    ...new Set([...parseAllowedEmails(config.allowedEmails), ...envAllowedEmails(env)])
  ];

  return {
    ...config,
    enabled: config.enabled === true,
    allowedEmails,
    envAllowedEmails: envAllowedEmails(env),
    groups,
    discoveredRoutes: sanitizeDiscoveredRoutes(config.discoveredRoutes),
    routes: routeDefinitions.map((definition) => ({
      ...definition,
      mode: mustRemainPublicRoute(definition.id)
        ? "public"
        : routeSettings.get(definition.id)?.mode || definition.mode,
      allowedGroupIds: mustRemainPublicRoute(definition.id)
        ? ["public"]
        : sanitizeGroupIds(
            routeSettings.get(definition.id)?.allowedGroupIds || defaultGroupsForRoute(definition),
            new Set(groups.map((group) => group.id))
          ),
      allowedEmails: parseAllowedEmails(routeSettings.get(definition.id)?.allowedEmails)
    }))
  };
}

export function emailsForGroups(groups = [], groupIds = []) {
  const requested = new Set((groupIds || []).map(normalizeGroupId));
  return uniqueValues(
    groups
      .filter((group) => requested.has(group.id))
      .flatMap((group) => parseAllowedEmails(group.emails))
  ).sort();
}

async function kvJson(env, key) {
  return env.MOJO_SUMMITS_SETUP_STATE?.get(key, "json").catch(() => null) || null;
}

async function keyWithEmailExists(env, prefix, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !env.MOJO_SUMMITS_SETUP_STATE?.list) return false;

  let cursor;
  do {
    const result = await env.MOJO_SUMMITS_SETUP_STATE.list({ prefix, cursor, limit: 1000 });
    for (const entry of result.keys || []) {
      const record = await kvJson(env, entry.name);
      if (String(record?.email || "").trim().toLowerCase() === normalizedEmail) return true;
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return false;
}

export async function emailHasDynamicGroupAccess(env, email, groupIds = []) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const requested = new Set((groupIds || []).map(normalizeGroupId));
  if (!normalizedEmail || !requested.has("guests-and-members")) return false;

  if (await kvJson(env, `crm:contact:${normalizedEmail}`)) return true;

  const prefixes = [
    "crm:member-registrant:",
    "member-registration:",
    "crm:guest-registrant:",
    "guest-registration:",
    "crm:partner-registrant:",
    "partner-registration:"
  ];

  for (const prefix of prefixes) {
    if (await keyWithEmailExists(env, prefix, normalizedEmail)) return true;
  }

  return false;
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

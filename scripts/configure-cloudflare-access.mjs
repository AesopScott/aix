const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const allowedEmails = String(process.env.MOJO_ACCESS_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const apps = [
  {
    name: "Mojo AI Summits Storage Portal",
    domain: "mojoaisummits.com/storage/*"
  },
  {
    name: "Mojo AI Summits Storage API",
    domain: "mojoaisummits.com/api/storage"
  },
  {
    name: "Mojo AI Summits Storage API Children",
    domain: "mojoaisummits.com/api/storage/*"
  }
];

function appPayload(app) {
  return {
    name: app.name,
    domain: app.domain,
    type: "self_hosted",
    session_duration: "24h",
    auto_redirect_to_identity: false,
    policies: [allowPolicyFor(app.name)]
  };
}

if (!accountId || !token) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
}

if (allowedEmails.length === 0) {
  throw new Error("MOJO_ACCESS_ALLOWED_EMAILS must contain at least one email address.");
}

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/access`;

async function cloudflare(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    const details = Array.isArray(body.errors)
      ? body.errors.map((error) => `${error.code}: ${error.message}`).join("; ")
      : response.statusText;
    throw new Error(`Cloudflare API failed for ${path}: ${details}`);
  }

  return body.result;
}

function allowPolicyFor(name) {
  return {
    name: `${name} - allowed users`,
    decision: "allow",
    precedence: 1,
    include: allowedEmails.map((email) => ({ email: { email } }))
  };
}

async function listApplications() {
  const result = await cloudflare("/apps");
  return Array.isArray(result) ? result : result?.result || [];
}

async function listIdentityProviders() {
  const result = await cloudflare("/identity_providers");
  return Array.isArray(result) ? result : result?.result || [];
}

async function ensureOneTimePinIdentityProvider(existingProviders) {
  const existing = existingProviders.find((provider) => provider.type === "onetimepin");
  if (existing) {
    console.log(`Exists: ${existing.name} identity provider`);
    return existing;
  }

  const created = await cloudflare("/identity_providers", {
    method: "POST",
    body: JSON.stringify({
      name: "One-time PIN login",
      type: "onetimepin",
      config: {}
    })
  });

  console.log("Created: One-time PIN login identity provider");
  return created;
}

async function ensureApplication(app, existingApps) {
  const existing = existingApps.find((item) => item.domain === app.domain || item.name === app.name);
  if (existing) {
    const updated = await cloudflare(`/apps/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(appPayload(app))
    });

    console.log(`Updated: ${app.name} (${app.domain})`);
    return updated;
  }

  const created = await cloudflare("/apps", {
    method: "POST",
    body: JSON.stringify(appPayload(app))
  });

  console.log(`Created: ${app.name} (${app.domain})`);
  return created;
}

const existingProviders = await listIdentityProviders();
await ensureOneTimePinIdentityProvider(existingProviders);

const existingApps = await listApplications();
for (const app of apps) {
  await ensureApplication(app, existingApps);
}

console.log(`Allowed emails: ${allowedEmails.join(", ")}`);

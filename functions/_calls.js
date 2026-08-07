const CALLS_API_BASE = "https://rtc.live.cloudflare.com/v1";

export class CallsConfigError extends Error {}

export function callsConfig(env) {
  const appId = env.CF_CALLS_APP_ID;
  const appSecret = env.CF_CALLS_APP_SECRET;
  if (!appId || !appSecret) {
    throw new CallsConfigError("Cloudflare Calls is not configured (CF_CALLS_APP_ID / CF_CALLS_APP_SECRET).");
  }
  return { appId, appSecret };
}

export async function callsFetch(env, path, body) {
  const { appId, appSecret } = callsConfig(env);
  const res = await fetch(`${CALLS_API_BASE}/apps/${appId}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${appSecret}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.errorDescription || data?.error || res.statusText;
    throw new Error(`Cloudflare Calls request failed (${res.status}): ${detail}`);
  }
  return data;
}

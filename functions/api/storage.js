const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const folderLabels = {
  private: "Private company records",
  "event-assets": "Event assets",
  media: "Media",
  "public-assets": "Public assets",
  archive: "Archive"
};

const allowedFolders = new Set(Object.keys(folderLabels));

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function parseAllowedEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function requireStorageAccess(request, env) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email") || "";
  const allowedEmails = parseAllowedEmails(env.MOJO_STORAGE_ALLOWED_EMAILS);
  const openForLocalDev = env.MOJO_STORAGE_ALLOW_OPEN === "true";

  if (!email && openForLocalDev) {
    return { email: "local-dev@mojoaisummits.com" };
  }

  if (!email) {
    return {
      response: json(
        {
          error:
            "Storage is locked until Cloudflare Access is configured for this route."
        },
        { status: 403 }
      )
    };
  }

  const normalizedEmail = email.toLowerCase();
  if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
    return {
      response: json({ error: "This account is not approved for storage access." }, { status: 403 })
    };
  }

  return { email: normalizedEmail };
}

function requireBucket(env) {
  return env.MOJO_SUMMITS_STORAGE
    ? null
    : json({ error: "R2 storage bucket binding is not configured." }, { status: 500 });
}

function safeSegment(value, fallback) {
  const clean = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);

  return clean || fallback;
}

function safeKey(value) {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!key || key.includes("..") || key.includes("\\") || key.length > 1024) return "";
  return key;
}

function objectToRecord(object) {
  return {
    key: object.key,
    size: object.size,
    uploaded: object.uploaded ? object.uploaded.toISOString() : "",
    etag: object.etag || "",
    httpEtag: object.httpEtag || "",
    checksums: object.checksums || null
  };
}

function safeDownloadName(key) {
  return (key.split("/").pop() || "download").replace(/["\r\n]/g, "");
}

async function listObjects(request, env) {
  const url = new URL(request.url);
  const rawPrefix = safeKey(url.searchParams.get("prefix") || "");
  const prefix = rawPrefix === "all" ? "" : rawPrefix;
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);

  const result = await env.MOJO_SUMMITS_STORAGE.list({
    prefix,
    cursor,
    limit
  });

  return json({
    objects: result.objects.map(objectToRecord),
    truncated: result.truncated,
    cursor: result.cursor || "",
    folders: folderLabels
  });
}

async function downloadObject(request, env) {
  const url = new URL(request.url);
  const key = safeKey(url.searchParams.get("key"));
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });

  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  const headers = new Headers();
  headers.set("cache-control", "private, no-store");
  headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("content-disposition", `attachment; filename="${safeDownloadName(key)}"`);
  if (object.size) headers.set("content-length", String(object.size));
  if (object.httpEtag) headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
}

export async function onRequestGet({ request, env }) {
  const access = requireStorageAccess(request, env);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  if (url.searchParams.has("key")) return downloadObject(request, env);

  return listObjects(request, env);
}

export async function onRequestPost({ request, env }) {
  const access = requireStorageAccess(request, env);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file.name !== "string" || typeof file.stream !== "function") {
    return json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const area = allowedFolders.has(String(form.get("area") || ""))
    ? String(form.get("area"))
    : "private";
  const event = safeSegment(form.get("event"), "company");
  const originalName = safeSegment(file.name, "file");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = crypto.randomUUID().slice(0, 8);
  const key = `${area}/${event}/${stamp}-${id}-${originalName}`;

  await env.MOJO_SUMMITS_STORAGE.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
    },
    customMetadata: {
      uploadedBy: access.email,
      originalName: file.name,
      area,
      event
    }
  });

  return json({ ok: true, key });
}

export async function onRequestDelete({ request, env }) {
  const access = requireStorageAccess(request, env);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  const key = safeKey(url.searchParams.get("key"));
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });

  await env.MOJO_SUMMITS_STORAGE.delete(key);
  return json({ ok: true, key });
}

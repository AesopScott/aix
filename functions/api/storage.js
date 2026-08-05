import { canManageAccess } from "../_auth.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const folderLabels = {
  private: "Private company records",
  "event-assets": "Event assets",
  media: "Media",
  "public-assets": "Public assets",
  partners: "Partners",
  membership: "Membership",
  marketing: "Marketing",
  receipts: "Receipts",
  archive: "Archive"
};

const allowedFolders = new Set(Object.keys(folderLabels));
const receiptOwners = new Set(["scott", "jodi", "robert", "ron", "angel", "charlie"]);
const receiptEvents = {
  global: "Global",
  dallas: "Dallas",
  denver: "Denver",
  raleigh: "Raleigh",
  chicago: "Chicago"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function requireStorageAccess(data = {}) {
  if (data?.auth?.email) return { ...data.auth, email: data.auth.email };
  if (data?.auth?.mode === "public") return { email: "public@mojoaisummits.com", role: "public" };

  return {
    response: json({ error: "Sign in with a Mojo AI Summits account to use storage." }, { status: 401 })
  };
}

function privateAccessError() {
  return json({ error: "Private company records are limited to admins." }, { status: 403 });
}

function isAdminAccess(access) {
  return canManageAccess(access);
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

function isPrivateKey(key) {
  const value = String(key || "");
  return value === "private" || value.startsWith("private/");
}

function displayNameFromKey(key) {
  return safeDownloadName(key).replace(
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}-/i,
    ""
  );
}

function objectToRecord(object) {
  const originalName = object.customMetadata?.originalName || displayNameFromKey(object.key);

  return {
    key: object.key,
    name: originalName,
    area: object.customMetadata?.area || "",
    event: object.customMetadata?.event || "",
    receiptOwner: object.customMetadata?.receiptOwner || "",
    receiptEvent: object.customMetadata?.receiptEvent || "",
    submitter: object.customMetadata?.uploadedBy || object.customMetadata?.submitter || "",
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

function safeOriginalName(value) {
  return (String(value || "").trim().replace(/["\r\n\\/]/g, "") || "download").slice(0, 180);
}

function splitKey(key) {
  const parts = String(key || "").split("/");
  const fileName = parts.pop() || "";
  return {
    directory: parts.length ? `${parts.join("/")}/` : "",
    fileName
  };
}

function generatedNamePrefix(fileName) {
  return fileName.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}-/i)?.[0] || "";
}

function cleanSearch(value) {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

function recordSearchText(record) {
  return [
    record.key,
    record.name,
    record.area,
    record.event,
    record.receiptOwner,
    record.receiptEvent
  ].join(" ").toLowerCase();
}

async function listObjects(request, env, access) {
  const url = new URL(request.url);
  const rawPrefix = safeKey(url.searchParams.get("prefix") || "");
  const prefix = rawPrefix === "all" ? "" : rawPrefix;
  const canReadPrivate = isAdminAccess(access);
  if (isPrivateKey(prefix) && !canReadPrivate) return privateAccessError();

  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 500);
  const search = cleanSearch(url.searchParams.get("search"));
  const objects = [];
  let nextCursor = cursor;
  let truncated = false;

  do {
    const result = await env.MOJO_SUMMITS_STORAGE.list({
      prefix,
      cursor: nextCursor,
      limit
    });
    const records = result.objects
      .map(objectToRecord)
      .filter((record) => canReadPrivate || !isPrivateKey(record.key));
    objects.push(
      ...(
        search
          ? records.filter((record) => recordSearchText(record).includes(search))
          : records
      )
    );
    nextCursor = result.truncated ? result.cursor : undefined;
    truncated = Boolean(result.truncated);
  } while (search && truncated && objects.length < limit);

  return json({
    objects: objects.slice(0, limit),
    truncated,
    cursor: nextCursor || "",
    folders: folderLabels
  });
}

async function downloadObject(request, env, access) {
  const url = new URL(request.url);
  const key = safeKey(url.searchParams.get("key"));
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });
  if (isPrivateKey(key) && !isAdminAccess(access)) return privateAccessError();

  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  const disposition = url.searchParams.get("view") === "1" ? "inline" : "attachment";
  const headers = new Headers();
  headers.set("cache-control", "private, no-store");
  headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("content-disposition", `${disposition}; filename="${safeOriginalName(object.customMetadata?.originalName || displayNameFromKey(key))}"`);
  if (object.size) headers.set("content-length", String(object.size));
  if (object.httpEtag) headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
}

async function renameObject(request, env, access) {
  const payload = await request.json().catch(() => null);
  const key = safeKey(payload?.key);
  const requestedName = safeOriginalName(payload?.name);
  const keyName = safeSegment(requestedName, "file");
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });
  if (isPrivateKey(key) && !isAdminAccess(access)) return privateAccessError();
  if (!requestedName || requestedName === "download") {
    return json({ error: "Enter a file name." }, { status: 400 });
  }

  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  const { directory, fileName } = splitKey(key);
  const nextKey = safeKey(`${directory}${generatedNamePrefix(fileName)}${keyName}`);
  if (!nextKey) return json({ error: "Enter a valid file name." }, { status: 400 });

  if (nextKey === key) {
    await env.MOJO_SUMMITS_STORAGE.put(key, object.body, {
      httpMetadata: object.httpMetadata,
      customMetadata: {
        ...(object.customMetadata || {}),
        originalName: requestedName,
        renamedBy: access.email,
        renamedAt: new Date().toISOString()
      }
    });
    return json({ ok: true, key, previousKey: key, name: requestedName });
  }

  const existing = await env.MOJO_SUMMITS_STORAGE.head(nextKey);
  if (existing) return json({ error: "A file with that name already exists in this folder." }, { status: 409 });

  await env.MOJO_SUMMITS_STORAGE.put(nextKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: {
      ...(object.customMetadata || {}),
      originalName: requestedName,
      renamedFrom: key,
      renamedBy: access.email,
      renamedAt: new Date().toISOString()
    }
  });
  await env.MOJO_SUMMITS_STORAGE.delete(key);

  return json({ ok: true, key: nextKey, previousKey: key, name: requestedName });
}

export async function onRequestGet({ request, env, data }) {
  const access = requireStorageAccess(data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  if (url.searchParams.has("key")) return downloadObject(request, env, access);

  return listObjects(request, env, access);
}

export async function onRequestPost({ request, env, data }) {
  const access = requireStorageAccess(data);
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
  if (area === "private" && !isAdminAccess(access)) return privateAccessError();

  const rawReceiptOwner = String(form.get("receiptOwner") || "").toLowerCase();
  const receiptOwner = receiptOwners.has(rawReceiptOwner) ? rawReceiptOwner : "";
  const rawReceiptEvent = String(form.get("receiptEvent") || "").toLowerCase();
  const receiptEventKey = Object.prototype.hasOwnProperty.call(receiptEvents, rawReceiptEvent)
    ? rawReceiptEvent
    : "";
  const receiptEvent = receiptEventKey ? receiptEvents[receiptEventKey] : "";
  const event = area === "receipts" ? receiptOwner || "unassigned" : safeSegment(form.get("event"), "company");
  const trackedEvent = area === "receipts" ? receiptEvent : event;
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
      event: trackedEvent,
      receiptOwner,
      receiptEvent,
      receiptEventKey
    }
  });

  return json({ ok: true, key, name: file.name });
}

export async function onRequestDelete({ request, env, data }) {
  const access = requireStorageAccess(data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  const key = safeKey(url.searchParams.get("key"));
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });
  if (isPrivateKey(key) && !isAdminAccess(access)) return privateAccessError();

  await env.MOJO_SUMMITS_STORAGE.delete(key);
  return json({ ok: true, key });
}

export async function onRequestPatch({ request, env, data }) {
  const access = requireStorageAccess(data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  return renameObject(request, env, access);
}

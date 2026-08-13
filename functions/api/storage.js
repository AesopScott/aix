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
  archive: "Archive",
  "leadership-os": "Leadership OS",
  templates: "Templates",
  legal: "Legal",
  finance: "Finance",
  crm: "CRM",
  programming: "Programming",
  operations: "Operations"
};

const allowedFolders = new Set(Object.keys(folderLabels));
const receiptOwners = new Set(["scott", "jodi", "robert", "ron", "angel", "charlie"]);
const receiptEvents = {
  global: "Global",
  dallas: "Dallas",
  denver: "Denver",
  raleigh: "Raleigh",
  chicago: "Chicago",
  virtual: "Virtual"
};

const fileStatuses = {
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  active: "Active",
  superseded: "Superseded",
  archived: "Archived",
  paid: "Paid",
  due: "Due"
};

const allowedStatuses = new Set(Object.keys(fileStatuses));
const DEFAULT_STATUS = "draft";
const FOLDER_MARKER_NAME = ".folder";
const MULTIPART_PART_SIZE = 16 * 1024 * 1024;

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

function safeFolderPath(value) {
  const clean = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => safeSegment(part, ""))
    .filter(Boolean)
    .join("/")
    .slice(0, 200);

  return clean;
}

function isFolderMarkerKey(key) {
  return String(key || "").split("/").pop() === FOLDER_MARKER_NAME;
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

function metadataText(metadata = {}, ...keys) {
  for (const key of keys) {
    const value = String(metadata?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function normalizedReceiptEvent(metadata = {}) {
  const eventKey = String(metadata.receiptEventKey || "").trim().toLowerCase();
  const event = String(metadata.receiptEvent || metadata.event || "").trim();
  if (eventKey && receiptEvents[eventKey]) return receiptEvents[eventKey];
  if (!event || event.toLowerCase() === "global") return receiptEvents.global;
  return event;
}

function normalizedEvent(object) {
  const metadata = object.customMetadata || {};
  const receiptArea = metadata.area === "receipts" || String(object.key || "").startsWith("receipts/");
  if (receiptArea) return normalizedReceiptEvent(metadata);

  const event = String(metadata.event || "").trim();
  if (!event || event.toLowerCase() === "global") return receiptEvents.global;
  return event;
}

function isSystemSubmitter(value) {
  return /^(budget|crm)\s+automation$/i.test(String(value || "").trim());
}

function submitterForAccess(access = {}) {
  return String(access.name || access.email || "").trim();
}

function submitterFromObject(object) {
  const metadata = object.customMetadata || {};
  const submitterFields = [
    "submitter",
    "submittedBy",
    "uploadedBy",
    "createdBy",
    "reviewedBy",
    "updatedBy",
    "statusUpdatedBy"
  ];

  for (const field of submitterFields) {
    const submitter = metadataText(metadata, field);
    if (submitter && !isSystemSubmitter(submitter)) return submitter;
  }

  return "";
}

function shouldBackfillSubmitter(metadata = {}, submitter = "") {
  if (!submitter) return false;
  return (
    !metadata.uploadedBy ||
    !metadata.submittedBy ||
    !metadata.submitter ||
    isSystemSubmitter(metadata.uploadedBy) ||
    isSystemSubmitter(metadata.submittedBy) ||
    isSystemSubmitter(metadata.submitter)
  );
}

function objectToRecord(object) {
  const originalName = object.customMetadata?.originalName || displayNameFromKey(object.key);
  const event = normalizedEvent(object);

  return {
    key: object.key,
    name: originalName,
    area: object.customMetadata?.area || "",
    event,
    receiptOwner: object.customMetadata?.receiptOwner || "",
    receiptEvent: event,
    receiptDescription: object.customMetadata?.receiptDescription || "",
    status: object.customMetadata?.status || DEFAULT_STATUS,
    submitter: submitterFromObject(object),
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
    record.receiptEvent,
    record.receiptDescription,
    record.submitter,
    record.status
  ].join(" ").toLowerCase();
}

function buildUploadPlan(form, access, fileName, fileType = "") {
  if (!fileName) {
    return {
      response: json({ error: "Choose a file to upload." }, { status: 400 })
    };
  }

  const area = allowedFolders.has(String(form.get("area") || ""))
    ? String(form.get("area"))
    : "private";
  if (area === "private" && !isAdminAccess(access)) {
    return { response: privateAccessError() };
  }

  const rawReceiptOwner = String(form.get("receiptOwner") || "").toLowerCase();
  const receiptOwner = receiptOwners.has(rawReceiptOwner) ? rawReceiptOwner : "";
  const rawReceiptEvent = String(form.get("receiptEvent") || "global").toLowerCase();
  const receiptEventKey = Object.prototype.hasOwnProperty.call(receiptEvents, rawReceiptEvent)
    ? rawReceiptEvent
    : "";
  const receiptEvent = receiptEventKey ? receiptEvents[receiptEventKey] : "";
  const receiptDescription = String(form.get("receiptDescription") || "").trim().slice(0, 500);
  if (area === "receipts" && !receiptDescription) {
    return {
      response: json({ error: "Enter a receipt description." }, { status: 400 })
    };
  }

  const rawStatus = String(form.get("status") || "").toLowerCase();
  const status = allowedStatuses.has(rawStatus) ? rawStatus : DEFAULT_STATUS;
  const folder = safeFolderPath(form.get("folder"));
  const event = area === "receipts"
    ? receiptOwner || "unassigned"
    : folder || safeFolderPath(form.get("event")) || "company";
  const trackedEvent = area === "receipts" ? receiptEvent : event;
  const originalName = safeSegment(fileName, "file");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = crypto.randomUUID().slice(0, 8);
  const key = `${area}/${event}/${stamp}-${id}-${originalName}`;
  const submitter = submitterForAccess(access);

  return {
    key,
    name: safeOriginalName(fileName),
    status,
    httpMetadata: {
      contentType: fileType || "application/octet-stream"
    },
    customMetadata: {
      uploadedBy: access.email,
      submittedBy: submitter,
      submitter,
      originalName: safeOriginalName(fileName),
      area,
      event: trackedEvent,
      receiptOwner,
      receiptEvent,
      receiptEventKey,
      receiptDescription,
      status
    }
  };
}

async function listFolders(request, env, access) {
  const url = new URL(request.url);
  const rawPrefix = safeKey(url.searchParams.get("prefix") || "");
  const prefix = rawPrefix === "all" ? "" : rawPrefix;
  if (!prefix) return json({ folders: [] });
  if (isPrivateKey(prefix) && !isAdminAccess(access)) return privateAccessError();

  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix: normalizedPrefix, delimiter: "/" });
  const folders = (result.delimitedPrefixes || [])
    .map((entry) => entry.slice(normalizedPrefix.length).replace(/\/$/, ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return json({ folders });
}

async function createFolder(request, env, access, form) {
  const area = allowedFolders.has(String(form.get("area") || "")) ? String(form.get("area")) : "";
  if (!area) return json({ error: "Choose a storage area." }, { status: 400 });
  if (area === "private" && !isAdminAccess(access)) return privateAccessError();

  const folderPath = safeFolderPath(form.get("folder"));
  if (!folderPath) return json({ error: "Enter a folder name." }, { status: 400 });

  const markerKey = `${area}/${folderPath}/${FOLDER_MARKER_NAME}`;
  await env.MOJO_SUMMITS_STORAGE.put(markerKey, new Uint8Array(), {
    customMetadata: {
      area,
      folderMarker: "true",
      createdBy: access.email,
      createdAt: new Date().toISOString()
    }
  });

  return json({ ok: true, area, folder: folderPath });
}

async function createMultipartUpload(request, env, access, form) {
  if (typeof env.MOJO_SUMMITS_STORAGE.createMultipartUpload !== "function") {
    return json({ error: "R2 multipart uploads are not available in this runtime." }, { status: 500 });
  }

  const fileName = String(form.get("fileName") || "").trim();
  const plan = buildUploadPlan(
    form,
    access,
    fileName,
    String(form.get("fileType") || "")
  );
  if (plan.response) return plan.response;

  const multipartUpload = await env.MOJO_SUMMITS_STORAGE.createMultipartUpload(plan.key, {
    httpMetadata: plan.httpMetadata,
    customMetadata: plan.customMetadata
  });

  return json({
    ok: true,
    key: multipartUpload.key,
    uploadId: multipartUpload.uploadId,
    name: plan.name,
    status: plan.status,
    partSize: MULTIPART_PART_SIZE
  });
}

function multipartParams(request, access) {
  const url = new URL(request.url);
  const key = safeKey(url.searchParams.get("key"));
  const uploadId = String(url.searchParams.get("uploadId") || "").trim();
  if (!key) return { response: json({ error: "Expected a file key." }, { status: 400 }) };
  if (isPrivateKey(key) && !isAdminAccess(access)) return { response: privateAccessError() };
  if (!uploadId) return { response: json({ error: "Expected a multipart upload id." }, { status: 400 }) };
  return { key, uploadId, url };
}

async function uploadMultipartPart(request, env, access) {
  const params = multipartParams(request, access);
  if (params.response) return params.response;

  const partNumber = Number(params.url.searchParams.get("partNumber"));
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return json({ error: "Expected a valid multipart part number." }, { status: 400 });
  }
  if (!request.body) return json({ error: "Expected a multipart part body." }, { status: 400 });

  const multipartUpload = env.MOJO_SUMMITS_STORAGE.resumeMultipartUpload(params.key, params.uploadId);
  const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);
  return json(uploadedPart);
}

async function completeMultipartUpload(request, env, access) {
  const params = multipartParams(request, access);
  if (params.response) return params.response;

  const payload = await request.json().catch(() => null);
  const parts = Array.isArray(payload?.parts)
    ? payload.parts
        .map((part) => ({
          partNumber: Number(part.partNumber),
          etag: String(part.etag || "")
        }))
        .filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 && part.etag)
        .sort((a, b) => a.partNumber - b.partNumber)
    : [];

  if (!parts.length) return json({ error: "Expected uploaded multipart parts." }, { status: 400 });

  const multipartUpload = env.MOJO_SUMMITS_STORAGE.resumeMultipartUpload(params.key, params.uploadId);
  const object = await multipartUpload.complete(parts);
  return json({ ok: true, key: params.key, etag: object.httpEtag || object.etag || "" });
}

async function abortMultipartUpload(request, env, access) {
  const params = multipartParams(request, access);
  if (params.response) return params.response;

  const multipartUpload = env.MOJO_SUMMITS_STORAGE.resumeMultipartUpload(params.key, params.uploadId);
  await multipartUpload.abort();
  return json({ ok: true, key: params.key });
}

async function backfillSubmitters(request, env, access, form) {
  if (!isAdminAccess(access)) return privateAccessError();

  const rawPrefix = safeKey(form.get("prefix") || "");
  const prefix = rawPrefix === "all" ? "" : rawPrefix;
  const cursor = String(form.get("cursor") || "") || undefined;
  const limit = Math.min(Math.max(Number(form.get("limit") || 20), 1), 50);
  const now = new Date().toISOString();
  const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit });
  const summary = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    unknown: 0,
    failed: 0,
    failures: []
  };

  for (const object of result.objects || []) {
    if (isFolderMarkerKey(object.key)) {
      summary.skipped += 1;
      continue;
    }

    summary.scanned += 1;
    const metadata = object.customMetadata || {};
    const submitter = submitterFromObject(object);

    if (!submitter) {
      summary.unknown += 1;
      continue;
    }

    if (!shouldBackfillSubmitter(metadata, submitter)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key);
      if (!stored) {
        summary.failed += 1;
        summary.failures.push({ key: object.key, error: "File not found." });
        continue;
      }

      await env.MOJO_SUMMITS_STORAGE.put(object.key, stored.body, {
        httpMetadata: stored.httpMetadata || object.httpMetadata,
        customMetadata: {
          ...metadata,
          uploadedBy: metadata.uploadedBy && !isSystemSubmitter(metadata.uploadedBy) ? metadata.uploadedBy : submitter,
          submittedBy: metadata.submittedBy && !isSystemSubmitter(metadata.submittedBy) ? metadata.submittedBy : submitter,
          submitter: metadata.submitter && !isSystemSubmitter(metadata.submitter) ? metadata.submitter : submitter,
          submitterBackfilledBy: access.email,
          submitterBackfilledAt: now
        }
      });
      summary.updated += 1;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({
        key: object.key,
        error: error?.message || "Backfill failed."
      });
    }
  }

  return json({
    ok: summary.failed === 0,
    ...summary,
    truncated: Boolean(result.truncated),
    cursor: result.truncated ? result.cursor || "" : ""
  });
}

async function listObjects(request, env, access) {
  const url = new URL(request.url);
  const rawPrefix = safeKey(url.searchParams.get("prefix") || "");
  const areaPrefix = rawPrefix === "all" ? "" : rawPrefix;
  const folder = safeFolderPath(url.searchParams.get("folder") || "");
  const prefix = folder
    ? `${areaPrefix.endsWith("/") ? areaPrefix : `${areaPrefix}/`}${folder}/`
    : areaPrefix;
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
      .filter((object) => !isFolderMarkerKey(object.key))
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
    folders: folderLabels,
    statuses: fileStatuses
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

async function updateObject(request, env, access) {
  const payload = await request.json().catch(() => null);
  const key = safeKey(payload?.key);
  if (!key) return json({ error: "Expected a file key." }, { status: 400 });
  if (isPrivateKey(key) && !isAdminAccess(access)) return privateAccessError();

  const hasName = Object.prototype.hasOwnProperty.call(payload || {}, "name");
  const hasStatus = Object.prototype.hasOwnProperty.call(payload || {}, "status");
  if (!hasName && !hasStatus) {
    return json({ error: "Nothing to update." }, { status: 400 });
  }

  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "File not found." }, { status: 404 });

  let status = object.customMetadata?.status || DEFAULT_STATUS;
  if (hasStatus) {
    const rawStatus = String(payload.status || "").toLowerCase();
    if (!allowedStatuses.has(rawStatus)) {
      return json({ error: "Enter a valid status." }, { status: 400 });
    }
    status = rawStatus;
  }

  if (!hasName) {
    await env.MOJO_SUMMITS_STORAGE.put(key, object.body, {
      httpMetadata: object.httpMetadata,
      customMetadata: {
        ...(object.customMetadata || {}),
        status,
        statusUpdatedBy: access.email,
        statusUpdatedAt: new Date().toISOString()
      }
    });
    return json({ ok: true, key, status });
  }

  const requestedName = safeOriginalName(payload?.name);
  const keyName = safeSegment(requestedName, "file");
  if (!requestedName || requestedName === "download") {
    return json({ error: "Enter a file name." }, { status: 400 });
  }

  const { directory, fileName } = splitKey(key);
  const nextKey = safeKey(`${directory}${generatedNamePrefix(fileName)}${keyName}`);
  if (!nextKey) return json({ error: "Enter a valid file name." }, { status: 400 });

  if (nextKey === key) {
    await env.MOJO_SUMMITS_STORAGE.put(key, object.body, {
      httpMetadata: object.httpMetadata,
      customMetadata: {
        ...(object.customMetadata || {}),
        originalName: requestedName,
        status,
        renamedBy: access.email,
        renamedAt: new Date().toISOString()
      }
    });
    return json({ ok: true, key, previousKey: key, name: requestedName, status });
  }

  const existing = await env.MOJO_SUMMITS_STORAGE.head(nextKey);
  if (existing) return json({ error: "A file with that name already exists in this folder." }, { status: 409 });

  await env.MOJO_SUMMITS_STORAGE.put(nextKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: {
      ...(object.customMetadata || {}),
      originalName: requestedName,
      status,
      renamedFrom: key,
      renamedBy: access.email,
      renamedAt: new Date().toISOString()
    }
  });
  await env.MOJO_SUMMITS_STORAGE.delete(key);

  return json({ ok: true, key: nextKey, previousKey: key, name: requestedName, status });
}

export async function onRequestGet({ request, env, data }) {
  const access = requireStorageAccess(data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  if (url.searchParams.has("key")) return downloadObject(request, env, access);
  if (url.searchParams.get("mode") === "folders") return listFolders(request, env, access);

  return listObjects(request, env, access);
}

export async function onRequestPost({ request, env, data }) {
  const access = requireStorageAccess(data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  if (url.searchParams.get("mode") === "multipart-part") {
    return uploadMultipartPart(request, env, access);
  }
  if (url.searchParams.get("mode") === "multipart-complete") {
    return completeMultipartUpload(request, env, access);
  }
  if (url.searchParams.get("mode") === "multipart-abort") {
    return abortMultipartUpload(request, env, access);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "Expected form data." }, { status: 400 });

  if (form.get("mode") === "folder") return createFolder(request, env, access, form);
  if (form.get("mode") === "multipart-create") return createMultipartUpload(request, env, access, form);
  if (form.get("mode") === "backfill-submitters") return backfillSubmitters(request, env, access, form);

  const file = form.get("file");

  if (!file || typeof file.name !== "string" || typeof file.stream !== "function") {
    return json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const plan = buildUploadPlan(form, access, file.name, file.type || "");
  if (plan.response) return plan.response;

  await env.MOJO_SUMMITS_STORAGE.put(plan.key, file.stream(), {
    httpMetadata: plan.httpMetadata,
    customMetadata: plan.customMetadata
  });

  return json({ ok: true, key: plan.key, name: plan.name, status: plan.status });
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

  return updateObject(request, env, access);
}

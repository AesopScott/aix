const LEDGER_KEY = "budget/receipt-ledger.json";
const REVIEW_PREFIX = "budget/reviews/";
const MAX_EXTRACTIONS_PER_SYNC = 5;
const MAX_EXTRACTABLE_BYTES = 12 * 1024 * 1024;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const receiptOwners = new Set(["scott", "jodi", "robert", "ron", "angel", "charlie", "unassigned"]);
const receiptEvents = new Set(["Global", "Dallas", "Denver", "Raleigh", "Chicago"]);
const allowedStatuses = new Set([
  "needs-review",
  "needs-info",
  "approved",
  "ready-for-reimbursement",
  "reimbursed",
  "reconciled",
  "excluded",
  "reviewed"
]);
const taxCategories = new Set([
  "Unassigned",
  "Advertising and marketing",
  "Meals and entertainment",
  "Travel",
  "Lodging",
  "Venue and event costs",
  "Software and subscriptions",
  "Professional services",
  "Contract labor",
  "Office and administrative",
  "Taxes and licenses",
  "Other"
]);

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
  const authorizationCookieEmail = emailFromAccessJwt(cookies.CF_Authorization);
  if (authorizationCookieEmail) return authorizationCookieEmail;

  const host = new URL(request.url).hostname.toLowerCase();
  const hasAccessCookie = Boolean(cookies.CF_Authorization || cookies.CF_AppSession);
  if (host === "mojoaisummits.com" && hasAccessCookie) {
    return "cloudflare-access-session@mojoaisummits.com";
  }

  return "";
}

function requireBudgetAccess(request, env, data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };

  const email = accessSessionEmail(request);
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
            "Budget is locked until Cloudflare Access is configured for this route."
        },
        { status: 403 }
      )
    };
  }

  const normalizedEmail = email.toLowerCase();
  if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
    return {
      response: json({ error: "This account is not approved for budget access." }, { status: 403 })
    };
  }

  return { email: normalizedEmail };
}

function requireBucket(env) {
  return env.MOJO_SUMMITS_STORAGE
    ? null
    : json({ error: "R2 storage bucket binding is not configured." }, { status: 500 });
}

function displayNameFromKey(key) {
  return (key.split("/").pop() || "receipt").replace(
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}-/i,
    ""
  );
}

function titleFromFilename(name) {
  return String(name || "")
    .replace(/\.[a-z0-9]{2,8}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferAmountFromName(name) {
  const text = String(name || "");
  const match = text.match(/(?:\$|usd[\s_-]*)(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function textFromMarkdownResult(result) {
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    return result
      .map((entry) => entry?.data || entry?.text || entry?.markdown || entry?.content || "")
      .join("\n\n")
      .trim();
  }
  if (result && typeof result === "object") {
    return result.data || result.text || result.markdown || result.content || "";
  }
  return "";
}

function cleanMarkdownText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseIsoDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return "";
  if (y < 2020 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseReceiptDate(text) {
  const source = String(text || "");
  const monthNames = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
  };
  const candidates = [];

  for (const line of source.split("\n")) {
    const weight = /date|paid|purchase|transaction|order|invoice/i.test(line) ? 0 : 1;
    const iso = line.match(/\b(20[2-3]\d)[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])\b/);
    if (iso) candidates.push({ date: parseIsoDateParts(iso[1], iso[2], iso[3]), weight });

    const slash = line.match(/\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-]((?:20)?[2-3]\d)\b/);
    if (slash) {
      const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
      candidates.push({ date: parseIsoDateParts(year, slash[1], slash[2]), weight });
    }

    const named = line.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+([0-3]?\d)(?:st|nd|rd|th)?[,]?\s+(20[2-3]\d)\b/i
    );
    if (named) {
      const month = monthNames[named[1].toLowerCase().replace(/\.$/, "")];
      candidates.push({ date: parseIsoDateParts(named[3], month, named[2]), weight });
    }
  }

  return candidates
    .filter((candidate) => candidate.date)
    .sort((a, b) => a.weight - b.weight)[0]?.date || "";
}

function parseMoney(value) {
  const amount = Number(String(value || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount < 100000 ? Number(amount.toFixed(2)) : null;
}

function parseReceiptAmount(text) {
  const source = String(text || "");
  const labelPattern =
    /\b(?:grand\s+total|amount\s+paid|total\s+paid|payment\s+total|balance\s+paid|balance\s+due|order\s+total|invoice\s+total|receipt\s+total|total)\b[^\d$-]{0,32}\$?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/i;

  for (const line of source.split("\n")) {
    if (/\bsubtotal|tax|tip|change|cash\s+tendered|card|visa|mastercard|amex|auth|approval\b/i.test(line)) {
      continue;
    }
    const labelled = line.match(labelPattern);
    const amount = labelled ? parseMoney(labelled[1]) : null;
    if (amount) return amount;
  }

  const amounts = Array.from(source.matchAll(/\$?\b(\d{1,6}(?:,\d{3})*\.\d{2})\b/g))
    .map((match) => parseMoney(match[1]))
    .filter((amount) => amount !== null);

  if (!amounts.length) return null;
  return Math.max(...amounts);
}

function parseReceiptVendor(text, fallback) {
  const ignored = /^(receipt|invoice|paid|date|total|subtotal|tax|thank you|page \d+)/i;
  const line = String(text || "")
    .split("\n")
    .map((value) => value.replace(/^#+\s*/, "").trim())
    .find((value) => value.length >= 3 && value.length <= 80 && !ignored.test(value));
  return line || fallback || "";
}

function parseReceiptCategory(text, vendor) {
  const haystack = `${vendor || ""}\n${text || ""}`.toLowerCase();
  if (/hotel|lodging|inn|resort|marriott|hilton|hyatt|airbnb/.test(haystack)) return "Lodging";
  if (/airline|flight|uber|lyft|taxi|parking|rental car|gas station|fuel/.test(haystack)) return "Travel";
  if (/restaurant|cafe|coffee|bar|grill|kitchen|diner|doordash|ubereats/.test(haystack)) return "Meals and entertainment";
  if (/software|subscription|saas|domain|hosting|cloudflare|github|openai/.test(haystack)) return "Software and subscriptions";
  if (/venue|event|catering|audio|video|photography|av\b/.test(haystack)) return "Venue and event costs";
  return "Uncategorized";
}

function supportsMarkdownExtraction(object) {
  const type = String(object.httpMetadata?.contentType || object.customMetadata?.contentType || "").toLowerCase();
  const name = displayNameFromKey(object.key).toLowerCase();
  return (
    type.startsWith("image/") ||
    type === "application/pdf" ||
    /\.(pdf|jpe?g|png|webp|gif|bmp|svg)$/i.test(name)
  );
}

async function extractReceiptData(env, object) {
  if (!env.AI?.toMarkdown) {
    return { status: "skipped", reason: "Workers AI Markdown Conversion is not bound." };
  }

  if ((object.size || 0) > MAX_EXTRACTABLE_BYTES) {
    return { status: "skipped", reason: "Receipt file is too large for automatic extraction." };
  }

  if (!supportsMarkdownExtraction(object)) {
    return { status: "skipped", reason: "Receipt type is not supported for automatic extraction." };
  }

  const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key);
  if (!stored) return { status: "failed", reason: "Receipt file disappeared before extraction." };

  const contentType =
    stored.httpMetadata?.contentType ||
    object.httpMetadata?.contentType ||
    "application/octet-stream";
  const blob = new Blob([await stored.arrayBuffer()], { type: contentType });
  const converted = await env.AI.toMarkdown([
    {
      name: object.customMetadata?.originalName || displayNameFromKey(object.key),
      blob
    }
  ]);
  const markdown = cleanMarkdownText(textFromMarkdownResult(converted));
  if (!markdown) return { status: "failed", reason: "No readable text was extracted." };

  const vendor = parseReceiptVendor(markdown, "");
  return {
    status: "extracted",
    extractedAt: new Date().toISOString(),
    source: "workers-ai-markdown",
    receiptDate: parseReceiptDate(markdown),
    amount: parseReceiptAmount(markdown),
    vendor,
    category: parseReceiptCategory(markdown, vendor),
    textSample: markdown.slice(0, 1200)
  };
}

function ownerFromKey(key) {
  const owner = String(key || "").split("/")[1]?.toLowerCase() || "unassigned";
  return receiptOwners.has(owner) ? owner : "unassigned";
}

function eventFromMetadata(metadata = {}) {
  const event = String(metadata.receiptEvent || metadata.event || "").trim();
  if (receiptEvents.has(event)) return event;
  return "";
}

function emptyLedger() {
  return {
    version: 1,
    updatedAt: null,
    lastReviewAt: null,
    receipts: {}
  };
}

async function readLedger(env) {
  const object = await env.MOJO_SUMMITS_STORAGE.get(LEDGER_KEY);
  if (!object) return emptyLedger();

  const data = await object.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return emptyLedger();

  return {
    ...emptyLedger(),
    ...data,
    receipts:
      data.receipts && typeof data.receipts === "object" && !Array.isArray(data.receipts)
        ? data.receipts
        : {}
  };
}

async function writeLedger(env, ledger) {
  const next = {
    ...ledger,
    version: 1,
    updatedAt: new Date().toISOString(),
    receipts: ledger.receipts || {}
  };

  await env.MOJO_SUMMITS_STORAGE.put(LEDGER_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { area: "budget", kind: "receipt-ledger" }
  });

  return next;
}

async function listAllReceipts(env) {
  const objects = [];
  let cursor;

  do {
    const result = await env.MOJO_SUMMITS_STORAGE.list({
      prefix: "receipts/",
      cursor,
      limit: 1000
    });
    objects.push(...result.objects);
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return objects.filter((object) => !object.key.endsWith("/"));
}

function mergeReceipt(ledger, object) {
  const existing = ledger.receipts[object.key] || {};
  const name = object.customMetadata?.originalName || displayNameFromKey(object.key);
  const inferredAmount = inferAmountFromName(name);
  const extracted = existing.extraction?.status === "extracted" ? existing.extraction : {};
  const uploadedDate = object.uploaded ? object.uploaded.toISOString().slice(0, 10) : "";
  const allowAutomaticUpdate =
    !existing.reviewedAt &&
    !["reviewed", "approved", "ready-for-reimbursement", "reimbursed", "reconciled"].includes(existing.status);
  const existingReceiptDate =
    allowAutomaticUpdate && existing.receiptDate === uploadedDate ? "" : existing.receiptDate || "";
  const amount =
    existing.amount !== "" && existing.amount !== null && existing.amount !== undefined
      ? existing.amount
      : extracted.amount ?? inferredAmount ?? "";
  const receiptDate =
    extracted.receiptDate && allowAutomaticUpdate && !existingReceiptDate
      ? extracted.receiptDate
      : existingReceiptDate || extracted.receiptDate || "";
  const vendor =
    extracted.vendor && allowAutomaticUpdate && (!existing.vendor || existing.vendor === titleFromFilename(name))
      ? extracted.vendor
      : existing.vendor || titleFromFilename(name);
  const category =
    extracted.category && allowAutomaticUpdate && (!existing.category || existing.category === "Uncategorized")
      ? extracted.category
      : existing.category || "Uncategorized";
  const status = allowedStatuses.has(existing.status) ? existing.status : "needs-review";
  const reimbursed = Boolean(existing.reimbursed) || status === "reimbursed";
  const needsReimbursement = Boolean(existing.needsReimbursement) && !reimbursed;

  ledger.receipts[object.key] = {
    key: object.key,
    name,
    owner: existing.owner || ownerFromKey(object.key),
    vendor,
    category,
    event: existing.event || eventFromMetadata(object.customMetadata),
    receiptDate,
    amount,
    taxCategory: taxCategories.has(existing.taxCategory) ? existing.taxCategory : "Unassigned",
    needsReimbursement,
    reimbursed,
    notes: existing.notes || "",
    status: reimbursed ? "reimbursed" : status,
    reviewedAt: existing.reviewedAt || "",
    excluded: Boolean(existing.excluded),
    uploaded: object.uploaded ? object.uploaded.toISOString() : "",
    size: object.size || 0,
    etag: object.etag || "",
    extraction: existing.extraction || null
  };
}

function needsExtraction(record, object) {
  const extraction = record.extraction || {};
  const uploadedDate = object.uploaded ? object.uploaded.toISOString().slice(0, 10) : "";
  const placeholderDate = !record.reviewedAt && record.receiptDate === uploadedDate;
  const missingCoreData = !record.receiptDate || placeholderDate || !(Number(record.amount) > 0);
  const staleExtraction = extraction.etag && object.etag && extraction.etag !== object.etag;
  const retryableSkip = extraction.status === "skipped" && extraction.reason === "Workers AI Markdown Conversion is not bound.";
  return missingCoreData && (!extraction.status || staleExtraction || retryableSkip);
}

async function syncLedger(env, options = {}) {
  const ledger = await readLedger(env);
  const receipts = await listAllReceipts(env);
  const currentKeys = new Set(receipts.map((receipt) => receipt.key));
  const extract = options.extract !== false;
  let changed = false;
  let extractionsThisSync = 0;

  for (const receipt of receipts) {
    if (!ledger.receipts[receipt.key]) changed = true;
    mergeReceipt(ledger, receipt);
    const record = ledger.receipts[receipt.key];
    if (extract && extractionsThisSync < MAX_EXTRACTIONS_PER_SYNC && needsExtraction(record, receipt)) {
      extractionsThisSync += 1;
      try {
        const extraction = await extractReceiptData(env, receipt);
        record.extraction = {
          ...extraction,
          etag: receipt.etag || "",
          attemptedAt: new Date().toISOString()
        };
        mergeReceipt(ledger, receipt);
        changed = true;
      } catch (error) {
        record.extraction = {
          status: "failed",
          reason: error?.message || "Receipt extraction failed.",
          etag: receipt.etag || "",
          attemptedAt: new Date().toISOString()
        };
        changed = true;
      }
    }
  }

  for (const [key, record] of Object.entries(ledger.receipts)) {
    if (!currentKeys.has(key)) {
      ledger.receipts[key] = {
        ...record,
        status: record.status === "excluded" ? "excluded" : "needs-review",
        missingReceiptFile: true
      };
      changed = true;
    }
  }

  return changed ? writeLedger(env, ledger) : ledger;
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 240);
}

function cleanAmount(value) {
  if (value === "" || value === null || value === undefined) return "";
  const amount = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : "";
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function summarize(ledger) {
  const rows = Object.values(ledger.receipts || {});
  const activeRows = rows.filter((row) => row.status !== "excluded" && !row.excluded);
  const totalExpenses = activeRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const unpricedCount = activeRows.filter((row) => !(Number(row.amount) > 0)).length;
  const needsReview = activeRows.filter((row) => row.status === "needs-review").length;
  const byOwner = {};
  const byCategory = {};
  const byTaxCategory = {};

  for (const row of activeRows) {
    const amount = Number(row.amount) || 0;
    byOwner[row.owner || "unassigned"] = (byOwner[row.owner || "unassigned"] || 0) + amount;
    byCategory[row.category || "Uncategorized"] =
      (byCategory[row.category || "Uncategorized"] || 0) + amount;
    byTaxCategory[row.taxCategory || "Unassigned"] =
      (byTaxCategory[row.taxCategory || "Unassigned"] || 0) + amount;
  }

  return {
    revenue: 0,
    expenses: Number(totalExpenses.toFixed(2)),
    net: Number((0 - totalExpenses).toFixed(2)),
    receiptCount: rows.length,
    activeReceiptCount: activeRows.length,
    unpricedCount,
    needsReview,
    reviewedCount: activeRows.filter((row) => row.status === "reviewed").length,
    approvedCount: activeRows.filter((row) => row.status === "approved").length,
    readyForReimbursementCount: activeRows.filter((row) => row.status === "ready-for-reimbursement").length,
    needsReimbursementCount: activeRows.filter((row) => row.needsReimbursement).length,
    reimbursedCount: activeRows.filter((row) => row.reimbursed || row.status === "reimbursed").length,
    byOwner,
    byCategory,
    byTaxCategory
  };
}

function sortedRows(ledger) {
  return Object.values(ledger.receipts || {}).sort((a, b) => {
    const aDate = a.receiptDate || a.uploaded || "";
    const bDate = b.receiptDate || b.uploaded || "";
    return bDate.localeCompare(aDate) || String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function budgetPayload(ledger, extra = {}) {
  return {
    ...extra,
    ledgerUpdatedAt: ledger.updatedAt,
    lastReviewAt: ledger.lastReviewAt,
    summary: summarize(ledger),
    rows: sortedRows(ledger)
  };
}

async function updateReceipt(request, env, access) {
  const payload = await request.json().catch(() => null);
  const key = String(payload?.key || "");
  if (!key.startsWith("receipts/")) {
    return json({ error: "Expected a receipt key." }, { status: 400 });
  }

  const ledger = await syncLedger(env);
  const existing = ledger.receipts[key];
  if (!existing) return json({ error: "Receipt was not found in the ledger." }, { status: 404 });

  const status = allowedStatuses.has(payload.status) ? payload.status : existing.status;
  const reimbursed = cleanBoolean(payload.reimbursed) || status === "reimbursed";
  const needsReimbursement = cleanBoolean(payload.needsReimbursement) && !reimbursed;
  const nextStatus = reimbursed && status !== "excluded" ? "reimbursed" : status;
  ledger.receipts[key] = {
    ...existing,
    owner: receiptOwners.has(String(payload.owner || "").toLowerCase())
      ? String(payload.owner).toLowerCase()
      : existing.owner,
    vendor: cleanText(payload.vendor, existing.vendor),
    category: cleanText(payload.category, existing.category || "Uncategorized"),
    event: cleanText(payload.event, existing.event),
    receiptDate: cleanText(payload.receiptDate, existing.receiptDate).slice(0, 10),
    amount: cleanAmount(payload.amount),
    taxCategory: taxCategories.has(payload.taxCategory) ? payload.taxCategory : existing.taxCategory || "Unassigned",
    needsReimbursement,
    reimbursed,
    notes: cleanText(payload.notes, existing.notes),
    status: nextStatus,
    excluded: nextStatus === "excluded",
    reviewedAt:
      ["reviewed", "approved", "ready-for-reimbursement", "reimbursed", "reconciled", "excluded"].includes(nextStatus)
        ? new Date().toISOString()
        : existing.reviewedAt || "",
    reviewedBy: access.email
  };

  const next = await writeLedger(env, ledger);
  return json({ ok: true, ledger: next, summary: summarize(next), rows: sortedRows(next) });
}

async function createReview(env, access) {
  const ledger = await syncLedger(env);
  const summary = summarize(ledger);
  const rows = sortedRows(ledger);
  const review = {
    reviewedAt: new Date().toISOString(),
    reviewedBy: access.email,
    summary,
    needsReview: rows.filter((row) => row.status === "needs-review"),
    unpriced: rows.filter((row) => row.status !== "excluded" && !(Number(row.amount) > 0))
  };

  const date = review.reviewedAt.slice(0, 10);
  const key = `${REVIEW_PREFIX}${date}.json`;
  await env.MOJO_SUMMITS_STORAGE.put(key, JSON.stringify(review, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { area: "budget", kind: "daily-receipt-review" }
  });

  ledger.lastReviewAt = review.reviewedAt;
  await writeLedger(env, ledger);

  return json({ ok: true, key, review });
}

async function refreshReceiptList(env) {
  const ledger = await syncLedger(env, { extract: false });
  return json(
    budgetPayload(ledger, {
      ok: true,
      refreshedAt: new Date().toISOString(),
      extractionSkipped: true
    })
  );
}

export async function onRequestGet({ request, env, data }) {
  const access = requireBudgetAccess(request, env, data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  const ledger = await syncLedger(env);
  const payload = budgetPayload(ledger);

  if (url.searchParams.get("download") === "csv") {
    const csv = [
      [
        "Date",
        "Owner",
        "Vendor",
        "Category",
        "Tax Category",
        "Event",
        "Amount",
        "Needs Reimbursement",
        "Reimbursed",
        "Status",
        "Receipt",
        "Key"
      ],
      ...payload.rows.map((row) => [
        row.receiptDate,
        row.owner,
        row.vendor,
        row.category,
        row.taxCategory,
        row.event,
        row.amount,
        row.needsReimbursement ? "Yes" : "No",
        row.reimbursed ? "Yes" : "No",
        row.status,
        row.name,
        row.key
      ])
    ]
      .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": "attachment; filename=\"mojo-ai-summits-budget.csv\""
      }
    });
  }

  return json(payload);
}

export async function onRequestPost({ request, env, data }) {
  const access = requireBudgetAccess(request, env, data);
  if (access.response) return access.response;

  const bucketError = requireBucket(env);
  if (bucketError) return bucketError;

  const url = new URL(request.url);
  if (url.searchParams.get("action") === "review") return createReview(env, access);
  if (url.searchParams.get("action") === "refresh") return refreshReceiptList(env);

  return updateReceipt(request, env, access);
}

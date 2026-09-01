import {
  listCrmStorageKeys,
  readCrmStorageJson,
  writeCrmStorageJson
} from "../_crm-d1.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const partnerInfoPrefix = "crm:partner-info:";
const partnerInfoLogoPrefix = "crm/partner-info-logos";
const maxFieldLength = 4000;
const maxLogoBytes = 8 * 1024 * 1024;
const allowedLogoTypes = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function cleanString(value, max = maxFieldLength) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value) {
  return cleanString(value, 240).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

function companySlug(value) {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function safeFileSegment(value, fallback = "file") {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || fallback;
}

function cleanArray(value, maxItems = 16) {
  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value || "[]");
    } catch {
      source = value.split(/\n|,/);
    }
  }
  return Array.isArray(source)
    ? [...new Set(source.map((item) => cleanString(item, 500)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function cleanCampaignValue(value) {
  const clean = cleanString(value, 160);
  if (!clean) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "";
  if (/^\+?\d[\d\s().-]{7,}$/.test(clean)) return "";
  return clean.replace(/[<>"]/g, "");
}

function cleanCampaignAttribution(payload = {}) {
  const source = payload?.campaignAttribution && typeof payload.campaignAttribution === "object"
    ? payload.campaignAttribution
    : payload;
  const attribution = {
    source: cleanCampaignValue(source.utmSource || source.utm_source || source.source),
    medium: cleanCampaignValue(source.utmMedium || source.utm_medium || source.medium),
    campaign: cleanCampaignValue(source.utmCampaign || source.utm_campaign || source.campaign),
    content: cleanCampaignValue(source.utmContent || source.utm_content || source.content),
    term: cleanCampaignValue(source.utmTerm || source.utm_term || source.term),
    landingPath: cleanCampaignValue(source.landingPath || source.pagePath || source.route),
    referrerHost: cleanCampaignValue(source.referrerHost)
  };
  Object.keys(attribution).forEach((key) => {
    if (!attribution[key]) delete attribution[key];
  });
  return attribution;
}

function contactPayload(payload, prefix) {
  return {
    nameTitle: cleanString(payload[`${prefix}NameTitle`] || payload[`${prefix}Name`] || payload[`${prefix}Title`], 500),
    email: cleanEmail(payload[`${prefix}Email`]),
    linkedinUrl: cleanString(payload[`${prefix}LinkedinUrl`] || payload[`${prefix}LinkedInUrl`], 500),
    yearsInRole: cleanString(payload[`${prefix}YearsInRole`], 120),
    bio: cleanString(payload[`${prefix}Bio`], 1200),
    topics: cleanString(payload[`${prefix}Topics`], 1200),
    formats: cleanArray(payload[`${prefix}Formats`], 8)
  };
}

function cleanPayload(payload = {}) {
  const companyLegalName = cleanString(payload.companyLegalName, 240);
  const displayName = cleanString(payload.displayName, 240);
  const company = displayName || companyLegalName;
  const slug = companySlug(company);
  return {
    type: "partner-info",
    companyLegalName,
    displayName,
    company,
    companySlug: slug,
    website: cleanString(payload.website, 500),
    headquarters: cleanString(payload.headquarters, 240),
    oneLineDescriptor: cleanString(payload.oneLineDescriptor, 220),
    elevatorPitch: cleanString(payload.elevatorPitch, 1200),
    categories: cleanArray(payload.categories, 16),
    categoryOther: cleanString(payload.categoryOther, 500),
    primaryContact: contactPayload(payload, "primaryContact"),
    executive: contactPayload(payload, "executive"),
    secondExecutive: contactPayload(payload, "secondExecutive"),
    billingContact: {
      nameEmail: cleanString(payload.billingContactNameEmail, 500),
      purchaseOrderNumber: cleanString(payload.purchaseOrderNumber, 180)
    },
    market: {
      buyerTitles: cleanString(payload.buyerTitles, 1200),
      industries: cleanString(payload.industries, 1200),
      idealCustomer: cleanString(payload.idealCustomer, 800),
      typicalCustomerSize: cleanString(payload.typicalCustomerSize, 240),
      primaryGeographies: cleanString(payload.primaryGeographies, 500),
      salesCycleLength: cleanString(payload.salesCycleLength, 180),
      contractSigner: cleanString(payload.contractSigner, 240)
    },
    pointOfView: {
      councilThemes: cleanArray(payload.councilThemes, 12),
      problemSolved: cleanString(payload.problemSolved, 1200),
      topUseCases: cleanString(payload.topUseCases, 2000),
      aiObjectives: cleanString(payload.aiObjectives, 1600),
      marketWrong: cleanString(payload.marketWrong, 1200),
      deploymentFailure: cleanString(payload.deploymentFailure, 1600),
      executiveQuestion: cleanString(payload.executiveQuestion, 800)
    },
    optionalDepth: {
      namedCustomers: cleanString(payload.namedCustomers, 1200),
      analystCoverage: cleanString(payload.analystCoverage, 1200),
      alliances: cleanString(payload.alliances, 1200),
      certifications: cleanString(payload.certifications, 1200),
      researchLinks: cleanString(payload.researchLinks, 1600),
      eventsCommunities: cleanString(payload.eventsCommunities, 1200),
      offLimits: cleanString(payload.offLimits, 1200)
    },
    permissions: {
      publishItems: cleanArray(payload.publishItems, 16),
      attributionPreference: cleanString(payload.attributionPreference, 180)
    },
    notes: cleanString(payload.notes, 1600),
    signoff: {
      nameTitle: cleanString(payload.signoffNameTitle, 500),
      date: cleanString(payload.signoffDate, 80)
    },
    campaignAttribution: cleanCampaignAttribution(payload)
  };
}

function validate(record) {
  if (!record.companyLegalName && !record.displayName) return "Company legal name or display name is required.";
  if (!record.companySlug) return "Company name could not be used for a partner profile.";
  if (!record.website) return "Website is required.";
  if (!record.oneLineDescriptor) return "One-line descriptor is required.";
  if (!record.elevatorPitch) return "Elevator pitch is required.";
  if (!record.categories.length && !record.categoryOther) return "Choose at least one category or describe the category.";
  if (!record.primaryContact.nameTitle || !isEmail(record.primaryContact.email)) return "Primary contact name/title and email are required.";
  if (!record.executive.nameTitle || !isEmail(record.executive.email)) return "Executive seat holder name/title and email are required.";
  if (!record.market.buyerTitles || !record.market.industries || !record.market.idealCustomer) return "Buyer titles, industries, and ideal customer are required.";
  if (!record.pointOfView.problemSolved || !record.pointOfView.topUseCases || !record.pointOfView.aiObjectives) return "AI point-of-view answers are required.";
  if (!record.pointOfView.marketWrong || !record.pointOfView.deploymentFailure || !record.pointOfView.executiveQuestion) return "Contribution-ask answers are required.";
  if (!record.permissions.publishItems.length || !record.permissions.attributionPreference) return "Publication permissions are required.";
  if (!record.signoff.nameTitle || !record.signoff.date) return "Sign-off name/title and date are required.";
  return "";
}

async function readPayload(request) {
  const contentType = cleanString(request.headers.get("content-type")).toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      payload: Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
      files: {
        logoLight: form.get("logoLight"),
        logoDark: form.get("logoDark")
      }
    };
  }
  return {
    payload: await request.json().catch(() => null),
    files: {}
  };
}

async function storeLogo(env, record, file, variant) {
  if (!env?.MOJO_SUMMITS_STORAGE?.put || !file) return null;
  if (!cleanString(file.name)) return null;
  const type = cleanString(file.type).toLowerCase();
  if (!allowedLogoTypes.has(type)) {
    const error = new Error("Upload logos as SVG, PNG, JPG, or WebP files.");
    error.status = 400;
    throw error;
  }
  if (Number(file.size || 0) > maxLogoBytes) {
    const error = new Error("Upload each logo file smaller than 8 MB.");
    error.status = 400;
    throw error;
  }
  const name = safeFileSegment(file.name, `${variant}-logo`);
  const key = `${partnerInfoLogoPrefix}/${record.companySlug}/${record.id}-${safeFileSegment(variant, "logo")}-${name}`;
  await env.MOJO_SUMMITS_STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: type,
      contentDisposition: `attachment; filename="${name}"`
    },
    customMetadata: {
      area: "crm",
      kind: "partner-info-logo",
      partnerInfoId: record.id,
      company: record.company
    }
  });
  return {
    variant,
    key,
    originalName: cleanString(file.name, 240),
    contentType: type,
    size: Number(file.size || 0),
    uploadedAt: new Date().toISOString()
  };
}

function compactRecord(record = {}, key = "") {
  return {
    key,
    id: cleanString(record.id, 120),
    type: "partner-info",
    company: cleanString(record.company || record.displayName || record.companyLegalName, 240),
    companyLegalName: cleanString(record.companyLegalName, 240),
    displayName: cleanString(record.displayName, 240),
    companySlug: cleanString(record.companySlug, 160),
    website: cleanString(record.website, 500),
    headquarters: cleanString(record.headquarters, 240),
    oneLineDescriptor: cleanString(record.oneLineDescriptor, 220),
    elevatorPitch: cleanString(record.elevatorPitch, 1200),
    categories: cleanArray(record.categories, 16),
    categoryOther: cleanString(record.categoryOther, 500),
    primaryContact: record.primaryContact || {},
    executive: record.executive || {},
    secondExecutive: record.secondExecutive || {},
    billingContact: record.billingContact || {},
    market: record.market || {},
    pointOfView: record.pointOfView || {},
    optionalDepth: record.optionalDepth || {},
    permissions: record.permissions || {},
    notes: cleanString(record.notes, 1600),
    signoff: record.signoff || {},
    logoUploads: Array.isArray(record.logoUploads) ? record.logoUploads : [],
    createdAt: cleanString(record.createdAt, 80),
    updatedAt: cleanString(record.updatedAt, 80)
  };
}

async function partnerInfoRecords(env) {
  const keys = await listCrmStorageKeys(env, partnerInfoPrefix);
  const records = await Promise.all(keys.map(async (key) => {
    const record = await readCrmStorageJson(env, key);
    return record ? compactRecord(record, key) : null;
  }));
  return records
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function requireCrmAccess(data = {}) {
  if (data?.auth?.email) return null;
  return json({ error: "Sign in with a Mojo AI Summits account to view partner profile intake records." }, { status: 401 });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const accessError = requireCrmAccess(data);
  if (accessError) return accessError;
  const url = new URL(request.url);
  const slug = companySlug(url.searchParams.get("companySlug") || url.searchParams.get("company"));
  const records = (await partnerInfoRecords(env)).filter((record) => !slug || record.companySlug === slug);
  return json({ ok: true, partnerInfoSubmissions: records });
}

export async function onRequestPost({ request, env }) {
  if (!env?.MOJO_SUMMITS_SETUP_STATE && !env?.MOJO_SUMMITS_DB) {
    return json({ error: "Partner profile intake storage is not configured." }, { status: 500 });
  }

  const { payload, files } = await readPayload(request);
  if (!payload || typeof payload !== "object") return json({ error: "Submit the partner profile intake form." }, { status: 400 });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {
    id,
    createdAt,
    updatedAt: createdAt,
    source: "partnerinfo",
    ...cleanPayload(payload)
  };
  const error = validate(record);
  if (error) return json({ error }, { status: 400 });

  try {
    record.logoUploads = (await Promise.all([
      storeLogo(env, record, files.logoLight, "light-background"),
      storeLogo(env, record, files.logoDark, "dark-background")
    ])).filter(Boolean);
  } catch (logoError) {
    return json({ error: logoError.message || "Logo upload failed." }, { status: logoError.status || 400 });
  }

  const key = `${partnerInfoPrefix}${record.companySlug}:${createdAt.replace(/[:.]/g, "-")}:${id}`;
  record.key = key;
  await writeCrmStorageJson(env, key, record);

  const profileKey = `partner-company:${record.companySlug}`;
  const existingProfile = await readCrmStorageJson(env, profileKey).catch(() => null);
  const contacts = [
    ...(Array.isArray(existingProfile?.contacts) ? existingProfile.contacts : []),
    {
      name: record.primaryContact.nameTitle,
      email: record.primaryContact.email,
      title: "Primary contact",
      source: "partner-info"
    },
    {
      name: record.executive.nameTitle,
      email: record.executive.email,
      title: "Executive seat holder",
      source: "partner-info"
    }
  ].filter((contact) => cleanString(contact?.email) || cleanString(contact?.name));

  await writeCrmStorageJson(env, profileKey, {
    ...(existingProfile || {}),
    organizationName: record.displayName || record.companyLegalName,
    company: record.company,
    companySlug: record.companySlug,
    website: record.website,
    headquarters: record.headquarters,
    oneLineDescriptor: record.oneLineDescriptor,
    elevatorPitch: record.elevatorPitch,
    categories: record.categories,
    partnerInfoKey: key,
    partnerInfoSubmittedAt: createdAt,
    partnerInfoUpdatedAt: createdAt,
    contacts,
    updatedAt: createdAt,
    updatedBy: "partner-info"
  });

  return json({ ok: true, id, key, companySlug: record.companySlug });
}

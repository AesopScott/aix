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
const partnerCompanyPrefix = "partner-company:";
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

function cleanListText(value, maxItems = 24) {
  return cleanArray(value, maxItems).join(", ");
}

function cleanTextArray(value, maxItems = 24) {
  const fromArray = cleanArray(value, maxItems);
  if (fromArray.length) return fromArray;
  return cleanString(value, 2000)
    .split(/\n|,/)
    .map((item) => cleanString(item, 160))
    .filter(Boolean)
    .slice(0, maxItems);
}

function selectedCompanyNames(company = {}) {
  const legalName = cleanString(company.companyLegalName, 240);
  const displayName = cleanString(company.displayName, 240);
  return {
    companyLegalName: legalName,
    displayName,
    company: displayName || legalName,
    organizationName: displayName || legalName
  };
}

function cleanPayload(payload = {}, selectedCompany = {}) {
  const names = selectedCompanyNames(selectedCompany);
  const companyLegalName = names.companyLegalName;
  const displayName = cleanString(payload.displayName, 240) || names.displayName;
  const company = displayName || companyLegalName;
  const slug = selectedCompany.slug;
  const categories = cleanArray([...cleanArray(payload.categories, 16), cleanString(payload.categoryOther, 160)], 16);
  const targetExecutiveRoles = cleanTextArray(payload.buyerTitles, 24);
  const targetIndustries = cleanTextArray(payload.industries, 24);
  const partnerClientMessaging = cleanString(payload.partnerClientMessaging || payload.elevatorPitch, 4000);
  return {
    type: "partner-info",
    companyLegalName,
    displayName,
    company,
    organizationName: displayName || names.organizationName,
    companyName: company,
    companySlug: slug,
    website: cleanString(payload.website || selectedCompany.website, 500),
    headquarters: cleanString(payload.headquarters || selectedCompany.headquarters, 240),
    description: cleanString(payload.description || payload.oneLineDescriptor, 4000),
    partnerClientMessaging,
    categories,
    primaryCategory: categories[0] || cleanString(payload.categoryOther, 160),
    targetExecutiveRoles,
    targetIndustries,
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
  if (!record.companyLegalName && !record.displayName) return "Choose the partner company legal name from the list.";
  if (!record.companySlug) return "Company name could not be used for a partner profile.";
  if (!record.website) return "Website is required.";
  if (!record.description) return "One-line descriptor is required.";
  if (!record.partnerClientMessaging) return "Elevator pitch is required.";
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

async function resolvePartnerCompanySelection(env, payload = {}) {
  const submittedSlug = companySlug(payload.partnerCompanySlug || payload.companySlug);
  const submittedNameSlug = companySlug(payload.companyLegalName || payload.company || payload.displayName);
  const options = await partnerCompanyOptions(env);
  const selected = submittedSlug
    ? options.find((company) => company.slug === submittedSlug)
    : options.find((company) =>
      submittedNameSlug && (
        companySlug(company.companyLegalName) === submittedNameSlug ||
        companySlug(company.displayName) === submittedNameSlug
      )
    );
  if (!selected) {
    const error = new Error("Choose an existing partner company from the company legal name list.");
    error.status = 400;
    throw error;
  }
  if (submittedNameSlug && ![
    selected.companyLegalName,
    selected.displayName
  ].some((value) => companySlug(value) === submittedNameSlug)) {
    const error = new Error("Company legal name does not match the selected partner company.");
    error.status = 400;
    throw error;
  }
  return selected;
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
    company: cleanString(record.company || record.companyName || record.organizationName || record.displayName || record.companyLegalName, 240),
    companyLegalName: cleanString(record.companyLegalName, 240),
    displayName: cleanString(record.displayName, 240),
    organizationName: cleanString(record.organizationName, 240),
    companyName: cleanString(record.companyName, 240),
    companySlug: cleanString(record.companySlug, 160),
    website: cleanString(record.website, 500),
    headquarters: cleanString(record.headquarters, 240),
    description: cleanString(record.description || record.oneLineDescriptor, 4000),
    partnerClientMessaging: cleanString(record.partnerClientMessaging || record.elevatorPitch, 4000),
    primaryCategory: cleanString(record.primaryCategory, 160),
    targetExecutiveRoles: cleanArray(record.targetExecutiveRoles, 24),
    targetIndustries: cleanArray(record.targetIndustries, 24),
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

function compactPartnerCompany(record = {}, key = "") {
  const slug = cleanString(record.companySlug || key.replace(partnerCompanyPrefix, ""), 160);
  const legalName = cleanString(
    record.companyLegalName ||
      record.legalName ||
      record.organizationLegalName ||
      record.organizationName ||
      record.company ||
      record.companyName ||
      record.name,
    240
  );
  const displayName = cleanString(
    record.displayName ||
      record.organizationName ||
      record.company ||
      record.companyName ||
      record.name ||
      legalName,
    240
  );
  if (!slug || !legalName) return null;
  return {
    slug,
    companyLegalName: legalName,
    displayName,
    website: cleanString(record.website || record.companyWebsite, 500),
    headquarters: cleanString(record.headquarters || record.hq || record.location, 240)
  };
}

async function partnerCompanyOptions(env) {
  const keys = await listCrmStorageKeys(env, partnerCompanyPrefix);
  const companies = await Promise.all(keys.map(async (key) => {
    const record = await readCrmStorageJson(env, key);
    return record ? compactPartnerCompany(record, key) : null;
  }));
  const bySlug = new Map();
  companies.filter(Boolean).forEach((company) => {
    if (!bySlug.has(company.slug)) bySlug.set(company.slug, company);
  });
  return [...bySlug.values()].sort((a, b) =>
    (a.displayName || a.companyLegalName).localeCompare(b.displayName || b.companyLegalName)
  );
}

function firstClean(...values) {
  for (const value of values) {
    const clean = cleanString(value);
    if (clean) return clean;
  }
  return "";
}

function intakeContact(record, contact = {}, role = "") {
  const [namePart, ...titleParts] = cleanString(contact.nameTitle, 500).split(",").map((part) => cleanString(part, 180));
  const email = cleanEmail(contact.email);
  const name = namePart || email;
  return {
    id: email || name,
    email,
    name,
    company: record.company,
    companySlug: record.companySlug,
    profileKey: `partner-company:${record.companySlug}`,
    title: titleParts.join(", ") || role,
    linkedinProfileUrl: cleanString(contact.linkedinUrl, 500),
    source: "partner-info",
    updatedAt: record.updatedAt,
    updatedBy: "partner-info"
  };
}

function dedupeContacts(contacts = []) {
  const map = new Map();
  contacts.forEach((contact) => {
    const key = cleanEmail(contact?.email) || cleanString(contact?.name, 180).toLowerCase();
    if (!key) return;
    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      ...contact,
      name: cleanString(contact?.name, 180) || cleanString(existing.name, 180),
      email: cleanEmail(contact?.email) || cleanEmail(existing.email),
      title: cleanString(contact?.title, 180) || cleanString(existing.title, 180),
      linkedinProfileUrl: cleanString(contact?.linkedinProfileUrl, 500) || cleanString(existing.linkedinProfileUrl, 500)
    });
  });
  return [...map.values()];
}

function requireCrmAccess(data = {}) {
  if (data?.auth?.email) return null;
  return json({ error: "Sign in with a Mojo AI Summits account to view partner profile intake records." }, { status: 401 });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  if (url.searchParams.get("companies") === "1") {
    return json({ ok: true, partnerCompanies: await partnerCompanyOptions(env) });
  }

  const accessError = requireCrmAccess(data);
  if (accessError) return accessError;
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

  let selectedCompany;
  try {
    selectedCompany = await resolvePartnerCompanySelection(env, payload);
  } catch (selectionError) {
    return json({ error: selectionError.message || "Choose an existing partner company." }, { status: selectionError.status || 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {
    id,
    createdAt,
    updatedAt: createdAt,
    source: "partnerinfo",
    ...cleanPayload(payload, selectedCompany)
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
  const logo = record.logoUploads[0] || {};
  const contacts = dedupeContacts([
    ...(Array.isArray(existingProfile?.contacts) ? existingProfile.contacts : []),
    intakeContact(record, record.primaryContact, "Primary contact"),
    intakeContact(record, record.executive, "Executive seat holder"),
    intakeContact(record, record.secondExecutive, "Second executive")
  ]);

  await writeCrmStorageJson(env, profileKey, {
    ...(existingProfile || {}),
    organizationName: firstClean(record.organizationName, existingProfile?.organizationName, existingProfile?.company),
    companyName: firstClean(record.companyName, existingProfile?.companyName, existingProfile?.company),
    company: record.company,
    companyLegalName: firstClean(record.companyLegalName, existingProfile?.companyLegalName, existingProfile?.legalName),
    companySlug: record.companySlug,
    website: firstClean(record.website, existingProfile?.website, existingProfile?.companyWebsite),
    headquarters: firstClean(record.headquarters, existingProfile?.headquarters, existingProfile?.hq, existingProfile?.location),
    description: firstClean(record.description, existingProfile?.description),
    partnerClientMessaging: firstClean(record.partnerClientMessaging, existingProfile?.partnerClientMessaging),
    primaryCategory: firstClean(record.primaryCategory, existingProfile?.primaryCategory),
    categories: record.categories.length ? record.categories : cleanArray(existingProfile?.categories, 20),
    targetExecutiveRoles: record.targetExecutiveRoles.length ? record.targetExecutiveRoles : cleanArray(existingProfile?.targetExecutiveRoles || existingProfile?.targetBuyers, 24),
    targetIndustries: record.targetIndustries.length ? record.targetIndustries : cleanArray(existingProfile?.targetIndustries, 24),
    targetEmployeeRange: firstClean(record.market.typicalCustomerSize, existingProfile?.targetEmployeeRange, existingProfile?.employeeRange),
    companyLogoKey: firstClean(logo.key, existingProfile?.companyLogoKey),
    companyLogoOriginalName: firstClean(logo.originalName, existingProfile?.companyLogoOriginalName),
    companyLogoContentType: firstClean(logo.contentType, existingProfile?.companyLogoContentType),
    companyLogoSize: Number(logo.size || existingProfile?.companyLogoSize || 0),
    companyLogoUploadedAt: firstClean(logo.uploadedAt, existingProfile?.companyLogoUploadedAt),
    partnerInfoKey: key,
    partnerInfoSubmittedAt: createdAt,
    partnerInfoUpdatedAt: createdAt,
    partnerInfoAudit: {
      key,
      submittedAt: createdAt,
      market: record.market,
      pointOfView: record.pointOfView,
      optionalDepth: record.optionalDepth,
      permissions: record.permissions,
      signoff: record.signoff,
      logoUploads: record.logoUploads
    },
    contacts,
    updatedAt: createdAt,
    updatedBy: "partner-info"
  });

  return json({ ok: true, id, key, companySlug: record.companySlug });
}

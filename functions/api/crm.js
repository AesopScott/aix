const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

import {
  createUser,
  getUserByEmail,
  updateUser
} from "../_auth.js";
import {
  readAccessConfig,
  writeAccessConfig
} from "../_access-control.js";
import {
  registrationWithVirtualEventAccess,
  sendRegistrationConfirmation,
  upsertRegistrationContact
} from "../_registration-crm.js";
import {
  crmD1Available,
  crmD1Primary,
  deleteCrmD1Record,
  listCrmD1Keys,
  readCrmD1Json,
  writeCrmD1Json
} from "../_crm-d1.js";

const registrantTypes = {
  contacts: {
    label: "Contacts",
    section: "contacts",
    crmType: "contact",
    crmPrefix: "crm:contact:",
    legacyPrefix: "",
    csvFilename: "mojo-ai-summits-contacts.csv"
  },
  member: {
    label: "Member",
    section: "member-registrants",
    crmType: "member-registrant",
    crmPrefix: "crm:member-registrant:",
    legacyPrefix: "member-registration:",
    csvFilename: "mojo-ai-summits-member-registrants.csv"
  },
  guest: {
    label: "Guest",
    section: "guest-registrants",
    crmType: "guest-registrant",
    crmPrefix: "crm:guest-registrant:",
    legacyPrefix: "guest-registration:",
    csvFilename: "mojo-ai-summits-guest-registrants.csv"
  },
  partner: {
    label: "Partner",
    section: "partner-registrants",
    crmType: "partner-registrant",
    crmPrefix: "crm:partner-registrant:",
    legacyPrefix: "partner-registration:",
    csvFilename: "mojo-ai-summits-partner-registrants.csv"
  }
};

const EVENT_INDEX_KEY = "event-playbooks:index";
const REGISTRATION_INVITE_PREFIXES = {
  member: "crm:member-invite-code:",
  guest: "crm:guest-invite-code:"
};
const PARTNER_INVITE_PREFIX = "crm:partner-invite-code:";
const GUEST_MATRIX_PROSPECT_PREFIX = "crm:guest-matrix-prospect:";
const PARTNER_MATRIX_PROSPECT_PREFIX = "crm:partner-matrix-prospect:";
const REGISTRATION_DEBUG_PREFIX = "crm:registration-debug:";
const PHONE_VERIFICATION_DEBUG_PREFIX = "crm:phone-verification-debug:";
const R2_REGISTRATION_PREFIX = "crm/registrations";
const OVERFLOW_REGISTRATION_PREFIX = "crm-overflow/registrations";
const R2_INVITE_USAGE_PREFIX = "crm/invite-usage";
const CONTACT_PHOTO_PREFIX = "crm/contact-photos";
const REGISTRATION_PHOTO_PREFIX = "crm/registration-photos";
const REGISTRATION_COMPANY_LOGO_PREFIX = "crm/registration-company-logos";
const PARTNER_PROSPECT_COMPANY_PREFIX = "crm:partner-prospect-company:";
const PARTNER_PROSPECT_PERSON_PREFIX = "crm:partner-prospect-person:";
const PARTNER_PROSPECT_AUDIT_PREFIX = "crm:partner-prospect-audit:";
const PARTNER_PROSPECT_DEBUG_PREFIX = "crm:partner-prospect-debug:";
const PARTNER_PROSPECT_SOURCE_PREFIX = "crm:partner-prospect-source:";
const PARTNER_PROSPECT_SCORE_CONFIG_KEY = "crm:partner-prospect-score-config";
const DEFAULT_UPCOMING_EVENTS = [
  {
    slug: "ai-executive-readiness",
    title: "AI Executive Readiness",
    date: "Friday, September 4, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-data-readiness-and-knowledge-strategy",
    title: "AI Data Readiness and Knowledge Strategy",
    date: "Friday, September 18, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-use-cases-that-survive-finance",
    title: "AI Use Cases That Survive Finance",
    date: "Friday, September 25, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-agents-automation-and-human-handoffs",
    title: "AI Agents, Automation, and Human Handoffs",
    date: "Friday, October 9, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-integration-and-workflow",
    title: "AI Integration and Workflow",
    date: "Friday, October 16, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-vendor-strategy-and-platform-decisions",
    title: "AI Vendor Strategy and Platform Decisions",
    date: "Friday, October 30, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-security-governance-and-trust",
    title: "AI Security, Governance, and Trust",
    date: "Friday, November 6, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-workforce-talent-and-change-adoption",
    title: "AI Workforce, Talent, and Change Adoption",
    date: "Friday, November 20, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-operating-model-for-2027",
    title: "AI Operating Model for 2027",
    date: "Friday, November 27, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-budgeting-and-investment-priorities",
    title: "AI Budgeting and Investment Priorities",
    date: "Friday, December 4, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-workforce-readiness-and-change-leadership",
    title: "AI Workforce Readiness and Change Leadership",
    date: "Friday, December 18, 2026",
    format: "Virtual"
  },
  {
    slug: "ai-executive-operating-agenda-for-2027",
    title: "AI Executive Operating Agenda for 2027",
    date: "Friday, January 8, 2027",
    format: "Virtual"
  },
  {
    slug: "dallas-2027",
    title: "Dallas 2027 Summit",
    date: "Wednesday, January 20, 2027",
    format: "In person"
  }
];
const allowedStatuses = new Set(["new", "scott-engagement", "pending-engagement", "contacted", "confirmed", "accepted", "waitlist", "declined", "bad-fit", "invited", "registered", "alternate", "attended", "no-show"]);
const allowedGuestRegistrationLifecycleStatuses = new Set(["scott-engagement", "pending-engagement", "contacted", "confirmed", "declined", "bad-fit", "invited", "registered", "alternate", "attended", "no-show"]);
const allowedLifecycleStages = new Set(["guest", "featured-guest", "fellow", "contributing-fellow", "senior-fellow", "distinguished-fellow"]);
const allowedRegistrationStatuses = new Set(["invited", "opened", "started", "confirmed", "registered", "declined", "canceled", "waitlisted"]);
const allowedStrategicRoles = new Set(["attendee", "speaker", "moderator", "roundtable-leader", "research-contributor", "sponsor-representative", "partner"]);
const allowedNextActions = new Set(["none", "call", "send-invitation", "confirm-role", "follow-up", "introduce", "schedule-call", "send-brief", "membership-outreach", "partner-outreach"]);
const allowedExecutiveFunctions = new Set(["", "ceo", "finance", "operations", "technology", "security", "ai-data", "strategy", "marketing-sales", "hr-people", "legal-compliance", "other"]);
const allowedCompanySizes = new Set(["", "1-50", "51-200", "201-1000", "1001-5000", "5001-10000", "10000-plus"]);
const allowedOrganizationTypes = new Set(["", "enterprise", "vendor-provider", "investor", "nonprofit", "government", "partner", "media", "other"]);
const allowedEmailPermissions = new Set(["unknown", "opted-in", "transactional-only", "opted-out"]);
const allowedActivityTypes = new Set(["note", "call", "email", "meeting", "sms", "follow-up", "qualification"]);
const allowedTopicTracks = new Set([
  "ai-strategy",
  "executive-readiness",
  "data-readiness",
  "ai-use-cases",
  "agents-automation",
  "workflow-integration",
  "vendor-strategy",
  "security-governance",
  "workforce-adoption",
  "operating-model"
]);
const allowedGuestMatrixLinkedInStatuses = new Set(["unknown", "not-connected", "connection-requested", "connected", "declined", "unreachable"]);
const allowedGuestMatrixRegistrationRequestStatuses = new Set(["not-sent", "drafted", "sent", "reminder-sent", "bounced", "declined"]);
const maxFieldLength = 2000;
const guestInviteEmailCc = ["angel@mojoaisummits.com", "scott@mojoaisummits.com"];
const partnerInviteEmailCc = ["scott@mojoaisummits.com", "miller@mojoaisummits.com", "jodi@mojoaisummits.com"];
const EMAIL_LOG_PREFIX = "crm:email-log:";
const defaultPartnerScoreWeights = {
  aiRelevance: 20,
  enterpriseFocus: 15,
  executiveAudienceOverlap: 15,
  companySize: 10,
  fundingRevenueCapacity: 10,
  eventSponsorshipHistory: 10,
  marketingMaturity: 5,
  partnershipTeam: 5,
  marketPresence: 5,
  recentGrowthFunding: 5
};
const builtInDirectoryStarterTopics = [
  ["software-companies", "Software"],
  ["information-technology-companies", "Information Technology"],
  ["cloud-companies", "Cloud"],
  ["cybersecurity-companies", "Cybersecurity"],
  ["big-data-analytics-companies", "Big Data Analytics"],
  ["big-data-companies", "Big Data"],
  ["business-intelligence-companies", "Business Intelligence"],
  ["automation-companies", "Automation"],
  ["app-development-companies", "App Development"],
  ["developer-tools-companies", "Developer Tools"],
  ["data-privacy-companies", "Data Privacy"],
  ["database-companies", "Database"]
];
const builtInDirectoryStarterPageCount = 50;
const CRM_D1_KV_BACKFILL_PREFIXES = [
  "crm:contact:",
  "crm:member-registrant:",
  "crm:guest-registrant:",
  "crm:partner-registrant:",
  "member-registration:",
  "guest-registration:",
  "partner-registration:",
  REGISTRATION_INVITE_PREFIXES.member,
  REGISTRATION_INVITE_PREFIXES.guest,
  PARTNER_INVITE_PREFIX,
  GUEST_MATRIX_PROSPECT_PREFIX,
  PARTNER_MATRIX_PROSPECT_PREFIX,
  PARTNER_PROSPECT_COMPANY_PREFIX,
  PARTNER_PROSPECT_PERSON_PREFIX,
  PARTNER_PROSPECT_AUDIT_PREFIX,
  PARTNER_PROSPECT_DEBUG_PREFIX,
  PARTNER_PROSPECT_SOURCE_PREFIX,
  EMAIL_LOG_PREFIX,
  REGISTRATION_DEBUG_PREFIX,
  PHONE_VERIFICATION_DEBUG_PREFIX,
  "crm:fellowship-nomination:",
  "event-playbooks:index",
  "event-playbook:",
  "invite-request:",
  "sms:notification:",
  "sms:notifications:",
  "sms:inbound:",
  "sms:opt-out:",
  "sms:verified-phone:",
  "virtual-event:",
  "crm:company:",
  "partner-company:",
  "member-company:",
  "guest-company:"
];
const CRM_D1_R2_BACKFILL_PREFIXES = [
  `${R2_REGISTRATION_PREFIX}/member/`,
  `${R2_REGISTRATION_PREFIX}/guest/`,
  `${R2_REGISTRATION_PREFIX}/partner/`,
  `${OVERFLOW_REGISTRATION_PREFIX}/member/`,
  `${OVERFLOW_REGISTRATION_PREFIX}/guest/`,
  `${OVERFLOW_REGISTRATION_PREFIX}/partner/`,
  `${R2_INVITE_USAGE_PREFIX}/member/`,
  `${R2_INVITE_USAGE_PREFIX}/guest/`,
  `${R2_INVITE_USAGE_PREFIX}/partner/`
];
const builtInDirectoryStarterSources = builtInDirectoryStarterTopics.flatMap(([slug, label]) =>
  Array.from({ length: builtInDirectoryStarterPageCount }, (_, index) => {
    const page = index + 1;
    return {
      sourceId: `starter-built-in-directory-${slug}-page-${page}`,
      sourceName: `Built In ${label} Directory Page ${page}`,
      sourceType: `${label} Company Directory`,
      sourceUrl: `https://builtin.com/companies/type/${slug}${page > 1 ? `?page=${page}` : ""}`,
      description: `Paged Built In ${label.toLowerCase()} directory source used to keep finding new AI-leveraging technology prospects after article roundups and known companies are exhausted.`,
      category: "AI-Enabled Tech Lists"
    };
  })
);
const eventSponsorCrawlStarterSources = [
  ["starter-event-crawl-ai4", "Ai4 Event Sponsor Crawl", "https://ai4.io/", "Ai4's Las Vegas AI event site; crawl sponsor, exhibitor, and partner pages for companies already investing in applied AI event audiences."],
  ["starter-event-crawl-ai4-sponsors", "Ai4 Sponsors & Exhibitors Crawl", "https://ai4.io/sponsors-exhibitors/", "Ai4 sponsor and exhibitor page; strong source for AI vendors and AI-leveraging technology sponsors."],
  ["starter-event-crawl-black-hat-usa", "Black Hat USA Sponsor Crawl", "https://blackhat.com/us-26/event-sponsors.html", "Black Hat USA Las Vegas sponsor page; crawl sponsor tiers, exhibitors, AI Zone, Startup City, and security vendor links."],
  ["starter-event-crawl-black-hat-business-hall", "Black Hat USA Business Hall Crawl", "https://blackhat.com/us-26/business-hall.html", "Black Hat USA Business Hall page; crawl exhibitor and solution-provider references from a major Las Vegas cybersecurity event."],
  ["starter-event-crawl-black-hat-sponsorship", "Black Hat Sponsorship Hub Crawl", "https://blackhat.com/html/sponsors.html", "Black Hat sponsorship hub; crawl current sponsor and event opportunity pages for security vendors."],
  ["starter-event-crawl-defcon-recon-village", "DEF CON Recon Village Sponsor Crawl", "https://reconvillage.org/reconvillage-2026-defcon-34/sponsors", "DEF CON Recon Village sponsor page; crawl for cybersecurity community sponsors and security vendors."],
  ["starter-event-crawl-defcon-ai-village", "DEF CON AI Village Sponsor Crawl", "https://aivillage.org/events/defcon-34/", "DEF CON AI Village event page; crawl for AI security sponsors, partners, and village supporters."],
  ["starter-event-crawl-dattocon", "DattoCon Sponsor Crawl", "https://www.dattocon.com/sponsors/", "DattoCon sponsor page; crawl MSP, cybersecurity, backup, automation, and IT channel vendors."],
  ["starter-event-crawl-kaseya-connect-sponsor", "Kaseya Connect Sponsor Crawl", "https://events.kaseya.com/sponsorship/", "Kaseya global events sponsorship hub; crawl for IT operations, MSP, cybersecurity, and channel ecosystem sponsors."],
  ["starter-event-crawl-kaseya-connect-na", "Kaseya Connect North America Sponsor Crawl", "https://www.kaseyaconnect.com/sponsors/", "Kaseya Connect North America sponsor page; crawl MSP, IT operations, backup, automation, and cybersecurity vendors."],
  ["starter-event-crawl-kaseya-connect-europe", "Kaseya Connect Europe Sponsor Crawl", "https://www.kaseyaconnect.com/europe/sponsors/", "Kaseya Connect Europe sponsor page; crawl exposed IT, MSP, security, and channel sponsor companies."],
  ["starter-event-crawl-kaseya-connect-apac", "Kaseya Connect APAC Sponsor Crawl", "https://www.kaseyaconnect.com/apac/sponsors/", "Kaseya Connect APAC sponsor page; crawl MSP, IT operations, and security ecosystem sponsors."],
  ["starter-event-crawl-gds-summits", "GDS Group Summits Sponsor Crawl", "https://gdsgroup.com/experiences/summits/", "GDS executive summit site; crawl security, CIO, CISO, IT, and technology partner pages."],
  ["starter-event-crawl-gds-security-insight", "GDS Security Insight Summit Crawl", "https://gdsgroup.com/events/physical-summit/security-insight-summit-fall-edition/", "GDS Security Insight Summit page; crawl for cybersecurity partners and sponsor references."],
  ["starter-event-crawl-gds-tech-leaders", "GDS Tech Leaders Insight Summit Crawl", "https://gdsgroup.com/events/physical-summit/tech-leaders-insight-summit-autumn-edition/", "GDS tech leaders summit page; crawl for CIO, CISO, IT, and AI-ready enterprise partner signals."],
  ["starter-event-crawl-millennium-ciso", "Millennium Alliance CISO Events Crawl", "https://mill-all.com/ciso-conferences/", "Millennium Alliance CISO event hub; crawl CISO conference and assembly pages for solution providers."],
  ["starter-event-crawl-millennium-ciso-sponsors", "Millennium Alliance CISO Sponsors Crawl", "https://mill-all.com/ciso-sponsors/", "Millennium Alliance CISO sponsor page; crawl sponsor and partner links for security vendors."],
  ["starter-event-crawl-cisoxc", "CISO XC Sponsor Crawl", "https://www.cisoxc.com/", "CISO XC cybersecurity executive event site; crawl partner and event pages for trusted security sponsors."],
  ["starter-event-crawl-evanta-ciso", "Evanta CISO Sponsor Crawl", "https://www.evanta.com/ciso", "Evanta CISO community hub; crawl executive summit pages for key and program sponsors."],
  ["starter-event-crawl-evanta-new-york-ciso", "Evanta New York CISO Summit Crawl", "https://www.evanta.com/ciso/new-york/new-york-ciso-executive-summit-8439", "Evanta New York CISO Executive Summit page with key sponsor and program sponsor sections."],
  ["starter-event-crawl-infosec-world", "InfoSec World Sponsor Crawl", "https://www.infosecworldusa.com/", "InfoSec World cybersecurity event site; crawl sponsor, CISO summit, and partner pages."],
  ["starter-event-crawl-secureworld", "SecureWorld Sponsor Crawl", "https://www.secureworld.io/events", "SecureWorld cybersecurity events hub; crawl event and sponsorship pages for security sponsors."],
  ["starter-event-crawl-secureworld-sponsorship", "SecureWorld Sponsorship Crawl", "https://info.secureworld.io/conference-sponsorship-2026", "SecureWorld 2026 sponsorship page; crawl for sponsor partner evidence."],
  ["starter-event-crawl-innovate-cybersecurity", "Innovate Cybersecurity Summit Crawl", "https://www.innovatecybersecuritysummit.com/", "Innovate Cybersecurity Summit; crawl for reverse-expo sponsors and security solution providers."],
  ["starter-event-crawl-ciso-forum", "CISO Forum Sponsor Crawl", "https://www.cisoforum.com/sponsors/", "CISO Forum sponsor page; crawl for enterprise cybersecurity sponsor companies."],
  ["starter-event-crawl-pulse-ciso-360", "Pulse CISO 360 Sponsor Crawl", "https://www.pulseconferences.com/conference/cyber-360-exchange/why-sponsor-2/", "Pulse CISO 360 sponsorship page; crawl for cyber exchange sponsor companies."],
  ["starter-event-crawl-generis-cio-cyber", "Generis CIO & Cybersecurity Summit Crawl", "https://cioamerica.com/", "Generis American CIO & Cybersecurity Summit; crawl for CIO, CISO, IT, and security sponsors."],
  ["starter-event-crawl-foundry-cio100", "Foundry CIO 100 Partner Crawl", "https://event.foundryco.com/cio100-symposium-and-awards/become-a-partner/", "Foundry CIO 100 partner page; crawl for CIO and enterprise technology sponsors."],
  ["starter-event-crawl-enterprise-connect", "Enterprise Connect Sponsor Crawl", "https://exhibitors.enterpriseconnect.com/", "Enterprise Connect sponsors and exhibitors; crawl for AI-enabled communications and enterprise software vendors."],
  ["starter-event-crawl-generative-ai-expo", "Generative AI Expo Sponsor Crawl", "https://www.generativeaiexpo.com/east/become-an-exhibitor.aspx", "Generative AI Expo sponsorship page; crawl for enterprise AI and technology exhibitors."],
  ["starter-event-crawl-generative-ai-summit", "Generative AI Summit Sponsors Crawl", "https://www.aidataanalytics.network/events-generativeaisummit/sponsors", "Generative AI Summit sponsors page; crawl for AI and analytics vendors."],
  ["starter-event-crawl-ai-defense-summit", "AI for Defense Summit Sponsor Crawl", "https://ai.dsigroup.org/sponsor/", "AI for Defense Summit sponsor page; crawl for AI, defense, cyber, and data vendors."],
  ["starter-event-crawl-fortinus-ciso-uae", "Fortinus CISO & Enterprise Security Crawl", "https://events.fortinusevents.com/CISOUAE26", "Fortinus CISO and enterprise security summit; crawl for cybersecurity and AI leadership sponsors."],
  ["starter-event-crawl-inspired-ciso-benelux", "Inspired CISO Summit Crawl", "https://www.inspiredbusinessmedia.com/summit/ciso-inspired-summit-amsterdam", "Inspired Business Media CISO summit page; crawl for cybersecurity sponsor and partner signals."],
  ["starter-event-crawl-inspired-cio-uk", "Inspired CIO Summit Crawl", "https://www.inspiredbusinessmedia.com/summit/cio-inspired-summit-uk-2026", "Inspired Business Media CIO summit page; crawl for IT, cloud, data, and security sponsors."],
  ["starter-event-crawl-gbi-ciso", "GBI CISO Summit Crawl", "https://www.gbiimpact.com/summits/ciso-new-york-summit", "GBI Impact CISO summit page; crawl for cybersecurity sponsor and partner companies."],
  ["starter-event-crawl-elite-cio-ciso", "Elite CIO/CISO Summit Crawl", "https://www.eliteb2bevents.com/elite-summits", "Elite B2B CIO/CISO summit hub; crawl for IT and security sponsor signals."]
].map(([sourceId, sourceName, sourceUrl, description]) => ({
  sourceId,
  sourceName,
  sourceType: "Event Sponsor Crawl",
  sourceUrl,
  description,
  category: "Event Sponsor Crawls",
  crawlSponsorPages: true,
  crawlPageLimit: 1
}));
const emergingCompanyDiscoverySegment = "emerging-10-100";
const emergingCompanyTargetEmployeeRange = "10-100";
const emergingCompanyStarterSources = [
  ["emerging-yc-ai", "YC AI Startups", "https://www.ycombinator.com/companies/industry/ai", "Y Combinator AI startup directory, useful for finding smaller AI-leveraging software companies before they are obvious sponsor targets."],
  ["emerging-yc-saas", "YC SaaS Startups", "https://www.ycombinator.com/companies/industry/saas", "Y Combinator SaaS startup directory for emerging B2B software vendors likely to be in the 10-100 employee research lane."],
  ["emerging-yc-security", "YC Security Startups", "https://www.ycombinator.com/companies/industry/security", "Y Combinator security startup directory for small cybersecurity and infrastructure vendors."],
  ["emerging-wellfound-ai", "Wellfound AI Startups", "https://wellfound.com/startups/industry/artificial-intelligence", "Wellfound AI startup category for smaller companies hiring around AI-enabled products and operations."],
  ["emerging-wellfound-saas", "Wellfound SaaS Startups", "https://wellfound.com/startups/industry/saas", "Wellfound SaaS startup category for emerging software vendors."],
  ["emerging-topstartups-ai", "TopStartups AI Companies", "https://topstartups.io/?industries=Artificial+Intelligence", "Startup directory with AI industry filters and company-size context for emerging AI-enabled vendors."],
  ["emerging-built-in-ai-roundup", "Built In AI Companies Roundup", "https://builtin.com/artificial-intelligence/ai-companies-roundup", "Built In AI company roundup used as an emerging-company seed source before size verification."]
].map(([sourceId, sourceName, sourceUrl, description]) => ({
  sourceId,
  sourceName,
  sourceType: "Emerging 10-100 Source",
  sourceUrl,
  description,
  category: "Emerging 10-100",
  discoverySegment: emergingCompanyDiscoverySegment,
  targetEmployeeRange: emergingCompanyTargetEmployeeRange
}));
const partnerProspectStarterSources = [
  {
    sourceId: "starter-built-in-saas-companies",
    sourceName: "Built In SaaS Companies",
    sourceType: "SaaS Company Roundup",
    sourceUrl: "https://builtin.com/articles/saas-companies",
    description: "High-yield SaaS company roundup with many vendors likely to use AI in product, marketing, operations, or customer workflows.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-b2b-saas-companies",
    sourceName: "Built In B2B SaaS Companies",
    sourceType: "B2B SaaS Company Roundup",
    sourceUrl: "https://builtin.com/articles/top-b2b-saas-companies",
    description: "B2B SaaS vendors with strong enterprise buying-center overlap and likely AI adoption pressure.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-cloud-companies",
    sourceName: "Built In Cloud Companies",
    sourceType: "Cloud Company Roundup",
    sourceUrl: "https://builtin.com/articles/cloud-computing-companies",
    description: "Cloud, infrastructure, data, and security vendors that commonly sell into AI transformation budgets.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-enterprise-software",
    sourceName: "Built In Enterprise Software Companies",
    sourceType: "Enterprise Software Roundup",
    sourceUrl: "https://builtin.com/articles/enterprise-software-companies",
    description: "Enterprise software companies whose products increasingly leverage AI, automation, analytics, and workflow intelligence.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-cybersecurity-companies",
    sourceName: "Built In Cybersecurity Companies",
    sourceType: "Cybersecurity Company Roundup",
    sourceUrl: "https://builtin.com/articles/cyber-security-companies",
    description: "Cybersecurity companies are high-interest prospects because AI adoption increases security, governance, and risk pressure.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-cyber-100",
    sourceName: "Cyber 100 Companies",
    sourceType: "Cybersecurity Company List",
    sourceUrl: "https://onlinedegrees.sandiego.edu/top-100-cybersecurity-companies/",
    description: "Large cybersecurity company list used to seed AI-security and AI-risk sponsor prospects.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-software-development-companies",
    sourceName: "Built In Software Development Companies",
    sourceType: "Software Development Company Roundup",
    sourceUrl: "https://builtin.com/articles/software-development-companies",
    description: "Large software-development vendor roundup; these companies are strong prospects because AI is changing product, engineering, customer, and executive buying workflows.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-cloud-storage-companies",
    sourceName: "Built In Cloud Storage Companies",
    sourceType: "Cloud Storage Company Roundup",
    sourceUrl: "https://builtin.com/articles/data-storage-management",
    description: "Cloud storage, file, and data-platform companies that sell into infrastructure modernization and AI-readiness budgets.",
    category: "AI-Enabled Tech Lists"
  },
  {
    sourceId: "starter-built-in-it-companies-india",
    sourceName: "Built In IT Companies India",
    sourceType: "IT Services Company Roundup",
    sourceUrl: "https://builtin.com/articles/top-it-companies-in-india",
    description: "Large IT services and consulting companies that help enterprises adopt AI, cloud, security, automation, and digital transformation programs.",
    category: "AI-Enabled Tech Lists"
  },
  ...eventSponsorCrawlStarterSources,
  ...builtInDirectoryStarterSources,
  {
    sourceId: "starter-ai4-sponsors",
    sourceName: "Ai4 Sponsors & Exhibitors",
    sourceType: "Conference Sponsor List",
    sourceUrl: "https://ai4.io/sponsors-exhibitors/",
    description: "Large AI event sponsor and exhibitor page with companies already investing in AI-event audiences.",
    category: "Conference Sponsors"
  },
  {
    sourceId: "starter-the-ai-conference-sponsors",
    sourceName: "The AI Conference Sponsorship Opportunities",
    sourceType: "Conference Sponsorship Prospectus",
    sourceUrl: "https://aiconference.com/sponsors/",
    description: "Enterprise AI sponsorship page with sponsor/exhibitor package context and vendor audience fit.",
    category: "Conference Sponsors"
  },
  {
    sourceId: "starter-responsible-ai-summit",
    sourceName: "Responsible AI Summit Sponsors",
    sourceType: "Conference Sponsor List",
    sourceUrl: "https://www.aidataanalytics.network/events-responsible-ai-summit",
    description: "Responsible AI and governance event with partner/sponsor signals for AI governance vendors.",
    category: "Conference Sponsors"
  },
  {
    sourceId: "starter-ai-gov-world",
    sourceName: "AI Gov World Sponsors",
    sourceType: "Conference Sponsor List",
    sourceUrl: "https://aiworldconference.ai/",
    description: "AI governance conference page with sponsor and partner signals.",
    category: "Conference Sponsors"
  },
  {
    sourceId: "starter-ai-plus-expo",
    sourceName: "AI+ Expo Sponsors",
    sourceType: "Conference Sponsor List",
    sourceUrl: "https://expo.scsp.ai/",
    description: "AI expo sponsor page showing organizations supporting a public AI event audience.",
    category: "Conference Sponsors"
  },
  {
    sourceId: "starter-ai-summit-london",
    sourceName: "The AI Summit London Sponsors",
    sourceType: "Conference Sponsor List",
    sourceUrl: "https://partners.london.theaisummit.com/",
    description: "Sponsor and exhibitor list for an enterprise AI summit.",
    category: "Conference Sponsors"
  }
];
const discoveryBlockedDomains = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "discord.com",
  "discord.gg",
  "addevent.com",
  "forms.gle",
  "cvent.com",
  "cvent.me",
  "events.kaseya.com",
  "tiktok.com",
  "medium.com",
  "substack.com",
  "github.com",
  "github.blog",
  "awesome.re",
  "generativeaicompanies.tech",
  "crunchbase.com",
  "dealroom.co",
  "pitchbook.com",
  "cbinsights.com",
  "tracxn.com",
  "cybersecurityventures.com",
  "cybersecurity-excellence-awards.com",
  "investopedia.com",
  "techcrunch.com",
  "time.com",
  "programs.com",
  "research.com",
  "g2.com",
  "producthunt.com",
  "wellfound.com",
  "startupschool.org",
  "bookface-images.s3.amazonaws.com",
  "amazonaws.com",
  "form.jotform.com",
  "w1.buysub.com",
  "parsintl.com",
  "youradchoices.com",
  "pages.scmagazine.com",
  "cyberriskalliance.com",
  "gartner.com",
  "piersixty.com",
  "thehighlinehotel.com",
  "themoorenyc.com",
  "dreamhotels.com",
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "wikipedia.org"
]);
const aiCategorySignals = [
  ["AI Security", ["ai security", "model security", "llm security", "prompt injection", "ai risk", "security posture"]],
  ["AI Governance", ["ai governance", "responsible ai", "model governance", "ai compliance", "ai policy", "trustworthy ai"]],
  ["AI Observability", ["ai observability", "model monitoring", "llm observability", "evals", "model evaluation"]],
  ["MLOps", ["mlops", "machine learning operations", "model deployment", "feature store", "model registry"]],
  ["AI Agents", ["ai agent", "agents", "agentic", "workflow automation", "autonomous agent"]],
  ["Developer AI", ["developer tools", "code assistant", "software development", "devtools", "coding agent"]],
  ["Vector/Search/Data Infrastructure", ["vector database", "semantic search", "rag", "retrieval", "knowledge graph", "data infrastructure"]],
  ["Foundation Models / LLMs", ["foundation model", "large language model", "llm", "generative ai model"]],
  ["Cloud AI", ["cloud ai", "ai cloud", "managed ai", "ai platform"]],
  ["Generative Media", ["image generation", "video generation", "audio generation", "synthetic media", "creative ai"]],
  ["Voice/Speech AI", ["voice ai", "speech recognition", "text to speech", "conversational ai"]],
  ["Computer Vision", ["computer vision", "visual ai", "image recognition", "video analytics"]],
  ["Robotics/Autonomy", ["robotics", "autonomous", "autonomy", "robot"]],
  ["Healthcare AI", ["healthcare ai", "clinical ai", "medical ai", "patient"]],
  ["Financial AI", ["financial ai", "fintech ai", "banking ai", "fraud detection"]],
  ["Legal AI", ["legal ai", "contract ai", "legaltech", "e-discovery"]],
  ["HR AI", ["hr ai", "talent ai", "recruiting ai", "workforce ai"]],
  ["Sales AI", ["sales ai", "revenue intelligence", "sales automation", "sales engagement"]],
  ["Marketing AI", ["marketing ai", "personalization", "campaign optimization", "content generation"]],
  ["Customer Service AI", ["customer service ai", "contact center ai", "support automation", "chatbot"]],
  ["AI Consulting / Systems Integrator", ["ai consulting", "systems integrator", "implementation partner", "digital transformation"]]
];
const executiveBuyerSignals = [
  ["CIO", ["cio", "information officer", "it leader", "enterprise technology"]],
  ["CTO", ["cto", "technology leader", "engineering leader"]],
  ["CISO", ["ciso", "security leader", "cybersecurity"]],
  ["Chief AI Officer", ["chief ai officer", "caio", "ai leader", "ai strategy"]],
  ["COO", ["coo", "operations leader", "operating model"]],
  ["CMO", ["cmo", "marketing leader", "growth leader"]],
  ["CRO", ["cro", "revenue leader", "sales leader"]],
  ["General Counsel", ["general counsel", "legal", "compliance"]]
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });
}

function requireCrmAccess(data = {}) {
  if (data?.auth?.email) return { email: data.auth.email };
  if (data?.auth?.mode === "public") return { email: "public@mojoaisummits.com" };

  return {
    response: json({ error: "Sign in with a Mojo AI Summits account to use CRM." }, { status: 401 })
  };
}

function cleanString(value, max = maxFieldLength) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function cleanEventNotes(record = {}) {
  return cleanString(record?.eventNotes || record?.registrationNotes || "", 4000);
}

function cleanPreRegistrationNotes(record = {}) {
  return cleanString(record?.preRegistrationNotes || record?.matrixNotes || record?.engagementNotes || record?.notes || "", 4000);
}

function safeFileSegment(value, fallback = "file") {
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

function safeObjectKey(value) {
  const key = String(value || "").trim().replace(/^\/+/, "");
  if (!key || key.includes("..") || key.includes("\\") || key.length > 1024) return "";
  return key;
}

function cleanType(value) {
  return registrantTypes[value] ? value : "member";
}

function cleanAllowed(value, allowed, fallback = "") {
  const cleaned = cleanString(value, 120).toLowerCase();
  return allowed.has(cleaned) ? cleaned : fallback;
}

function cleanStarRating(value, fallback = 1) {
  const rating = Number.parseInt(value, 10);
  if ([1, 2, 3].includes(rating)) return rating;
  return [1, 2, 3].includes(fallback) ? fallback : 1;
}

function cleanGuestRegistrationLifecycleStatus(value, fallback = "contacted") {
  const cleaned = cleanString(value, 120).toLowerCase();
  const aliases = {
    "scott engagement": "scott-engagement",
    "scott's engagement": "scott-engagement",
    scott_engagement: "scott-engagement",
    new: "pending-engagement",
    pending: "pending-engagement",
    "pending-angel": "pending-engagement",
    pending_angel: "pending-engagement",
    "pending engagement": "pending-engagement",
    pending_engagement: "pending-engagement",
    tracking: "pending-engagement",
    accepted: "confirmed",
    waitlist: "alternate",
    waitlisted: "alternate",
    opened: "invited",
    started: "invited",
    canceled: "declined",
    cancelled: "declined",
    "not-registered": "pending-engagement",
    not_registered: "pending-engagement"
  };
  const normalized = aliases[cleaned] || cleaned;
  return allowedGuestRegistrationLifecycleStatuses.has(normalized) ? normalized : fallback;
}

function recordUsesGuestRegistrationLifecycle(key = "", record = {}) {
  return cleanString(key).startsWith(registrantTypes.guest.crmPrefix) ||
    cleanString(key).startsWith(registrantTypes.guest.legacyPrefix) ||
    record?.crmType === registrantTypes.guest.crmType ||
    record?.type === "guest";
}

function recordIsActualGuestOrMemberRegistrant(key = "", record = {}) {
  const cleanKey = cleanString(key);
  return cleanKey.startsWith(registrantTypes.guest.crmPrefix) ||
    cleanKey.startsWith(registrantTypes.guest.legacyPrefix) ||
    cleanKey.startsWith(registrantTypes.member.crmPrefix) ||
    cleanKey.startsWith(registrantTypes.member.legacyPrefix) ||
    record?.crmType === registrantTypes.guest.crmType ||
    record?.crmType === registrantTypes.member.crmType ||
    ["guest-registration", "member-registration"].includes(cleanString(record?.source));
}

function actualRegistrantLifecycleStatus(key = "", record = {}) {
  const status = cleanGuestRegistrationLifecycleStatus(record?.crmStatus || record?.status, "registered");
  return ["scott-engagement", "pending-engagement", "contacted", "confirmed", "invited"].includes(status) ? "registered" : status;
}

function splitName(name = "") {
  const parts = cleanString(name, 240).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] };
}

function cleanTopicTracks(value) {
  const raw = Array.isArray(value) ? value : cleanString(value, 800).split(",");
  return raw
    .map((item) => cleanAllowed(item, allowedTopicTracks, ""))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 12);
}

function cleanArray(value, maxItems = 24, maxLength = 240) {
  const raw = Array.isArray(value) ? value : cleanString(value, 4000).split(/[,;\n]/);
  return raw
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, maxItems);
}

function cleanSourceAttributions(value = [], maxItems = 80) {
  const raw = Array.isArray(value) ? value : [];
  const rows = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const sourceName = cleanString(item.sourceName || item.source || item.name, 160);
    const sourceUrl = normalizeUrl(item.sourceUrl || item.url);
    const candidateSourceUrl = normalizeUrl(item.candidateSourceUrl || item.candidateUrl);
    const sourceProfileUrl = normalizeUrl(item.sourceProfileUrl || item.profileUrl);
    const canonicalDomain = normalizeDomain(item.canonicalDomain || item.domain || item.websiteUrl);
    const key = [
      cleanString(item.sourceId, 180) || companySlug(sourceName),
      sourceUrl,
      candidateSourceUrl,
      sourceProfileUrl,
      canonicalDomain
    ].filter(Boolean).join("|").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      sourceId: cleanString(item.sourceId, 180),
      sourceName,
      sourceType: cleanString(item.sourceType, 120),
      category: cleanString(item.category, 160),
      evidenceType: cleanString(item.evidenceType, 80),
      sourceUrl,
      sourcePageTitle: cleanString(item.sourcePageTitle, 240),
      candidateSourceUrl,
      candidateSourcePageTitle: cleanString(item.candidateSourcePageTitle, 240),
      sourceProfileUrl,
      candidateName: cleanString(item.candidateName || item.companyName, 240),
      canonicalDomain,
      websiteUrl: normalizeUrl(item.websiteUrl || canonicalDomain),
      discoverySegment: cleanString(item.discoverySegment, 120),
      targetEmployeeRange: cleanString(item.targetEmployeeRange, 80),
      valueState: cleanString(item.valueState || "SOURCE_PROVIDED", 80),
      capturedAt: cleanString(item.capturedAt || item.discoveredAt || item.importedAt, 40)
    });
  }
  return rows.slice(-maxItems);
}

function sourceLooksSponsorRelated(source = {}, payload = {}) {
  const text = `${source.sourceType || ""} ${source.category || ""} ${source.sourceName || ""} ${source.description || ""}`.toLowerCase();
  return sourceWantsSponsorCrawl(source, payload) || /sponsor|conference|summit|expo|exhibitor|partner/.test(text);
}

function discoverySourceAttribution({ source = {}, candidate = {}, sourceName = "", sourceUrl = "", title = "", payload = {}, now = "", category = "" } = {}) {
  const sponsorRelated = sourceLooksSponsorRelated(source, payload);
  return cleanSourceAttributions([{
    sourceId: source.sourceId,
    sourceName: sourceName || source.sourceName,
    sourceType: source.sourceType,
    category: category || source.category,
    evidenceType: sponsorRelated ? "event-sponsor" : "company-discovery",
    sourceUrl,
    sourcePageTitle: title,
    candidateSourceUrl: candidate.sourceUrl,
    candidateSourcePageTitle: candidate.sourcePageTitle,
    sourceProfileUrl: candidate.sourceProfileUrl,
    candidateName: candidate.companyName,
    canonicalDomain: candidate.canonicalDomain,
    websiteUrl: candidate.websiteUrl,
    discoverySegment: payload.discoverySegment,
    targetEmployeeRange: payload.targetEmployeeRange,
    valueState: "SOURCE_PROVIDED",
    capturedAt: now
  }], 1)[0] || null;
}

function cleanNumber(value, fallback = 0, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function employeeCountFromText(value = "") {
  const match = cleanString(stripHtml(value), 1200).replace(/,/g, "").match(/\b(\d{1,6})\s+employees?\b/i);
  if (!match) return 0;
  return cleanNumber(match[1], 0, 0, 1000000);
}

function employeeRangeForCount(count = 0) {
  const value = cleanNumber(count, 0, 0, 1000000);
  if (!value) return "";
  if (value <= 50) return "1-50";
  if (value <= 200) return "51-200";
  if (value <= 1000) return "201-1000";
  if (value <= 5000) return "1001-5000";
  if (value <= 10000) return "5001-10000";
  return "10000-plus";
}

function employeeCountMatchesTarget(count = 0, targetRange = "") {
  const value = cleanNumber(count, 0, 0, 1000000);
  const target = cleanString(targetRange, 80);
  if (!value || !target) return true;
  const numbers = target.match(/\d+/g)?.map((number) => Number(number)).filter(Number.isFinite) || [];
  if (!numbers.length) return true;
  const min = Math.min(...numbers);
  const max = numbers.length > 1 ? Math.max(...numbers) : min;
  return value >= min && value <= max;
}

function normalizeDomain(value = "") {
  const raw = cleanString(value, 300).toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^\.+|\.+$/g, "");
  }
}

function normalizeUrl(value = "") {
  const raw = cleanString(value, 500);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function cleanLinkedInProfileUrl(value = "") {
  const raw = cleanString(value, 500).replace(/\s+/g, "");
  if (!raw) return "";
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return "";
  const path = url.pathname.replace(/\/+$/, "");
  if (!/^\/(in|pub)\/[^/]+/i.test(path)) return "";
  url.protocol = "https:";
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function linkedInProfileIdentity(value = "") {
  return cleanLinkedInProfileUrl(value).toLowerCase().replace(/\/+$/, "");
}

function titleCaseWords(value = "") {
  return cleanString(value, 240)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function nameFromLinkedInProfileUrl(value = "") {
  const normalized = cleanLinkedInProfileUrl(value);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const slug = decodeURIComponent((url.pathname.match(/^\/(?:in|pub)\/([^/]+)/i)?.[1] || ""))
      .replace(/\.(?:html?)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!slug) return "";
    const tokens = slug
      .split(" ")
      .filter((token) => token && !/^\d+$/.test(token) && !/^[a-f0-9]{6,}$/i.test(token));
    return titleCaseWords(tokens.slice(0, 4).join(" "));
  } catch {
    return "";
  }
}

function sameRootDomain(left = "", right = "") {
  const normalize = (value) => normalizeDomain(value).split(".").slice(-2).join(".");
  return normalize(left) && normalize(left) === normalize(right);
}

function htmlDecode(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value = "") {
  return htmlDecode(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function htmlTitle(html = "") {
  const title = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanString(stripHtml(title), 240);
}

function htmlMetaDescription(html = "") {
  const match = String(html || "").match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    String(html || "").match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  return cleanString(htmlDecode(match?.[1] || ""), 1000);
}

function domainCompanyName(domain = "", fallback = "") {
  const clean = normalizeDomain(domain);
  const segment = clean.split(".")[0] || fallback;
  return cleanString(companyLabelTitleCase(segment.replace(/[-_]+/g, " ")), 180);
}

function companyLabelTitleCase(value = "") {
  const overrides = new Map([
    ["1password", "1Password"],
    ["openai", "OpenAI"],
    ["ibm", "IBM"],
    ["aws", "AWS"],
    ["nvidia", "NVIDIA"],
    ["servicenow", "ServiceNow"],
    ["salesforce", "Salesforce"],
    ["databricks", "Databricks"],
    ["snowflake", "Snowflake"]
  ]);
  return cleanString(value, 180)
    .split(/\s+/)
    .map((token) => {
      const lower = token.toLowerCase();
      if (overrides.has(lower)) return overrides.get(lower);
      if (/^\d+[a-z]/i.test(token)) return token.replace(/^(\d+)([a-z])/, (_, digits, letter) => `${digits}${letter.toUpperCase()}`);
      if (/^[A-Z0-9&.-]{2,}$/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function htmlAttribute(value = "", name = "") {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(value || "").match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "i"));
  return htmlDecode(match?.[1] || "");
}

function genericSponsorLabel(value = "") {
  const text = cleanString(value, 180).toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (/^(learn more|read more|more info|details|website|visit website|visit site|home|homepage|register|register now|contact|apply|logo|image|view profile|explore all events|keep me updated|add to calendar|sponsors? & exhibitors?)$/i.test(text)) return true;
  if (/^(?:20\d{2}\s+)?(?:premier|platinum|gold|silver|bronze|diamond|title|presenting|lead|strategic|supporting|community|media|startup|innovation)?\s*(?:sponsor|sponsors|sponsorship|partner|partners|exhibitor|exhibitors|booth|package|tier|level)s?$/i.test(text)) return true;
  if (/^20\d{2}\s+(?:premier|platinum|gold|silver|bronze|diamond|title|presenting|lead|strategic|supporting|community|media|startup|innovation)\s+/i.test(text) &&
    /\b(sponsor|partner|exhibitor|package|tier|level)\b/i.test(text)) return true;
  return false;
}

function weakCompanyLabel(value = "") {
  const text = cleanString(value, 180).replace(/\s+/g, " ").trim();
  if (!text) return true;
  const words = text.split(/\s+/);
  if (words.length > 7) return true;
  if (/\s\/\s/.test(text)) return true;
  if (/[.!?]$/.test(text) && words.length > 3) return true;
  if (/[$€£]\d|\d+%|["“”]|\b(percent|trillion|billion|million|according|report|study|article|research|said|says|read|watch|download|subscribe|newsletter|privacy|terms|careers|jobs|hiring|damage|inflicted|sensitive information|pioneer|provider|award|awards|blog|cybercrime|market cap|agenda at a glance|sponsorships|attending companies)\b/i.test(text)) return true;
  return false;
}

function prospectCandidateDomain(domain = "") {
  let normalized = normalizeDomain(domain);
  normalized = normalized.replace(/^(careers|jobs|about|investors|ir|blog|resources)\./i, "");
  return normalized;
}

function companyNameDecisionFromLink({ domain = "", text = "", innerHtml = "", attributes = "" } = {}) {
  const candidates = [
    ["text", text],
    ["image-alt", htmlAttribute(innerHtml, "alt")],
    ["image-title", htmlAttribute(innerHtml, "title")],
    ["image-aria-label", htmlAttribute(innerHtml, "aria-label")],
    ["link-title", htmlAttribute(attributes, "title")],
    ["link-aria-label", htmlAttribute(attributes, "aria-label")]
  ];
  let rejectedLabel = "";
  for (const [source, candidate] of candidates) {
    const clean = cleanString(stripHtml(candidate), 180).replace(/\s+/g, " ").replace(/\s+(?:logo|image)$/i, "").trim();
    if (!clean) continue;
    if (genericSponsorLabel(clean)) {
      if (!rejectedLabel) rejectedLabel = clean;
      continue;
    }
    if (weakCompanyLabel(clean)) {
      if (!rejectedLabel) rejectedLabel = clean;
      continue;
    }
    return {
      companyName: companyLabelTitleCase(clean),
      nameSource: source,
      rawLabel: clean,
      rejectedLabel
    };
  }
  return {
    companyName: domainCompanyName(domain),
    nameSource: rejectedLabel ? "domain-fallback" : "domain",
    rawLabel: cleanString(text, 180),
    rejectedLabel
  };
}

function companyNameFromLink(options = {}) {
  return companyNameDecisionFromLink(options).companyName;
}

function recordDiscoveryDiagnostic(debug, type, entry = {}) {
  if (!debug || !Array.isArray(debug[type]) || debug[type].length >= 40) return;
  debug[type].push({
    href: cleanString(entry.href, 500),
    domain: normalizeDomain(entry.domain),
    rawLabel: cleanString(entry.rawLabel, 180),
    companyName: cleanString(entry.companyName, 180),
    nameSource: cleanString(entry.nameSource, 80),
    reason: cleanString(entry.reason, 240)
  });
}

function discoveryCategoryForSource(source = {}) {
  const text = `${source.sourceName || ""} ${source.sourceType || ""} ${source.category || ""} ${source.description || ""}`.toLowerCase();
  if (/cyber|security|risk|zero trust|threat/.test(text)) return "Cybersecurity";
  if (/cloud|infrastructure|devops|platform|data/.test(text)) return "Cloud / IT Infrastructure";
  if (/b2b saas|saas/.test(text)) return "B2B SaaS";
  if (/enterprise software|workflow|automation|software/.test(text)) return "Enterprise Software";
  if (/governance|responsible|trust|risk|compliance/.test(text)) return "AI Governance";
  if (/agent|ai|machine learning|generative/.test(text)) return "AI-Enabled Software";
  if (/sponsor|conference|summit|expo|exhibitor|partner/.test(text)) return "Technology Event Sponsor";
  return "AI-Enabled Technology";
}

function discoveryDescriptionForCandidate(candidate = {}, source = {}, title = "") {
  const sourceType = cleanString(source.sourceType || "discovery source", 120);
  const sourceName = cleanString(source.sourceName || "starter source", 160);
  const pageTitle = cleanString(title, 240);
  const candidateDescription = cleanString(candidate.description, 900);
  return cleanString(`${candidate.companyName || candidate.canonicalDomain} was found from ${sourceName}, a ${sourceType}${pageTitle ? ` page titled "${pageTitle}"` : ""}.${candidateDescription ? ` Source description: ${candidateDescription}` : ""}`, 1400);
}

function discoveryReasonForCandidate(candidate = {}, source = {}, title = "") {
  const category = discoveryCategoryForSource(source);
  const sourceName = cleanString(source.sourceName || "starter source", 160);
  const label = cleanString(candidate.rawLabel || candidate.companyName || candidate.canonicalDomain, 180);
  const titleText = cleanString(title, 240);
  return cleanString(`Discovered as ${label} from ${sourceName}. Initial category is ${category}; treat this as an AI-enabled or AI-budget-relevant technology prospect, then use website analysis or human review to confirm the specific AI leverage and sponsorship interest.${titleText ? ` Source page title: ${titleText}.` : ""}`, 1200);
}

function blockedDiscoveryDomain(domain = "") {
  const normalized = normalizeDomain(domain);
  if (!normalized) return true;
  if (!normalized.includes(".")) return true;
  return [...discoveryBlockedDomains].some((blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`));
}

function sourceWantsSponsorCrawl(source = {}, payload = {}) {
  const text = `${source.sourceType || ""} ${source.category || ""} ${source.sourceName || ""} ${source.description || ""}`.toLowerCase();
  return payload.crawlSponsorPages === true || source.crawlSponsorPages === true || /\bevent sponsor crawl\b|organizer sponsor crawl|sponsor crawl/.test(text);
}

function sponsorPageScore(href = "", text = "") {
  const haystack = `${href || ""} ${stripHtml(text || "")}`.toLowerCase();
  let score = 0;
  if (/\bsponsors?\b|sponsorship|sponsor-exhibitor|sponsors-exhibitors/.test(haystack)) score += 8;
  if (/\bexhibitors?\b|exhibit hall|business hall|expo hall/.test(haystack)) score += 7;
  if (/\bpartners?\b|solution providers?|vendors?\b/.test(haystack)) score += 4;
  if (/\bmarketplace|showcase|startup city|ai zone|innovation hub|business hall/.test(haystack)) score += 3;
  if (/\battending companies|companies attending|supplier directory/.test(haystack)) score += 3;
  if (/\bcontact|privacy|terms|login|register|agenda|speaker|venue|hotel|travel|faq\b/.test(haystack) && score < 7) score -= 4;
  return score;
}

function extractSponsorCrawlLinks(html = "", sourceUrl = "", limit = 6, debug = null) {
  const sourceRoot = normalizeDomain(sourceUrl);
  const currentUrl = normalizeUrl(sourceUrl);
  const links = new Map();
  const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(String(html || "")))) {
    const href = cleanString(match[2], 1000);
    const innerHtml = match[4] || "";
    const text = stripHtml(innerHtml).replace(/\s+/g, " ").trim();
    let url;
    try {
      url = new URL(href, currentUrl || "https://example.com");
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol)) continue;
    const domain = normalizeDomain(url.hostname);
    if (!sameRootDomain(domain, sourceRoot)) continue;
    url.hash = "";
    const normalized = normalizeUrl(url.toString());
    if (!normalized || normalized === currentUrl) continue;
    if (/\.(pdf|png|jpe?g|gif|webp|svg|zip|ics)$/i.test(url.pathname)) continue;
    const score = sponsorPageScore(normalized, text);
    if (score <= 0) continue;
    const previous = links.get(normalized);
    if (!previous || previous.score < score) {
      links.set(normalized, { url: normalized, text, score });
    }
  }
  const sorted = [...links.values()]
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, limit);
  for (const link of sorted) {
    recordDiscoveryDiagnostic(debug, "accepted", {
      href: link.url,
      rawLabel: link.text,
      reason: `sponsor-page-crawl:${link.score}`
    });
  }
  return sorted.map((link) => link.url);
}

function mergeDiscoveryCandidates(candidateGroups = [], limit = 75) {
  const merged = new Map();
  for (const group of candidateGroups) {
    for (const candidate of group.candidates || []) {
      if (merged.size >= limit) break;
      const key = candidate.canonicalDomain ? `domain:${candidate.canonicalDomain}` : `name:${companySlug(candidate.companyName)}`;
      if (!key || merged.has(key)) continue;
      merged.set(key, {
        ...candidate,
        sourceUrl: candidate.sourceUrl || group.url,
        sourcePageTitle: candidate.sourcePageTitle || group.title,
        sourcePageRole: group.role || ""
      });
    }
    if (merged.size >= limit) break;
  }
  return [...merged.values()];
}

function extractCompanyLinks(html = "", sourceUrl = "", limit = 40, debug = null) {
  const sourceDomain = normalizeDomain(sourceUrl);
  const links = new Map();
  function sourceProfileLabel(text = "") {
    return cleanString(stripHtml(text), 300)
      .replace(/\s+/g, " ")
      .replace(/\s+[SWFP]\d{4}\s+Active.*$/i, "")
      .replace(/\s+Active\s*[•|-].*$/i, "")
      .replace(/\s*[•|-]\s*\d{1,6}\s+employees?.*$/i, "")
      .trim();
  }
  function addNamedCandidate(companyName = "", sourceProfileUrl = "", description = "", reason = "structured-list-name") {
    if (links.size >= limit) return;
    const clean = cleanString(stripHtml(companyName), 180).replace(/\s+/g, " ").replace(/\s+(?:logo|image)$/i, "").trim();
    if (!clean || genericSponsorLabel(clean) || weakCompanyLabel(clean)) {
      recordDiscoveryDiagnostic(debug, "rejected", { href: sourceProfileUrl || sourceUrl, rawLabel: companyName, reason: "weak-structured-name" });
      return;
    }
    const slug = companySlug(clean);
    if (!slug) return;
    const key = `name:${slug}`;
    if (links.has(key)) return;
    const profileUrl = normalizeUrl(sourceProfileUrl);
    const employeeCount = employeeCountFromText(`${companyName} ${description}`);
    links.set(key, {
      companyName: companyLabelTitleCase(clean),
      canonicalDomain: "",
      websiteUrl: "",
      sourceUrl,
      sourceProfileUrl: profileUrl,
      description: cleanString(description, 1000),
      employeeCount: employeeCount ? String(employeeCount) : "",
      employeeRange: employeeRangeForCount(employeeCount),
      companySizeEvidence: employeeCount ? cleanString(description || companyName, 1000) : "",
      rawLabel: clean,
      nameSource: "structured-list-name"
    });
    recordDiscoveryDiagnostic(debug, "accepted", {
      href: profileUrl || sourceUrl,
      rawLabel: clean,
      companyName: companyLabelTitleCase(clean),
      nameSource: "structured-list-name",
      reason
    });
  }
  function addCandidate(href = "", text = "", innerHtml = "", attributes = "", reason = "accepted") {
    if (links.size >= limit) return;
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    let url;
    try {
      url = new URL(href, normalizeUrl(sourceUrl || "https://example.com"));
    } catch {
      return;
    }
    if (!["http:", "https:"].includes(url.protocol)) return;
    const domain = prospectCandidateDomain(url.hostname);
    if (!domain) {
      recordDiscoveryDiagnostic(debug, "rejected", { href, rawLabel: text, reason: "missing-domain" });
      return;
    }
    if (blockedDiscoveryDomain(domain)) {
      recordDiscoveryDiagnostic(debug, "rejected", { href, domain, rawLabel: text, reason: "blocked-domain" });
      return;
    }
    if (sameRootDomain(domain, sourceDomain)) {
      const path = `${url.pathname || ""} ${href || ""}`.toLowerCase();
      if (/\/compan(?:y|ies)\//.test(path) || /\/startups?\//.test(path)) {
        const profileLabel = sourceProfileLabel(text);
        if (profileLabel) addNamedCandidate(profileLabel, url.toString(), text, "source-profile-link");
        return;
      }
      recordDiscoveryDiagnostic(debug, "rejected", { href, domain, rawLabel: text, reason: "same-source-domain" });
      return;
    }
    const nameDecision = companyNameDecisionFromLink({ domain, text, innerHtml, attributes });
    if (!links.has(domain)) {
      const employeeCount = employeeCountFromText(text);
      links.set(domain, {
        companyName: nameDecision.companyName,
        canonicalDomain: domain,
        websiteUrl: `${url.protocol}//${domain}/`,
        sourceUrl,
        employeeCount: employeeCount ? String(employeeCount) : "",
        employeeRange: employeeRangeForCount(employeeCount),
        companySizeEvidence: employeeCount ? cleanString(text, 1000) : "",
        rawLabel: nameDecision.rawLabel || text,
        nameSource: nameDecision.nameSource
      });
      recordDiscoveryDiagnostic(debug, "accepted", {
        href,
        domain,
        rawLabel: nameDecision.rawLabel || text,
        companyName: nameDecision.companyName,
        nameSource: nameDecision.nameSource,
        reason: nameDecision.rejectedLabel ? `ignored generic label: ${nameDecision.rejectedLabel}` : reason
      });
    }
  }

  const decoded = htmlDecode(String(html || ""));
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(String(html || ""))) && links.size < limit) {
    const attributes = scriptMatch[1] || "";
    if (!/ld(?:\+|&#x2b;|&#43;)json/i.test(attributes)) continue;
    try {
      const data = JSON.parse(htmlDecode(scriptMatch[2] || "").trim());
      const visit = (value) => {
        if (links.size >= limit || value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (typeof value !== "object") return;
        const type = cleanString(value["@type"], 80).toLowerCase();
        const name = cleanString(value.name, 180);
        const profileUrl = normalizeUrl(value.url);
        const description = cleanString(value.description, 1000);
        if (name && (type.includes("listitem") || /\/company\//i.test(profileUrl)) && !/^top\b/i.test(name)) {
          addNamedCandidate(name, profileUrl, description, "json-ld-item-list");
        }
        Object.values(value).forEach(visit);
      };
      visit(data);
    } catch (error) {
      recordDiscoveryDiagnostic(debug, "rejected", { href: sourceUrl, reason: `json-ld-parse-failed: ${error.message}` });
    }
  }

  const structuredCompanyPattern = /"name"\s*:\s*"([^"]{2,160})"[\s\S]{0,1600}?"website"\s*:\s*"(https?:\/\/[^"]+)"/gi;
  let structuredMatch;
  while ((structuredMatch = structuredCompanyPattern.exec(decoded)) && links.size < limit) {
    addCandidate(structuredMatch[2], structuredMatch[1], structuredMatch[1], "", "structured-company-record");
  }

  const markdownLinkPattern = /\[([^\]]{2,160})\]\((https?:\/\/[^)\s]+)\)/g;
  let markdownMatch;
  while ((markdownMatch = markdownLinkPattern.exec(decoded)) && links.size < limit) {
    addCandidate(markdownMatch[2], markdownMatch[1], markdownMatch[1], "", "markdown-link");
  }

  const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(String(html || ""))) && links.size < limit) {
    const attributes = `${match[1] || ""} ${match[3] || ""}`;
    const href = cleanString(match[2], 1000);
    const innerHtml = match[4] || "";
    const text = stripHtml(innerHtml).replace(/\s+/g, " ").trim();
    addCandidate(href, text, innerHtml, attributes, "anchor-link");
  }
  return [...links.values()];
}

function signalScore(text = "", terms = []) {
  const haystack = String(text || "").toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function classifyWebsiteText(text = "") {
  const haystack = String(text || "").toLowerCase();
  const categoryHits = aiCategorySignals
    .map(([category, terms]) => ({ category, hits: signalScore(haystack, terms) }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const buyerHits = executiveBuyerSignals
    .map(([role, terms]) => ({ role, hits: signalScore(haystack, terms) }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const aiTerms = [
    "artificial intelligence",
    " ai ",
    "machine learning",
    "generative ai",
    "large language model",
    " llm",
    "automation",
    "predictive",
    "model",
    "agent"
  ];
  const enterpriseTerms = ["enterprise", "security", "governance", "compliance", "platform", "workflow", "global", "teams", "customers", "business"];
  const aiHits = signalScore(` ${haystack} `, aiTerms);
  const enterpriseHits = signalScore(haystack, enterpriseTerms);
  const categories = categoryHits.map((entry) => entry.category).slice(0, 5);
  const targetBuyers = buyerHits.map((entry) => entry.role).slice(0, 6);
  const aiRelevance = cleanNumber(Math.min(100, 25 + aiHits * 12 + categoryHits.reduce((sum, entry) => sum + entry.hits, 0) * 8), aiHits ? 55 : 25);
  const enterpriseFocus = cleanNumber(Math.min(100, 30 + enterpriseHits * 8 + targetBuyers.length * 7), enterpriseHits ? 55 : 35);
  return {
    isAiVendor: aiHits > 0 || categoryHits.length > 0,
    aiNative: aiHits >= 3 || haystack.includes("generative ai") || haystack.includes("large language model"),
    aiRelevance,
    enterpriseFocus,
    eventPartnerFit: cleanNumber((aiRelevance + enterpriseFocus + (targetBuyers.length ? 80 : 45)) / 3),
    categories,
    targetBuyers,
    reason: categories.length
      ? `Website language matched ${categories.slice(0, 3).join(", ")} signals${targetBuyers.length ? ` and target buyer roles including ${targetBuyers.slice(0, 3).join(", ")}` : ""}.`
      : aiHits
        ? "Website language indicates AI-enabled products or services, but category needs human review."
        : "No strong AI vendor signal found in the fetched website text."
  };
}

async function fetchPublicHtml(url = "") {
  const target = normalizeUrl(url);
  if (!target) throw new Error("A source URL is required.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 15000);
  let response;
  try {
    response = await fetch(target, {
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "MojoAIProspectingBot/0.1 (+https://mojoaisummits.com)"
      },
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Fetch timed out for ${target}.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Fetch failed with ${response.status} for ${target}.`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml") &&
    !contentType.includes("text/plain") &&
    !contentType.includes("text/markdown")) {
    throw new Error("Discovery source did not return HTML.");
  }
  const html = await response.text();
  if (/cf-chl|__cf_chl_|Checking your browser|Just a moment/i.test(html)) {
    throw new Error(`Discovery source is protected by an anti-bot challenge for ${target}.`);
  }
  return { url: target, html: cleanString(html, 500000) };
}

function parseCsvLine(line = "") {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCompanyImportRows(value = "") {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const firstValues = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
  const hasHeader = firstValues.some((item) =>
    ["company", "companyname", "company name", "domain", "canonicaldomain", "canonical domain", "website", "websiteurl", "website url"].includes(item)
  );
  const headers = hasHeader
    ? firstValues.map((item) => item.replace(/\s+/g, ""))
    : ["companyname", "canonicaldomain", "websiteurl", "linkedincompanyurl", "primarycategory", "categories", "sourceurls"];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return {
      companyName: row.companyname || row.company || row.name,
      canonicalDomain: row.canonicaldomain || row.domain,
      websiteUrl: row.websiteurl || row.website || row.url,
      linkedinCompanyUrl: row.linkedincompanyurl || row.linkedin,
      primaryCategory: row.primarycategory || row.category,
      categories: row.categories,
      sourceUrls: row.sourceurls || row.sourceurl,
      description: row.description,
      classificationReason: row.reason || row.classificationreason
    };
  }).filter((row) => cleanString(row.companyName || row.canonicalDomain || row.websiteUrl));
}

function priorityBand(score = 0) {
  const value = cleanNumber(score);
  if (value >= 90) return "Immediate";
  if (value >= 75) return "Tier A";
  if (value >= 60) return "Tier B";
  if (value >= 40) return "Nurture";
  return "Database Only";
}

function companySizeScore(value = "") {
  const normalized = cleanString(value).toLowerCase();
  if (/(201|1001|5001|10000|\d{3,})/.test(normalized)) return 85;
  if (/(51|50|200)/.test(normalized)) return 65;
  if (/(1-|2-|10|small|startup)/.test(normalized)) return 45;
  return 50;
}

function prospectScore(record = {}, weights = defaultPartnerScoreWeights) {
  if (record.partnerScoreOverride !== undefined && record.partnerScoreOverride !== null && record.partnerScoreOverride !== "") {
    return cleanNumber(record.partnerScoreOverride);
  }
  const signals = {
    aiRelevance: cleanNumber(record.aiRelevanceScore),
    enterpriseFocus: cleanNumber(record.enterpriseFocus),
    executiveAudienceOverlap: cleanArray(record.targetExecutiveRoles).length ? 85 : 50,
    companySize: companySizeScore(record.employeeRange || record.employeeCount),
    fundingRevenueCapacity: cleanString(record.fundingStage || record.fundingTotal || record.revenueEstimate) ? 70 : 45,
    eventSponsorshipHistory: cleanNumber(record.eventSponsorshipHistoryScore, 45),
    marketingMaturity: cleanNumber(record.marketingMaturityScore, 50),
    partnershipTeam: cleanNumber(record.partnershipTeamScore, cleanArray(record.targetExecutiveRoles).some((role) => /partner|alliance|ecosystem/i.test(role)) ? 80 : 45),
    marketPresence: cleanString(record.headquartersCountry || record.headquartersState || record.headquartersCity) ? 65 : 45,
    recentGrowthFunding: cleanNumber(record.recentGrowthFundingScore, cleanString(record.fundingStage || record.fundingTotal) ? 70 : 45)
  };
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 100;
  const weighted = Object.entries(weights).reduce((sum, [key, weight]) => sum + (signals[key] || 0) * Number(weight || 0), 0);
  return cleanNumber(weighted / totalWeight);
}

function cleanScoreWeights(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(defaultPartnerScoreWeights).map(([key, fallback]) => [
    key,
    cleanNumber(source[key], fallback, 0, 100)
  ]));
}

async function partnerScoreConfig(env) {
  const stored = await readRawRecord(env, PARTNER_PROSPECT_SCORE_CONFIG_KEY);
  return {
    key: PARTNER_PROSPECT_SCORE_CONFIG_KEY,
    weights: cleanScoreWeights(stored?.weights || stored),
    updatedAt: cleanString(stored?.updatedAt),
    updatedBy: cleanString(stored?.updatedBy, 180)
  };
}

function normalizeActivity(entry = {}) {
  return {
    id: cleanString(entry.id, 120) || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: cleanString(entry.createdAt) || new Date().toISOString(),
    type: cleanAllowed(entry.type, allowedActivityTypes, "note"),
    owner: cleanString(entry.owner, 180),
    text: cleanString(entry.text || entry.note || entry.body),
    nextAction: cleanAllowed(entry.nextAction, allowedNextActions, ""),
    dueDate: cleanString(entry.dueDate, 40)
  };
}

function cleanCode(value) {
  return cleanString(value).replace(/\D/g, "").slice(0, 6);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(value).toLowerCase());
}

function cleanEmailList(values = [], exclude = []) {
  const excluded = new Set(exclude.map((value) => cleanString(value).toLowerCase()).filter(Boolean));
  const seen = new Set();
  return values
    .map((value) => cleanString(value, 240).toLowerCase())
    .filter((value) => isEmail(value) && !excluded.has(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function cleanBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function invitePersonName(record = {}) {
  const name = cleanString(record?.name || record?.contactName || record?.intendedGuestName || record?.invitedName || record?.guestName || record?.partnerContactName || record?.usedByName);
  return isEmail(name) ? "" : name;
}

function invitePersonEmail(record = {}) {
  const email = cleanString(record?.email || record?.contactEmail || record?.intendedGuestEmail || record?.invitedEmail || record?.guestEmail || record?.partnerContactEmail || record?.usedByEmail || record?.usedBy).toLowerCase();
  if (isEmail(email)) return email;
  const name = cleanString(record?.name || record?.contactName || record?.intendedGuestName || record?.invitedName || record?.guestName || record?.partnerContactName).toLowerCase();
  return isEmail(name) ? name : "";
}

function cleanInviteType(value) {
  return value === "member" ? "member" : "guest";
}

function cleanGuestRegistrationType(value) {
  return {
    "partner-candidate": "partner-candidate",
    "partner candidate": "partner-candidate",
    "featured-partner": "featured-partner",
    "featured-guest": "featured-guest",
    "featured-member": "featured-member",
    "featured-author": "featured-author",
    "featured author": "featured-author",
    partner: "partner",
    presenter: "presenter",
    roundtable: "roundtable-leader",
    "roundtable-leader": "roundtable-leader",
    member: "member",
    guest: "guest"
  }[cleanString(value, 80).toLowerCase()] || "guest";
}

function cleanOptionalRegistrationType(value) {
  const raw = cleanString(value, 80);
  return raw ? cleanGuestRegistrationType(raw) : "";
}

function cleanContactEventRole(value) {
  const raw = cleanString(value, 120).toLowerCase();
  const exact = cleanGuestRegistrationType(raw);
  if (exact !== "guest" || raw === "guest") return exact;
  if (raw.includes("partner candidate")) return "partner-candidate";
  if (raw.includes("featured partner")) return "featured-partner";
  if (raw.includes("featured guest")) return "featured-guest";
  if (raw.includes("featured member")) return "featured-member";
  if (raw.includes("featured author")) return "featured-author";
  if (raw.includes("round table") || raw.includes("roundtable")) return "roundtable-leader";
  if (raw.includes("presenter") || raw.includes("speaker")) return "presenter";
  if (raw.includes("partner")) return "partner";
  if (raw.includes("member")) return "member";
  return "guest";
}

function contactEventRoleLabel(value) {
  return {
    "partner-candidate": "Partner Candidate",
    "featured-partner": "Featured Partner",
    "featured-guest": "Featured Guest",
    "featured-member": "Featured Member",
    "featured-author": "Featured Author",
    partner: "Partner Guest",
    presenter: "Presenter",
    "roundtable-leader": "Round Table Leader",
    member: "Member",
    guest: "Guest"
  }[cleanContactEventRole(value)] || "Guest";
}

function contactEventStrategicRole(value) {
  const role = cleanContactEventRole(value);
  if (role === "presenter") return "speaker";
  if (role === "roundtable-leader") return "roundtable-leader";
  if (role === "featured-author") return "research-contributor";
  if (role === "partner-candidate" || role === "partner" || role === "featured-partner") return "partner";
  return "attendee";
}

function requiresSingleShowRegistrationRole(role) {
  return ["featured-guest", "featured-author", "featured-partner"].includes(cleanGuestRegistrationType(role));
}

function cleanEventShowId(value, fallback = "both") {
  const raw = cleanString(value, 80).toLowerCase();
  const normalized = raw.replace(/[\s_]+/g, "-");
  const compact = raw.replace(/[^a-z0-9]/g, "");
  if (!raw) return fallback;
  if (normalized.includes("morning") || compact.includes("10am") || compact.includes("1000am") || compact === "10") return "morning";
  if (normalized.includes("afternoon") || compact.includes("1pm") || compact.includes("100pm") || compact.includes("1300") || compact === "1" || compact === "13") return "afternoon";
  if (["am", "10", "10am", "1000", "1000am"].includes(compact)) return "morning";
  if (["pm", "1", "1pm", "100", "100pm", "1300"].includes(compact)) return "afternoon";
  if (["both", "all", "bothshows"].includes(compact)) return "both";
  return fallback;
}

function cleanGuestMatrixOption(value, allowed, fallback = "") {
  const normalized = cleanString(value, 80).toLowerCase().replace(/[\s_]+/g, "-");
  return allowed.has(normalized) ? normalized : fallback;
}

function eventShowLabel(showId) {
  return {
    morning: "Morning show",
    afternoon: "Afternoon show",
    both: "Both shows"
  }[cleanEventShowId(showId)] || "Both shows";
}

function eventShowTime(showId) {
  return {
    morning: "10:00 am - 11:30 am CT",
    afternoon: "1:00 pm - 2:30 pm CT",
    both: "10:00 am - 11:30 am CT and 1:00 pm - 2:30 pm CT"
  }[cleanEventShowId(showId)] || "10:00 am - 11:30 am CT and 1:00 pm - 2:30 pm CT";
}

function eventShowKey(record = {}) {
  return cleanEventShowId(record.eventShowId || record.showId || record.eventShow || record.show, "");
}

function randomInviteCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
}

function randomMemberPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*?";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeRecord(key, record) {
  const createdAt = cleanString(record?.createdAt) || key.split(":").slice(-2, -1)[0] || "";
  return {
    key,
    id: cleanString(record?.id) || key,
    createdAt,
    name: cleanString(record?.name || invitePersonName(record)),
    company: cleanString(record?.company || record?.partnerCompany || record?.organization),
    title: cleanString(record?.title || record?.jobTitle || record?.roleTitle || record?.contactTitle),
    industry: cleanString(record?.industry),
    email: cleanString(record?.email || invitePersonEmail(record)).toLowerCase(),
    phone: cleanString(record?.phone),
    photoUrl: cleanString(record?.photoUrl || record?.photoURL || record?.photo, 500),
    photoKey: safeObjectKey(record?.photoKey),
    photoOriginalName: cleanString(record?.photoOriginalName),
    photoContentType: cleanString(record?.photoContentType),
    photoSize: Number.isFinite(Number(record?.photoSize)) ? Number(record.photoSize) : 0,
    photoUploadedAt: cleanString(record?.photoUploadedAt),
    companyLogoUrl: cleanString(record?.companyLogoUrl || record?.partnerCompanyLogoUrl || record?.logoUrl, 500),
    companyLogoKey: safeObjectKey(record?.companyLogoKey || record?.partnerCompanyLogoKey || record?.logoKey),
    companyLogoOriginalName: cleanString(record?.companyLogoOriginalName || record?.partnerCompanyLogoOriginalName),
    companyLogoContentType: cleanString(record?.companyLogoContentType || record?.partnerCompanyLogoContentType),
    companyLogoSize: Number.isFinite(Number(record?.companyLogoSize)) ? Number(record.companyLogoSize) : 0,
    companyLogoUploadedAt: cleanString(record?.companyLogoUploadedAt || record?.partnerCompanyLogoUploadedAt),
    inviteCode: cleanString(record?.inviteCode),
    invitedBy: cleanString(record?.invitedBy || record?.inviter || record?.invitedByName || record?.createdBy, 180),
    phoneVerificationStatus: cleanString(record?.phoneVerificationStatus) || "unverified",
    eventId: cleanString(record?.eventId),
    eventSlug: cleanString(record?.eventSlug),
    eventName: cleanString(record?.eventName),
    eventDate: cleanString(record?.eventDate),
    eventTime: cleanString(record?.eventTime),
    eventAccessLink: cleanString(record?.eventAccessLink || record?.accessLink || record?.joinUrl || record?.zoomUrl || record?.zoomJoinUrl, 1000),
    accessLink: cleanString(record?.accessLink || record?.eventAccessLink || record?.joinUrl || record?.zoomUrl || record?.zoomJoinUrl, 1000),
    zoomJoinUrl: cleanString(record?.zoomJoinUrl || record?.eventAccessLink || record?.accessLink || record?.joinUrl || record?.zoomUrl, 1000),
    eventShowId: cleanEventShowId(record?.eventShowId || record?.showId || record?.eventShow, ""),
    eventShowLabel: cleanString(record?.eventShowLabel) || (record?.eventShowId ? eventShowLabel(record.eventShowId) : ""),
    eventShowTime: cleanString(record?.eventShowTime) || cleanString(record?.eventTime),
    intendedGuestName: invitePersonName(record),
    intendedGuestEmail: invitePersonEmail(record),
    invitedEmail: invitePersonEmail(record),
    invitedName: invitePersonName(record),
    guestRegistrationType: cleanGuestRegistrationType(record?.guestRegistrationType || record?.registrationRole),
    partnerRegistrationType: cleanOptionalRegistrationType(record?.partnerRegistrationType || record?.registrationRole),
    registrationRole: cleanGuestRegistrationType(record?.registrationRole || record?.partnerRegistrationType || record?.guestRegistrationType),
    partnerCompany: cleanString(record?.partnerCompany),
    partnerTier: cleanString(record?.partnerTier),
    partnerProductTypes: cleanString(record?.partnerProductTypes, 2000),
    partnerClientMessaging: cleanString(record?.partnerClientMessaging, 4000),
    partnerLinkedInPromotionText: cleanString(record?.partnerLinkedInPromotionText || record?.partnerPromotionText || record?.partnerHypeText, 4000),
    partnerPassword: cleanString(record?.partnerPassword, 120),
    partnerPasswordGeneratedAt: cleanString(record?.partnerPasswordGeneratedAt),
    partnerPasswordGeneratedBy: cleanString(record?.partnerPasswordGeneratedBy),
    memberTier: cleanString(record?.memberTier) || "Fellow",
    memberStatus: cleanString(record?.memberStatus),
    memberPassword: cleanString(record?.memberPassword, 120),
    memberPasswordGeneratedAt: cleanString(record?.memberPasswordGeneratedAt),
    memberPasswordGeneratedBy: cleanString(record?.memberPasswordGeneratedBy),
    acceptedAt: cleanString(record?.acceptedAt),
    isPresenter: Boolean(record?.isPresenter),
    isRoundtableLeader: Boolean(record?.isRoundtableLeader),
    isFeaturedGuest: Boolean(record?.isFeaturedGuest),
    isFeaturedMember: Boolean(record?.isFeaturedMember),
    isFeaturedAuthor: Boolean(record?.isFeaturedAuthor),
    isFeaturedPartner: Boolean(record?.isFeaturedPartner),
    potentialSponsor: record?.potentialSponsor === true || record?.isPotentialSponsor === true || record?.sponsorProspect === true,
    publicationUseName: Boolean(record?.publicationUseName),
    publicationUseCompany: Boolean(record?.publicationUseCompany),
    attended: record?.attended === true,
    attendedCount: record?.attended === true ? 1 : 0,
    attendanceStatus: cleanString(record?.attendanceStatus) || "not_recorded",
    attendedAt: cleanString(record?.attendedAt),
    attendanceUpdatedAt: cleanString(record?.attendanceUpdatedAt),
    attendanceUpdatedBy: cleanString(record?.attendanceUpdatedBy),
    crmStatus: recordIsActualGuestOrMemberRegistrant(key, record)
      ? actualRegistrantLifecycleStatus(key, record)
      : recordUsesGuestRegistrationLifecycle(key, record)
      ? cleanGuestRegistrationLifecycleStatus(record?.crmStatus || record?.status, "contacted")
      : allowedStatuses.has(record?.crmStatus) ? record.crmStatus : "new",
    crmNotes: cleanString(record?.crmNotes),
    eventNotes: cleanEventNotes(record),
    registrationNotes: cleanEventNotes(record),
    preRegistrationNotes: cleanPreRegistrationNotes(record),
    crmUpdatedAt: cleanString(record?.crmUpdatedAt),
    crmUpdatedBy: cleanString(record?.crmUpdatedBy),
    manualPartner: record?.manualPartner === true,
    source: cleanString(record?.source)
  };
}

function normalizeContactRecord(key, record = {}) {
  const events = Array.isArray(record.events) ? record.events : [];
  const activity = (Array.isArray(record.activity) ? record.activity : [])
    .map(normalizeActivity)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const sortedEvents = [...events].sort((a, b) => {
    const left = cleanString(b.eventDate || b.registeredAt || b.updatedAt);
    const right = cleanString(a.eventDate || a.registeredAt || a.updatedAt);
    return left.localeCompare(right);
  });
  const latestEvent = sortedEvents[0] || {};
  const keyIdentity = cleanString(key.replace(/^crm:contact:/, ""));
  const recordEmail = cleanString(record.email).toLowerCase();
  const keyEmail = keyIdentity.toLowerCase();
  const email = isEmail(recordEmail) ? recordEmail : isEmail(keyEmail) ? keyEmail : "";
  const id = email || cleanString(record.id) || keyIdentity || key;
  const contactStatus = contactStatusFromRegistration(latestEvent.registrationType || record.registrationType || record.source);
  const fullName = cleanString(record.name || record.intendedGuestName || record.invitedName || record.guestName) || email || "Name not recorded";
  const fallbackName = splitName(fullName);
  const publicationUseName = record.publicationUseName === true || sortedEvents.some((event) => event?.publicationUseName === true);
  const publicationUseCompany = record.publicationUseCompany === true || sortedEvents.some((event) => event?.publicationUseCompany === true);
  return {
    key,
    id,
    createdAt: cleanString(record.createdAt),
    updatedAt: cleanString(record.updatedAt),
    name: fullName,
    firstName: cleanString(record.firstName || fallbackName.firstName, 120),
    lastName: cleanString(record.lastName || fallbackName.lastName, 120),
    company: cleanString(record.company),
    title: cleanString(record.title),
    linkedinProfileUrl: cleanLinkedInProfileUrl(record.linkedinProfileUrl || record.linkedInProfileUrl || record.linkedinUrl || record.linkedInUrl),
    photoUrl: cleanString(record.photoUrl || record.photoURL || record.photo, 500),
    photoKey: safeObjectKey(record.photoKey),
    companyLogoUrl: cleanString(record.companyLogoUrl || record.partnerCompanyLogoUrl || record.logoUrl, 500),
    companyLogoKey: safeObjectKey(record.companyLogoKey || record.partnerCompanyLogoKey || record.logoKey),
    companyLogoOriginalName: cleanString(record.companyLogoOriginalName || record.partnerCompanyLogoOriginalName),
    companyLogoUploadedAt: cleanString(record.companyLogoUploadedAt || record.partnerCompanyLogoUploadedAt),
    bio: cleanString(record.bio || record.biography, 4000),
    executiveFunction: cleanAllowed(record.executiveFunction, allowedExecutiveFunctions, ""),
    industry: cleanString(record.industry),
    companySize: cleanAllowed(record.companySize, allowedCompanySizes, ""),
    organizationType: cleanAllowed(record.organizationType, allowedOrganizationTypes, ""),
    city: cleanString(record.city, 120),
    state: cleanString(record.state, 80),
    timeZone: cleanString(record.timeZone, 120),
    location: cleanString(record.location, 180) || [cleanString(record.city, 120), cleanString(record.state, 80)].filter(Boolean).join(", "),
    email,
    phone: cleanString(record.phone),
    source: cleanString(record.source),
    sourceMatrixProspectKey: cleanString(record.sourceMatrixProspectKey, 500),
    invitationSource: cleanString(record.invitationSource || record.source, 180),
    invitedBy: cleanString(record.invitedBy || record.inviter || record.invitedByName || latestEvent.invitedBy, 180),
    partnerProductTypes: cleanString(record.partnerProductTypes, 2000),
    partnerClientMessaging: cleanString(record.partnerClientMessaging, 4000),
    partnerLinkedInPromotionText: cleanString(record.partnerLinkedInPromotionText || record.partnerPromotionText || record.partnerHypeText, 4000),
    relationshipOwner: cleanString(record.relationshipOwner, 180),
    lifecycleStage: cleanAllowed(record.lifecycleStage, allowedLifecycleStages, "guest"),
    contactGuestRating: cleanStarRating(record.contactGuestRating ?? record.guestRelationshipRating ?? record.guestRating, 1),
    nextAction: cleanAllowed(record.nextAction, allowedNextActions, "none"),
    nextActionDueDate: cleanString(record.nextActionDueDate || record.dueDate, 40),
    lastContactDate: cleanString(record.lastContactDate, 40),
    emailPermission: cleanAllowed(record.emailPermission, allowedEmailPermissions, "unknown"),
    emailOptOut: record.emailOptOut === true || cleanAllowed(record.emailPermission, allowedEmailPermissions, "unknown") === "opted-out",
    topicInterests: cleanTopicTracks(record.topicInterests || record.topicTrackInterest),
    registrationId: cleanString(record.registrationId),
    registrationType: cleanString(record.registrationType),
    crmNotes: cleanString(record.crmNotes),
    activity,
    latestActivityAt: cleanString(activity[0]?.createdAt),
    crmUpdatedAt: cleanString(record.crmUpdatedAt),
    crmUpdatedBy: cleanString(record.crmUpdatedBy),
    contactStatus,
    publicationUseName,
    publicationUseCompany,
    publicationCount: Number.isFinite(Number(record.publicationCount))
      ? Number(record.publicationCount)
      : [publicationUseName, publicationUseCompany].filter(Boolean).length,
    companyKey: cleanString(record.companyKey),
    companySlug: cleanString(record.companySlug),
    profileKey: cleanString(record.profileKey),
    eventCount: sortedEvents.length,
    latestEventName: cleanString(latestEvent.eventName || latestEvent.eventId || latestEvent.inviteCode),
    latestEventDate: cleanString(latestEvent.eventDate),
    latestRegisteredAt: cleanString(latestEvent.registeredAt),
    attendedCount: sortedEvents.filter((event) => event?.attended === true).length,
    events: sortedEvents.map((event) => ({
      id: cleanString(event?.id || event?.eventId || event?.registrationId),
      eventId: cleanString(event?.eventId),
      eventSlug: cleanString(event?.eventSlug),
      eventName: cleanString(event?.eventName),
      eventDate: cleanString(event?.eventDate),
      eventTime: cleanString(event?.eventTime),
      eventShowId: cleanEventShowId(event?.eventShowId || event?.showId || event?.eventShow, ""),
      eventShowLabel: cleanString(event?.eventShowLabel) || (event?.eventShowId ? eventShowLabel(event.eventShowId) : ""),
      eventShowTime: cleanString(event?.eventShowTime) || cleanString(event?.eventTime),
      intendedGuestName: cleanString(event?.intendedGuestName || event?.invitedName || event?.guestName),
      invitedName: cleanString(event?.invitedName || event?.intendedGuestName || event?.guestName),
      linkedinProfileUrl: cleanLinkedInProfileUrl(event?.linkedinProfileUrl || event?.linkedInProfileUrl || event?.linkedinUrl || event?.linkedInUrl),
      invitedBy: cleanString(event?.invitedBy || event?.inviter || event?.invitedByName, 180),
      contactEventRole: cleanContactEventRole(event?.contactEventRole || event?.registrationRole || event?.partnerRegistrationType || event?.guestRegistrationType || event?.role || event?.registrationType),
      guestRegistrationType: cleanGuestRegistrationType(event?.guestRegistrationType || event?.registrationRole || event?.contactEventRole),
      partnerRegistrationType: cleanOptionalRegistrationType(event?.partnerRegistrationType || event?.registrationRole || event?.contactEventRole),
      registrationRole: cleanContactEventRole(event?.registrationRole || event?.partnerRegistrationType || event?.guestRegistrationType || event?.contactEventRole || event?.role || event?.registrationType),
      potentialSponsor: event?.potentialSponsor === true || event?.isPotentialSponsor === true || event?.sponsorProspect === true,
      inviteCode: cleanString(event?.inviteCode),
      registrationId: cleanString(event?.registrationId),
      registrationType: cleanString(event?.registrationType),
      role: cleanString(event?.role) || contactEventRoleLabel(event?.contactEventRole || event?.registrationRole || event?.partnerRegistrationType || event?.guestRegistrationType || event?.registrationType),
      strategicRole: cleanAllowed(event?.strategicRole || contactEventStrategicRole(event?.contactEventRole || event?.registrationRole || event?.partnerRegistrationType || event?.guestRegistrationType || event?.role || event?.registrationType), allowedStrategicRoles, "attendee"),
      registrationStatus: cleanAllowed(event?.registrationStatus || event?.status || event?.crmStatus, allowedRegistrationStatuses, "confirmed"),
      status: cleanAllowed(event?.status || event?.registrationStatus || event?.crmStatus, allowedRegistrationStatuses, "confirmed"),
      publicationUseName: event?.publicationUseName === true,
      publicationUseCompany: event?.publicationUseCompany === true,
      attended: event?.attended === true,
      attendanceStatus: cleanString(event?.attendanceStatus) || "not_recorded",
      registeredAt: cleanString(event?.registeredAt)
    }))
  };
}

function contactStatusFromRegistration(value) {
  const normalized = cleanString(value).toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("partner member")) return "partner member";
  if (normalized.includes("partner")) return "partner guest";
  if (normalized.includes("member")) return "member";
  return "guest";
}

async function listKeys(env, prefix) {
  const d1Keys = await listCrmD1Keys(env, prefix).catch(() => []);
  if (crmD1Primary(env)) return d1Keys;
  const keys = [...d1Keys];
  let cursor;
  if (!env.MOJO_SUMMITS_SETUP_STATE?.list || !prefix) return [...new Set(keys)];

  do {
    const result = await env.MOJO_SUMMITS_SETUP_STATE.list({
      prefix,
      cursor,
      limit: 1000
    }).catch(() => null);
    if (!result) break;
    keys.push(...result.keys.map((entry) => entry.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return [...new Set(keys)];
}

async function readSetupJson(env, key) {
  const d1Record = await readCrmD1Json(env, key).catch(() => null);
  if (d1Record) return d1Record;
  if (crmD1Primary(env) || !env.MOJO_SUMMITS_SETUP_STATE?.get) return null;
  return env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null) || null;
}

async function writeSetupJson(env, key, record) {
  await writeCrmD1Json(env, key, record).catch(() => false);
  if (!crmD1Primary(env) && env.MOJO_SUMMITS_SETUP_STATE?.put) {
    await env.MOJO_SUMMITS_SETUP_STATE.put(key, JSON.stringify(record));
  }
}

async function deleteSetupRecord(env, key) {
  await deleteCrmD1Record(env, key).catch(() => false);
  if (!crmD1Primary(env) && env.MOJO_SUMMITS_SETUP_STATE?.delete) {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(key);
  }
}

function allowedCrmD1BackfillPrefixes(source = "") {
  return source === "r2" ? CRM_D1_R2_BACKFILL_PREFIXES : CRM_D1_KV_BACKFILL_PREFIXES;
}

function assertCrmD1BackfillPrefix(source = "", prefix = "") {
  const cleanPrefix = cleanString(prefix, 500);
  const allowed = allowedCrmD1BackfillPrefixes(source);
  if (!cleanPrefix || !allowed.includes(cleanPrefix)) {
    const error = new Error("Choose one of the allowed CRM D1 backfill prefixes.");
    error.status = 400;
    error.allowedPrefixes = allowed;
    throw error;
  }
  return cleanPrefix;
}

function d1KeyForR2Backfill(objectKey = "", record = {}) {
  const cleanKey = safeObjectKey(objectKey);
  if (cleanKey.startsWith(`${R2_INVITE_USAGE_PREFIX}/`)) return cleanKey;

  const match = cleanKey.match(/^(?:crm|crm-overflow)\/registrations\/([^/]+)\//);
  if (!match) return cleanKey;

  const type = cleanType(match[1]);
  const config = registrantTypes[type];
  const createdAt = cleanString(record.createdAt || record.registeredAt || record.submittedAt, 120);
  const id = cleanString(record.id || record.registrationId, 240) || safeFileSegment(cleanKey.split("/").pop()?.replace(/\.json$/i, ""), "registration");
  if (!createdAt || !id) return cleanKey;
  return `${config.crmPrefix}${createdAt}:${id}`;
}

async function backfillCrmD1FromKv(env, prefix, cursor, limit) {
  if (!env.MOJO_SUMMITS_SETUP_STATE?.list || !env.MOJO_SUMMITS_SETUP_STATE?.get) {
    const error = new Error("Legacy CRM KV storage is not configured.");
    error.status = 500;
    throw error;
  }

  const result = await env.MOJO_SUMMITS_SETUP_STATE.list({ prefix, cursor, limit });
  let written = 0;
  for (const entry of result.keys || []) {
    const key = cleanString(entry.name, 600);
    if (!key) continue;
    const record = await env.MOJO_SUMMITS_SETUP_STATE.get(key, "json").catch(() => null);
    if (!record || typeof record !== "object") continue;
    if (await writeCrmD1Json(env, key, record).catch(() => false)) written += 1;
  }

  return {
    processed: (result.keys || []).length,
    written,
    cursor: result.list_complete ? "" : cleanString(result.cursor, 1000),
    listComplete: result.list_complete === true
  };
}

async function backfillCrmD1FromR2(env, prefix, cursor, limit) {
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get) {
    const error = new Error("Legacy CRM R2 storage is not configured.");
    error.status = 500;
    throw error;
  }

  const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit });
  let written = 0;
  for (const object of result.objects || []) {
    const objectKey = safeObjectKey(object.key);
    if (!objectKey) continue;
    const stored = await env.MOJO_SUMMITS_STORAGE.get(objectKey).catch(() => null);
    const record = stored ? await stored.json().catch(() => null) : null;
    if (!record || typeof record !== "object") continue;
    const d1Key = d1KeyForR2Backfill(objectKey, record);
    if (await writeCrmD1Json(env, d1Key, { ...record, legacyR2Key: objectKey }).catch(() => false)) written += 1;
  }

  return {
    processed: (result.objects || []).length,
    written,
    cursor: result.truncated ? cleanString(result.cursor, 1000) : "",
    listComplete: result.truncated !== true
  };
}

async function backfillCrmD1(env, payload = {}) {
  if (!crmD1Available(env)) {
    const error = new Error("CRM D1 database is not configured.");
    error.status = 500;
    throw error;
  }

  const source = cleanString(payload.source, 20).toLowerCase() === "r2" ? "r2" : "kv";
  if (!payload.prefix) {
    return {
      ok: true,
      source,
      allowedPrefixes: allowedCrmD1BackfillPrefixes(source)
    };
  }

  const prefix = assertCrmD1BackfillPrefix(source, payload.prefix);
  const cursor = cleanString(payload.cursor, 1000) || undefined;
  const limit = Math.min(Math.max(Number.parseInt(payload.limit, 10) || 100, 1), 200);
  const result = source === "r2"
    ? await backfillCrmD1FromR2(env, prefix, cursor, limit)
    : await backfillCrmD1FromKv(env, prefix, cursor, limit);

  return {
    ok: true,
    source,
    prefix,
    limit,
    ...result
  };
}

async function readRecords(env, keys) {
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? normalizeRecord(key, record) : null;
    })
  );

  return records.filter(Boolean);
}

async function readContactRecords(env, keys) {
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? normalizeContactRecord(key, record) : null;
    })
  );

  return records.filter(Boolean);
}

async function r2Registrants(env, type = "member") {
  if (crmD1Primary(env)) return [];
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get) return [];
  const keys = [];
  const prefixes = [
    `${R2_REGISTRATION_PREFIX}/${cleanType(type)}/`,
    `${OVERFLOW_REGISTRATION_PREFIX}/${cleanType(type)}/`
  ];

  for (const prefix of prefixes) {
    let cursor;
    do {
      const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
      if (!result) break;
      keys.push(...(result.objects || []).map((object) => object.key));
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }

  const records = await Promise.all(
    keys.map(async (key) => {
      const object = await env.MOJO_SUMMITS_STORAGE.get(key).catch(() => null);
      const record = object ? await object.json().catch(() => null) : null;
      return record ? normalizeRecord(key, {
        ...record,
        source: record.source || (key.startsWith(OVERFLOW_REGISTRATION_PREFIX) ? `${cleanType(type)}-registration-overflow` : `${cleanType(type)}-registration`)
      }) : null;
    })
  );

  return records.filter(Boolean);
}

function inviteUsageObjectCode(key = "") {
  const file = String(key || "").split("/").pop() || "";
  return cleanCode(file.replace(/\.json$/i, ""));
}

function normalizeInviteUsageRecord(key, record = {}, type = "guest") {
  const code = cleanCode(record?.code || record?.inviteCode || inviteUsageObjectCode(key));
  if (!code) return null;
  return {
    key,
    type: cleanType(record?.type || type),
    code,
    status: cleanString(record?.status, 80) || "used",
    usedAt: cleanString(record?.usedAt || record?.createdAt),
    usedBy: cleanString(record?.usedBy),
    usedByName: cleanString(record?.usedByName || record?.name),
    usedByEmail: cleanString(record?.usedByEmail || record?.email || record?.usedBy).toLowerCase(),
    registrationId: cleanString(record?.registrationId || record?.id),
    eventName: cleanString(record?.eventName),
    eventDate: cleanString(record?.eventDate),
    eventTime: cleanString(record?.eventTime),
    eventShowId: cleanString(record?.eventShowId),
    eventShowLabel: cleanString(record?.eventShowLabel),
    eventShowTime: cleanString(record?.eventShowTime)
  };
}

async function r2InviteUsages(env, type = "member") {
  const d1Keys = await listCrmD1Keys(env, `${R2_INVITE_USAGE_PREFIX}/${cleanType(type)}/`).catch(() => []);
  const d1Records = await Promise.all(d1Keys.map(async (key) => normalizeInviteUsageRecord(key, await readCrmD1Json(env, key), type)));
  if (crmD1Primary(env)) return d1Records.filter(Boolean);
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get) return [];
  const keys = [];
  const prefix = `${R2_INVITE_USAGE_PREFIX}/${cleanType(type)}/`;
  let cursor;

  do {
    const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
    if (!result) break;
    keys.push(...(result.objects || []).map((object) => object.key));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  const records = await Promise.all(
    keys.map(async (key) => {
      const object = await env.MOJO_SUMMITS_STORAGE.get(key).catch(() => null);
      const record = object ? await object.json().catch(() => null) : null;
      return record ? normalizeInviteUsageRecord(key, record, type) : normalizeInviteUsageRecord(key, {}, type);
    })
  );

  return [...d1Records, ...records].filter(Boolean);
}

async function deleteR2RegistrantsForEmail(env, email) {
  if (!env.MOJO_SUMMITS_STORAGE?.list || !env.MOJO_SUMMITS_STORAGE?.get || !env.MOJO_SUMMITS_STORAGE?.delete) return [];
  const deletedKeys = [];
  for (const type of ["guest", "member", "partner"]) {
    const prefixes = [
      `${R2_REGISTRATION_PREFIX}/${type}/`,
      `${OVERFLOW_REGISTRATION_PREFIX}/${type}/`
    ];
    for (const prefix of prefixes) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (cleanString(record?.email).toLowerCase() !== email) continue;
          await env.MOJO_SUMMITS_STORAGE.delete(object.key);
          deletedKeys.push(object.key);
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }
  return deletedKeys;
}

async function registrants(env, type = "member", options = {}) {
  const config = registrantTypes[cleanType(type)];
  const crmKeys = await listKeys(env, config.crmPrefix);
  const crmRows = await readRecords(env, crmKeys);
  const ids = new Set(crmRows.map((row) => row.id));

  const legacyKeys = await listKeys(env, config.legacyPrefix);
  const legacyRows = (await readRecords(env, legacyKeys)).filter((row) => !ids.has(row.id));
  for (const row of legacyRows) ids.add(row.id);
  const r2Rows = (await r2Registrants(env, type)).filter((row) => !ids.has(row.id));
  const rows = [...crmRows, ...legacyRows, ...r2Rows].filter((row) => {
    return cleanType(type) !== "partner" || options.includeManualPartners === true || row.manualPartner !== true;
  });
  const hydratedRows = await hydrateRegistrationAccessRows(env, rows);

  return hydratedRows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function hydrateRegistrationAccessRows(env, rows = []) {
  return Promise.all((Array.isArray(rows) ? rows : []).map(async (row) => {
    if (!row || typeof row !== "object") return row;
    return registrationWithVirtualEventAccess(env, row).catch(() => row);
  }));
}

function rowAccessLink(row = {}) {
  return cleanString(row.eventAccessLink || row.accessLink || row.joinUrl || row.zoomUrl || row.zoomJoinUrl, 1000);
}

function rowEventSlug(row = {}) {
  const slug = cleanString(row.eventSlug, 240);
  if (slug) return slug;
  const eventId = cleanString(row.eventId, 240);
  if (eventId) return eventId.split(":")[0].trim();
  return "";
}

function actualRegistrationRow(row = {}, type = "guest") {
  if (row.matrixOnly) return false;
  const config = registrantTypes[cleanType(type)];
  const key = cleanString(row.key, 500);
  return !key || key.startsWith(config.crmPrefix) || key.startsWith(config.legacyPrefix);
}

function roleLabelForRow(row = {}, type = "") {
  const role = cleanGuestRegistrationType(row.partnerRegistrationType || row.guestRegistrationType || row.registrationRole);
  if (type === "partner") {
    if (role === "featured-partner" || row.isFeaturedPartner) return "Featured Partner";
    if (role === "partner-candidate") return "Partner Candidate";
    return "Partner Guest";
  }
  if (type === "member") return row.isFeaturedMember ? "Featured Member" : "Member";
  if (role === "presenter" || row.isPresenter) return "Presenter";
  if (role === "roundtable-leader" || row.isRoundtableLeader) return "Round Table Leader";
  if (role === "featured-guest" || row.isFeaturedGuest) return "Featured Guest";
  if (role === "featured-member" || row.isFeaturedMember) return "Featured Member";
  if (role === "featured-author" || row.isFeaturedAuthor) return "Featured Author";
  if (role === "member") return "Member";
  return "Guest";
}

function contactFromRegistrant(row = {}, type = "") {
  const email = cleanString(row.email).toLowerCase();
  if (!email) return null;
  const company = cleanString(row.partnerCompany || row.company);
  if (type === "partner" && row.manualPartner) {
    return normalizeContactRecord(`crm:contact:${email}`, {
      id: email,
      email,
      name: cleanString(row.name) || email,
      company,
      title: cleanString(row.title),
      industry: cleanString(row.industry),
      phone: cleanString(row.phone),
      linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl),
      photoUrl: cleanString(row.photoUrl || row.photoURL || row.photo, 500),
      photoKey: safeObjectKey(row.photoKey),
      photoOriginalName: cleanString(row.photoOriginalName),
      photoUploadedAt: cleanString(row.photoUploadedAt),
      invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy, 180),
      source: cleanString(row.source || "manual-partner"),
      registrationId: cleanString(row.id),
      registrationType: "partner",
      createdAt: cleanString(row.createdAt),
      updatedAt: cleanString(row.crmUpdatedAt || row.updatedAt || row.createdAt),
      crmNotes: cleanString(row.crmNotes),
      crmUpdatedAt: cleanString(row.crmUpdatedAt),
      crmUpdatedBy: cleanString(row.crmUpdatedBy),
      events: []
    });
  }

  const eventId = cleanString(row.eventId || row.eventSlug || row.eventName || row.inviteCode || row.id);
  const rowShowId = cleanEventShowId(row.eventShowId || row.showId || row.eventShow, "");
  return normalizeContactRecord(`crm:contact:${email}`, {
    id: email,
    email,
    name: cleanString(row.name) || email,
    company,
    title: cleanString(row.title),
    industry: cleanString(row.industry),
    phone: cleanString(row.phone),
    linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl),
    photoUrl: cleanString(row.photoUrl || row.photoURL || row.photo, 500),
    photoKey: safeObjectKey(row.photoKey),
    photoOriginalName: cleanString(row.photoOriginalName),
    photoUploadedAt: cleanString(row.photoUploadedAt),
    invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy, 180),
    ...(type === "partner" ? {
      partnerProductTypes: cleanString(row.partnerProductTypes, 2000),
      partnerClientMessaging: cleanString(row.partnerClientMessaging, 4000),
      partnerLinkedInPromotionText: cleanString(row.partnerLinkedInPromotionText || row.partnerPromotionText || row.partnerHypeText, 4000)
    } : {}),
    source: cleanString(row.source || `${type}-registration`),
    registrationId: cleanString(row.id),
    registrationType: cleanString(type),
    publicationUseName: row.publicationUseName === true,
    publicationUseCompany: row.publicationUseCompany === true,
    createdAt: cleanString(row.createdAt),
    updatedAt: cleanString(row.createdAt),
    events: [{
      id: eventId,
      eventId,
      eventSlug: cleanString(row.eventSlug),
      eventName: cleanString(row.eventName) || eventId || "Registration",
      eventDate: cleanString(row.eventDate),
      eventTime: cleanString(row.eventTime),
      eventShowId: rowShowId,
      eventShowLabel: cleanString(row.eventShowLabel) || (rowShowId ? eventShowLabel(rowShowId) : ""),
      eventShowTime: cleanString(row.eventShowTime) || cleanString(row.eventTime),
      inviteCode: cleanString(row.inviteCode),
      invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy, 180),
      linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl),
      registrationId: cleanString(row.id),
      registrationType: cleanString(type),
      guestRegistrationType: cleanGuestRegistrationType(row.guestRegistrationType || row.registrationRole),
      partnerRegistrationType: cleanOptionalRegistrationType(row.partnerRegistrationType || row.registrationRole),
      registrationRole: cleanGuestRegistrationType(row.registrationRole || row.partnerRegistrationType || row.guestRegistrationType),
      potentialSponsor: row.potentialSponsor === true || row.isPotentialSponsor === true || row.sponsorProspect === true,
      role: roleLabelForRow(row, type),
      eventNotes: cleanEventNotes(row) || (type === "guest" ? cleanString(row.crmNotes, 4000) : ""),
      publicationUseName: row.publicationUseName === true,
      publicationUseCompany: row.publicationUseCompany === true,
      registeredAt: cleanString(row.createdAt),
      attended: row.attended === true,
      attendanceStatus: cleanString(row.attendanceStatus) || (row.attended === true ? "attended" : "not_recorded"),
      attendedAt: cleanString(row.attendedAt),
      attendanceUpdatedAt: cleanString(row.attendanceUpdatedAt),
      attendanceUpdatedBy: cleanString(row.attendanceUpdatedBy)
    }]
  });
}

function contactKeyForInviteRecord(row = {}, source = "guest-invite") {
  const email = invitePersonEmail(row);
  if (isEmail(email)) return `${registrantTypes.contacts.crmPrefix}${email}`;
  const linkedIn = linkedInProfileIdentity(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl);
  if (linkedIn) return `${registrantTypes.contacts.crmPrefix}linkedin:${safeFileSegment(linkedIn, "profile")}`;
  const id = cleanString(row.id || row.code || row.inviteCode || row.key || crypto.randomUUID(), 240);
  return `${registrantTypes.contacts.crmPrefix}pending:${safeFileSegment(source, "guest")}:${safeFileSegment(id, "person")}`;
}

function contactMergeNameKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b(dr|doctor|phd|ph\.d|m\.d|md|mba|ms|ma|cpa|esq)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function pendingContactKeyForMatrixProspectKey(key = "") {
  const cleanKey = cleanString(key, 500);
  const isPartner = cleanKey.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX);
  if (!isPartner && !cleanKey.startsWith(GUEST_MATRIX_PROSPECT_PREFIX)) return "";
  const id = cleanKey.split(":").filter(Boolean).pop();
  if (!id) return "";
  return `${registrantTypes.contacts.crmPrefix}pending:${isPartner ? "partner" : "guest"}-matrix-prospect:${safeFileSegment(id, "person")}`;
}

async function contactAliasKeysForInviteRecord(env, contact = {}) {
  const aliases = new Set();
  const linkedIn = linkedInProfileIdentity(contact.linkedinProfileUrl);
  const linkedinKey = linkedIn ? `${registrantTypes.contacts.crmPrefix}linkedin:${safeFileSegment(linkedIn, "profile")}` : "";
  if (linkedinKey && linkedinKey !== contact.key) aliases.add(linkedinKey);
  const sourceMatrixContactKey = pendingContactKeyForMatrixProspectKey(contact.sourceMatrixProspectKey);
  if (sourceMatrixContactKey && sourceMatrixContactKey !== contact.key) aliases.add(sourceMatrixContactKey);

  const targetNameKey = contactMergeNameKey(contact.name);
  if (!contact.email || targetNameKey.length < 6) return [...aliases];

  const keys = await listKeys(env, registrantTypes.contacts.crmPrefix);
  for (const key of keys) {
    if (key === contact.key || aliases.has(key)) continue;
    const record = await readRawRecord(env, key);
    if (!record) continue;
    const recordEmail = cleanString(record.email).toLowerCase();
    if (isEmail(recordEmail)) continue;
    const source = cleanString(record.source || record.invitationSource).toLowerCase();
    if (!source.includes("matrix-prospect") && !key.includes(":pending:") && !key.includes(":linkedin:")) continue;
    const recordNameKey = contactMergeNameKey(record.name || record.intendedGuestName || record.invitedName || record.guestName);
    if (recordNameKey && recordNameKey === targetNameKey) aliases.add(key);
  }

  return [...aliases];
}

function contactFromInviteRecord(row = {}, source = "guest-invite") {
  const key = contactKeyForInviteRecord(row, source);
  const email = invitePersonEmail(row);
  const cleanEmail = isEmail(email) ? email : "";
  const name = invitePersonName(row) || cleanEmail || "Name not recorded";
  const eventShowId = cleanEventShowId(row.eventShowId || row.showId || row.eventShow, "");
  const eventId = cleanString(row.eventId || `${row.eventSlug || row.eventName || source}:${eventShowId || row.code || row.id || ""}`, 200);
  const isPartner = source.includes("partner") || row.type === "partner" || row.type === "partner-matrix-prospect";
  const registrationRole = cleanGuestRegistrationType(row.partnerRegistrationType || row.guestRegistrationType || row.registrationRole || (isPartner ? "partner-candidate" : row.type));
  const lifecycleStage = row.matrixOnly || row.type === "guest-matrix-prospect" || row.type === "partner-matrix-prospect" ? "prospect" : "invited";
  return normalizeContactRecord(key, {
    id: cleanEmail || cleanString(row.id || row.code || row.inviteCode || row.key),
    email: cleanEmail,
    name,
    company: cleanString(row.company || row.organization || row.partnerCompany),
    title: cleanString(row.title || row.jobTitle || row.roleTitle || row.contactTitle),
    linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl),
    invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy, 180),
    source,
    sourceMatrixProspectKey: cleanString(row.sourceMatrixProspectKey, 500),
    invitationSource: source,
    lifecycleStage,
    createdAt: cleanString(row.createdAt),
    updatedAt: cleanString(row.updatedAt || row.createdAt),
    events: [{
      id: cleanString(row.key || row.id || row.code || eventId),
      eventId,
      eventSlug: cleanString(row.eventSlug),
      eventName: cleanString(row.eventName || row.usedFor) || eventId || (isPartner ? "Partner Matrix" : "Guest Matrix"),
      eventDate: cleanString(row.eventDate || row.usedForDate),
      eventTime: cleanString(row.eventTime),
      eventShowId,
      eventShowLabel: cleanString(row.eventShowLabel || row.usedForShow) || (eventShowId ? eventShowLabel(eventShowId) : ""),
      eventShowTime: cleanString(row.eventShowTime || row.usedForTime || row.eventTime),
      intendedGuestName: name,
      invitedName: name,
      invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy, 180),
      guestRegistrationType: registrationRole,
      registrationRole,
      inviteCode: cleanString(row.code || row.inviteCode),
      registrationId: cleanString(row.registrationId),
      registrationType: source,
      potentialSponsor: row.potentialSponsor === true || row.isPotentialSponsor === true || row.sponsorProspect === true,
      role: roleLabelForRow({ ...row, guestRegistrationType: registrationRole, partnerRegistrationType: registrationRole }, isPartner ? "partner" : row.type === "member" ? "member" : "guest"),
      registrationStatus: cleanGuestRegistrationLifecycleStatus(row.crmStatus || row.guestStatus || row.registrationStatus, row.usedAt || row.usedBy || row.usedByEmail ? "registered" : "invited"),
      status: cleanGuestRegistrationLifecycleStatus(row.crmStatus || row.guestStatus || row.registrationStatus, row.usedAt || row.usedBy || row.usedByEmail ? "registered" : "invited"),
      registeredAt: cleanString(row.usedAt),
      attended: false,
      attendanceStatus: "not_recorded"
    }]
  });
}

function mergeContactEventList(existingEvents = [], nextEvent = {}) {
  const events = Array.isArray(existingEvents) ? [...existingEvents] : [];
  const index = events.findIndex((event) => contactEventMatches(event, nextEvent));
  if (index >= 0) {
    events[index] = {
      ...events[index],
      ...nextEvent
    };
    return events;
  }
  return [nextEvent, ...events];
}

async function upsertContactFromInviteRecord(env, row = {}, source = "guest-invite", actor = "", options = {}) {
  const contact = contactFromInviteRecord(row, source);
  if (!contact?.key) return {};
  const existing = await readRawRecord(env, contact.key);
  const aliasKeys = await contactAliasKeysForInviteRecord(env, contact);
  const aliases = (await Promise.all(aliasKeys.map(async (key) => ({
    key,
    record: await readRawRecord(env, key)
  })))).filter((entry) => entry.record);
  const mergedExisting = {
    ...aliases.reduce((merged, entry) => ({ ...merged, ...entry.record }), {}),
    ...(existing || {}),
    events: [
      ...aliases.flatMap((entry) => Array.isArray(entry.record?.events) ? entry.record.events : []),
      ...(Array.isArray(existing?.events) ? existing.events : [])
    ]
  };
  const now = new Date().toISOString();
  const nextEvent = contact.events?.[0] || {};
  const incomingName = cleanString(contact.name, 240);
  const incomingCompany = cleanString(contact.company, 240);
  const incomingTitle = cleanString(contact.title, 180);
  const incomingLinkedIn = cleanLinkedInProfileUrl(contact.linkedinProfileUrl || contact.linkedInProfileUrl || contact.linkedinUrl || contact.linkedInUrl);
  const incomingInvitedBy = cleanString(contact.invitedBy, 180);
  const existingName = cleanString(mergedExisting?.name, 240);
  const existingCompany = cleanString(mergedExisting?.company, 240);
  const existingTitle = cleanString(mergedExisting?.title, 180);
  const existingLinkedIn = cleanLinkedInProfileUrl(mergedExisting?.linkedinProfileUrl || mergedExisting?.linkedInProfileUrl || mergedExisting?.linkedinUrl || mergedExisting?.linkedInUrl);
  const existingInvitedBy = cleanString(existing?.invitedBy || mergedExisting?.invitedBy, 180);
  const preferIncomingName = options.preferIncomingName === true && incomingName;
  const preferIncomingCompany = options.preferIncomingCompany === true && incomingCompany;
  const preferIncomingTitle = options.preferIncomingTitle === true && incomingTitle;
  const preferIncomingLinkedIn = options.preferIncomingLinkedIn === true && incomingLinkedIn;
  const preferIncomingInvitedBy = options.preferIncomingInvitedBy === true && incomingInvitedBy;
  await writeSetupJson(env, contact.key, {
    ...mergedExisting,
    id: contact.id,
    email: contact.email,
    name: preferIncomingName
      ? incomingName
      : existingName && existingName !== "Name not recorded"
        ? existingName
        : contact.name,
    company: preferIncomingCompany ? incomingCompany : existingCompany || incomingCompany,
    title: preferIncomingTitle ? incomingTitle : existingTitle || incomingTitle,
    linkedinProfileUrl: preferIncomingLinkedIn ? incomingLinkedIn : existingLinkedIn || incomingLinkedIn,
    invitedBy: preferIncomingInvitedBy ? incomingInvitedBy : existingInvitedBy || incomingInvitedBy,
    source: cleanString(mergedExisting?.source) || contact.source,
    invitationSource: cleanString(mergedExisting?.invitationSource) || contact.invitationSource || contact.source,
    lifecycleStage: cleanAllowed(mergedExisting?.lifecycleStage, allowedLifecycleStages, "") || contact.lifecycleStage,
    createdAt: cleanString(mergedExisting?.createdAt) || contact.createdAt || now,
    updatedAt: now,
    updatedBy: actor || "crm",
    events: mergeContactEventList(mergedExisting?.events, nextEvent)
  });
  await Promise.all(aliasKeys.map((key) => deleteSetupRecord(env, key).catch(() => null)));
  return {
    contactKey: contact.key,
    contactId: contact.id,
    email: contact.email
  };
}

async function derivedContactRows(env) {
  const registrationRows = (await Promise.all(["member", "guest", "partner"].map(async (type) => {
    const records = await registrants(env, type);
    return records.map((row) => contactFromRegistrant(row, type));
  }))).flat().filter(Boolean);

  const inviteRows = (await registrationInviteCodes(env))
    .map((row) => contactFromInviteRecord(row, `${row.type || "guest"}-invite`))
    .filter(Boolean);
  const partnerInviteRows = (await partnerInviteCodes(env))
    .map((row) => contactFromInviteRecord(row, "partner-invite"))
    .filter(Boolean);
  const matrixRows = (await guestMatrixProspects(env))
    .map((row) => contactFromInviteRecord(row, "guest-matrix-prospect"))
    .filter(Boolean);
  const partnerMatrixRows = (await partnerMatrixProspects(env))
    .map((row) => contactFromInviteRecord(row, "partner-matrix-prospect"))
    .filter(Boolean);

  return [...registrationRows, ...inviteRows, ...partnerInviteRows, ...matrixRows, ...partnerMatrixRows];
}

function mergeContactRows(storedRows, derivedRows) {
  const byEmail = new Map();
  for (const row of [...derivedRows, ...storedRows]) {
    const identity = cleanString(row.email).toLowerCase() || cleanString(row.id || row.key).toLowerCase();
    if (!identity) continue;
    const previous = byEmail.get(identity);
    if (!previous) {
      byEmail.set(identity, row);
      continue;
    }
    const eventMap = new Map();
    for (const event of [...(previous.events || []), ...(row.events || [])]) {
      const key = contactEventIdentity(event);
      if (!key) continue;
      eventMap.set(key, {
        ...(eventMap.get(key) || {}),
        ...event
      });
    }
    byEmail.set(identity, normalizeContactRecord(row.key || previous.key || `crm:contact:${identity}`, {
      ...previous,
      ...row,
      name: cleanString(row.name) || cleanString(previous.name) || identity,
      firstName: cleanString(row.firstName) || cleanString(previous.firstName),
      lastName: cleanString(row.lastName) || cleanString(previous.lastName),
      company: cleanString(row.company) || cleanString(previous.company),
      title: cleanString(row.title) || cleanString(previous.title),
      linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl) || cleanLinkedInProfileUrl(previous.linkedinProfileUrl),
      photoUrl: cleanString(row.photoUrl) || cleanString(previous.photoUrl),
      photoKey: safeObjectKey(row.photoKey) || safeObjectKey(previous.photoKey),
      companyLogoUrl: cleanString(row.companyLogoUrl || row.partnerCompanyLogoUrl || row.logoUrl) || cleanString(previous.companyLogoUrl || previous.partnerCompanyLogoUrl || previous.logoUrl),
      companyLogoKey: safeObjectKey(row.companyLogoKey || row.partnerCompanyLogoKey || row.logoKey) || safeObjectKey(previous.companyLogoKey || previous.partnerCompanyLogoKey || previous.logoKey),
      companyLogoOriginalName: cleanString(row.companyLogoOriginalName || row.partnerCompanyLogoOriginalName) || cleanString(previous.companyLogoOriginalName || previous.partnerCompanyLogoOriginalName),
      companyLogoUploadedAt: cleanString(row.companyLogoUploadedAt || row.partnerCompanyLogoUploadedAt) || cleanString(previous.companyLogoUploadedAt || previous.partnerCompanyLogoUploadedAt),
      bio: cleanString(row.bio) || cleanString(previous.bio),
      executiveFunction: cleanString(row.executiveFunction) || cleanString(previous.executiveFunction),
      industry: cleanString(row.industry) || cleanString(previous.industry),
      companySize: cleanString(row.companySize) || cleanString(previous.companySize),
      organizationType: cleanString(row.organizationType) || cleanString(previous.organizationType),
      city: cleanString(row.city) || cleanString(previous.city),
      stateCountry: cleanString(row.stateCountry || row.state || row.country) || cleanString(previous.stateCountry || previous.state || previous.country),
      state: cleanString(row.state || row.stateCountry || row.country) || cleanString(previous.state || previous.stateCountry || previous.country),
      timeZone: cleanString(row.timeZone) || cleanString(previous.timeZone),
      location: cleanString(row.location) || cleanString(previous.location),
      phone: cleanString(row.phone) || cleanString(previous.phone),
      invitationSource: cleanString(row.invitationSource) || cleanString(previous.invitationSource),
      invitedBy: cleanString(row.invitedBy) || cleanString(previous.invitedBy),
      relationshipOwner: cleanString(row.relationshipOwner) || cleanString(previous.relationshipOwner),
      lifecycleStage: cleanString(row.lifecycleStage) || cleanString(previous.lifecycleStage),
      contactGuestRating: Math.max(cleanStarRating(previous.contactGuestRating, 1), cleanStarRating(row.contactGuestRating, 1)),
      nextAction: cleanString(row.nextAction) || cleanString(previous.nextAction),
      nextActionDueDate: cleanString(row.nextActionDueDate) || cleanString(previous.nextActionDueDate),
      lastContactDate: cleanString(row.lastContactDate) || cleanString(previous.lastContactDate),
      emailPermission: cleanString(row.emailPermission) || cleanString(previous.emailPermission),
      emailOptOut: row.emailOptOut === true || previous.emailOptOut === true,
      topicInterests: Array.isArray(row.topicInterests) && row.topicInterests.length ? row.topicInterests : previous.topicInterests,
      activity: Array.isArray(row.activity) && row.activity.length ? row.activity : previous.activity,
      crmNotes: cleanString(row.crmNotes) || cleanString(previous.crmNotes),
      publicationUseName: row.publicationUseName === true || previous.publicationUseName === true,
      publicationUseCompany: row.publicationUseCompany === true || previous.publicationUseCompany === true,
      publicationCount: Math.max(Number(row.publicationCount || 0), Number(previous.publicationCount || 0)),
      events: [...eventMap.values()]
    }));
  }
  return [...byEmail.values()];
}

async function contacts(env) {
  const keys = await listKeys(env, "crm:contact:");
  const rows = mergeContactRows(await readContactRecords(env, keys), await derivedContactRows(env));
  return rows.sort((a, b) => {
    const left = cleanString(b.updatedAt || b.latestRegisteredAt || b.createdAt);
    const right = cleanString(a.updatedAt || a.latestRegisteredAt || a.createdAt);
    return left.localeCompare(right);
  });
}

function normalizeDebugEntry(key, record = {}) {
  return {
    key,
    id: cleanString(record.id) || key,
    createdAt: cleanString(record.createdAt) || key.split(":").slice(-2, -1)[0] || "",
    type: cleanString(record.type),
    status: cleanString(record.status),
    stage: cleanString(record.stage),
    name: cleanString(record.name),
    email: cleanString(record.email).toLowerCase(),
    company: cleanString(record.company),
    inviteCode: cleanString(record.inviteCode),
    eventName: cleanString(record.eventName),
    eventDate: cleanString(record.eventDate),
    contactKey: cleanString(record.contactKey),
    action: cleanString(record.action),
    phone: cleanString(record.phone),
    provider: cleanString(record.provider),
    sendPath: cleanString(record.sendPath),
    messageId: cleanString(record.messageId),
    config: record.config && typeof record.config === "object" ? record.config : null,
    registrationKeys: Array.isArray(record.registrationKeys)
      ? record.registrationKeys.map((entry) => cleanString(entry)).filter(Boolean)
      : [],
    error: cleanString(record.error)
  };
}

function normalizeEmailLogEntry(key, record = {}) {
  return {
    key,
    id: cleanString(record.id || key.replace(EMAIL_LOG_PREFIX, "")),
    createdAt: cleanString(record.createdAt),
    type: cleanString(record.type),
    status: cleanString(record.status),
    to: cleanString(record.to).toLowerCase(),
    cc: cleanEmailList(record.cc || []),
    subject: cleanString(record.subject, 300),
    inviteKey: cleanString(record.inviteKey),
    inviteCode: cleanCode(record.inviteCode),
    eventSlug: cleanString(record.eventSlug),
    eventName: cleanString(record.eventName),
    actor: cleanString(record.actor),
    messageId: cleanString(record.messageId),
    error: cleanString(record.error)
  };
}

async function readRawRecord(env, key) {
  return readSetupJson(env, key);
}

function prospectCompanyId(record = {}) {
  const domain = normalizeDomain(record.canonicalDomain || record.websiteUrl);
  const linkedin = companySlug(cleanString(record.linkedinCompanyUrl, 300).replace(/^https?:\/\/(www\.)?linkedin\.com\/company\//i, ""));
  return cleanString(record.companyId, 160) || domain.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || linkedin || companySlug(record.companyName) || `company-${Date.now()}`;
}

function prospectPersonId(record = {}) {
  const linkedin = cleanString(record.linkedinUrl, 500).toLowerCase().replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/+$/, "");
  return cleanString(record.personId, 180) || companySlug(linkedin) || companySlug(record.fullName || [record.firstName, record.lastName].filter(Boolean).join(" ")) || `person-${Date.now()}`;
}

function normalizeProspectCompany(key, record = {}, people = [], weights = defaultPartnerScoreWeights) {
  const companyId = cleanString(record.companyId, 180) || key.replace(PARTNER_PROSPECT_COMPANY_PREFIX, "") || prospectCompanyId(record);
  const canonicalDomain = normalizeDomain(record.canonicalDomain || record.websiteUrl);
  const storedCompanyName = cleanString(record.companyName || record.name || record.company, 240);
  const companyName = storedCompanyName && !genericSponsorLabel(storedCompanyName)
    ? storedCompanyName
    : domainCompanyName(canonicalDomain, storedCompanyName || companyId);
  const aiRelevanceScore = cleanNumber(record.aiRelevanceScore || record.aiRelevance);
  const enterpriseFocus = cleanNumber(record.enterpriseFocus);
  const score = prospectScore({ ...record, aiRelevanceScore, enterpriseFocus }, weights);
  const partnerStatus = cleanString(record.partnerStatus, 120) || (score >= 60 ? "Partner Target" : "Vendor Universe");
  const processingStage = cleanString(record.processingStage, 120) || (people.length ? "READY FOR OUTREACH" : "PEOPLE DISCOVERY");
  const processingStatus = cleanString(record.processingStatus, 80) || "DISCOVERED";
  const rollup = outreachRollup(people);
  const sourceAttributions = cleanSourceAttributions(
    record.sourceAttributions ||
    record.discoveryAttributions ||
    record.provenance?.sourceAttributions,
    80
  );
  return {
    key,
    companyId,
    companyName,
    canonicalDomain,
    websiteUrl: normalizeUrl(record.websiteUrl || canonicalDomain),
    linkedinCompanyUrl: normalizeUrl(record.linkedinCompanyUrl),
    description: cleanString(record.description, 4000),
    aiVendor: record.aiVendor !== false,
    aiNative: record.aiNative === true,
    aiRelevanceScore,
    aiRelevance: aiRelevanceScore,
    classificationReason: cleanString(record.classificationReason || record.reason, 4000),
    primaryCategory: cleanString(record.primaryCategory || cleanArray(record.categories)[0], 160),
    categories: cleanArray(record.categories, 20, 160),
    products: cleanArray(record.products, 30, 180),
    employeeCount: cleanString(record.employeeCount, 80),
    employeeRange: cleanString(record.employeeRange || record.companySize, 80),
    revenueEstimate: cleanString(record.revenueEstimate, 120),
    fundingTotal: cleanString(record.fundingTotal, 120),
    fundingStage: cleanString(record.fundingStage, 120),
    headquartersCountry: cleanString(record.headquartersCountry, 120),
    headquartersState: cleanString(record.headquartersState, 120),
    headquartersCity: cleanString(record.headquartersCity, 120),
    b2b: record.b2b !== false,
    enterpriseFocus,
    targetIndustries: cleanArray(record.targetIndustries, 24, 160),
    targetExecutiveRoles: cleanArray(record.targetExecutiveRoles || record.targetBuyers, 24, 160),
    partnerScore: score,
    partnerScoreOverride: record.partnerScoreOverride === undefined || record.partnerScoreOverride === null || record.partnerScoreOverride === ""
      ? ""
      : cleanNumber(record.partnerScoreOverride),
    partnerPriority: cleanString(record.partnerPriority, 80) || priorityBand(score),
    partnerStatus,
    discoverySegment: cleanString(record.discoverySegment, 120),
    discoverySegments: cleanArray(record.discoverySegments || record.discoverySegment, 12, 120),
    targetEmployeeRange: cleanString(record.targetEmployeeRange, 80),
    employeeRangeStatus: cleanString(record.employeeRangeStatus, 80),
    companySizeEvidence: cleanString(record.companySizeEvidence, 1000),
    discoverySources: cleanArray(record.discoverySources || record.sources, 20, 160),
    sourceUrls: cleanArray(record.sourceUrls, 30, 500),
    sourceAttributions,
    discoveryAttributions: sourceAttributions,
    provenance: record.provenance && typeof record.provenance === "object" ? record.provenance : {},
    assignedTo: cleanString(record.assignedTo || "Miller", 180),
    processingStage,
    processingStatus,
    processingError: cleanString(record.processingError, 1000),
    retryCount: cleanNumber(record.retryCount, 0, 0, 999),
    dateDiscovered: cleanString(record.dateDiscovered, 40),
    lastVerified: cleanString(record.lastVerified, 40),
    lastEnriched: cleanString(record.lastEnriched, 40),
    lastContactAt: cleanString(record.lastContactAt, 40),
    convertedPartnerKey: cleanString(record.convertedPartnerKey, 300),
    convertedAt: cleanString(record.convertedAt, 40),
    convertedBy: cleanString(record.convertedBy, 180),
    humanVerifiedAt: cleanString(record.humanVerifiedAt, 40),
    humanVerifiedBy: cleanString(record.humanVerifiedBy, 180),
    reviewStatus: cleanString(record.reviewStatus, 80),
    reviewedAt: cleanString(record.reviewedAt, 40),
    reviewedBy: cleanString(record.reviewedBy, 180),
    sponsoredEvents: cleanArray(record.sponsoredEvents, 40, 240),
    sponsorEvidenceUrls: cleanArray(record.sponsorEvidenceUrls || record.evidenceUrls, 40, 500),
    sponsorshipFit: cleanString(record.sponsorshipFit, 120),
    sponsorshipEstimatedSpend: cleanString(record.sponsorshipEstimatedSpend || record.estimatedSponsorshipSpend, 120),
    sponsorshipThemes: cleanArray(record.sponsorshipThemes || record.sponsorshipValues, 24, 160),
    sponsorshipNotes: cleanString(record.sponsorshipNotes || record.evidenceNotes, 4000),
    sponsorEvidenceUpdatedAt: cleanString(record.sponsorEvidenceUpdatedAt, 40),
    sponsorEvidenceUpdatedBy: cleanString(record.sponsorEvidenceUpdatedBy, 180),
    peopleSearchStatus: cleanString(record.peopleSearchStatus, 120) || "Not Started",
    peopleSearchRoles: cleanArray(record.peopleSearchRoles, 24, 160),
    peopleSearchQuery: cleanString(record.peopleSearchQuery, 500),
    peopleSearchNotes: cleanString(record.peopleSearchNotes, 4000),
    peopleSearchPreparedAt: cleanString(record.peopleSearchPreparedAt, 40),
    peopleSearchPreparedBy: cleanString(record.peopleSearchPreparedBy, 180),
    peopleSearchCompletedAt: cleanString(record.peopleSearchCompletedAt, 40),
    peopleSearchCompletedBy: cleanString(record.peopleSearchCompletedBy, 180),
    manualLeadListName: cleanString(record.manualLeadListName, 240),
    manualLeadListUrl: normalizeUrl(record.manualLeadListUrl),
    manualLeadListOwner: cleanString(record.manualLeadListOwner, 180),
    manualLeadListUpdatedAt: cleanString(record.manualLeadListUpdatedAt, 40),
    scoreAudit: Array.isArray(record.scoreAudit) ? record.scoreAudit.slice(-50) : [],
    createdAt: cleanString(record.createdAt),
    createdBy: cleanString(record.createdBy, 180),
    updatedAt: cleanString(record.updatedAt),
    updatedBy: cleanString(record.updatedBy, 180),
    peopleCount: people.length,
    outreach: rollup
  };
}

function normalizeProspectPerson(key, record = {}) {
  const fullName = cleanString(record.fullName || record.name || [record.firstName, record.lastName].filter(Boolean).join(" "), 240);
  const fallbackName = splitName(fullName);
  return {
    key,
    personId: cleanString(record.personId, 180) || key.split(":").pop() || prospectPersonId(record),
    companyId: cleanString(record.companyId, 180),
    firstName: cleanString(record.firstName || fallbackName.firstName, 120),
    lastName: cleanString(record.lastName || fallbackName.lastName, 120),
    fullName: fullName || cleanString(record.linkedinUrl, 240),
    title: cleanString(record.title, 240),
    seniority: cleanString(record.seniority, 120),
    department: cleanString(record.department, 120),
    persona: cleanString(record.persona, 120),
    linkedinUrl: normalizeUrl(record.linkedinUrl),
    email: cleanString(record.email, 180).toLowerCase(),
    phone: cleanString(record.phone, 80),
    source: cleanString(record.source, 120),
    sourceUrl: normalizeUrl(record.sourceUrl),
    priorityScore: cleanNumber(record.priorityScore, 50),
    outreachStatus: cleanString(record.outreachStatus, 120) || "Not Contacted",
    assignedTo: cleanString(record.assignedTo || "Miller", 180),
    connectionRequestedAt: cleanString(record.connectionRequestedAt, 40),
    connectedAt: cleanString(record.connectedAt, 40),
    firstMessageAt: cleanString(record.firstMessageAt, 40),
    lastMessageAt: cleanString(record.lastMessageAt, 40),
    respondedAt: cleanString(record.respondedAt, 40),
    meetingAt: cleanString(record.meetingAt, 40),
    notRelevantAt: cleanString(record.notRelevantAt, 40),
    skippedAt: cleanString(record.skippedAt, 40),
    notes: cleanString(record.notes, 4000),
    lastVerified: cleanString(record.lastVerified, 40),
    createdAt: cleanString(record.createdAt),
    createdBy: cleanString(record.createdBy, 180),
    updatedAt: cleanString(record.updatedAt),
    updatedBy: cleanString(record.updatedBy, 180)
  };
}

function outreachRollup(people = []) {
  return {
    peopleIdentified: people.length,
    peopleAttempted: people.filter((person) => person.connectionRequestedAt || person.firstMessageAt || person.lastMessageAt).length,
    connectionsPending: people.filter((person) => person.connectionRequestedAt && !person.connectedAt).length,
    connectionsAccepted: people.filter((person) => Boolean(person.connectedAt)).length,
    messagesSent: people.filter((person) => person.firstMessageAt || person.lastMessageAt).length,
    responses: people.filter((person) => Boolean(person.respondedAt)).length,
    meetings: people.filter((person) => Boolean(person.meetingAt)).length
  };
}

async function prospectPeople(env, companyId = "") {
  const prefix = companyId
    ? `${PARTNER_PROSPECT_PERSON_PREFIX}${companyId}:`
    : PARTNER_PROSPECT_PERSON_PREFIX;
  const keys = await listKeys(env, prefix);
  const rows = await Promise.all(keys.map(async (key) => {
    const record = await readRawRecord(env, key);
    return record ? normalizeProspectPerson(key, record) : null;
  }));
  return rows.filter(Boolean).sort((a, b) => (b.priorityScore - a.priorityScore) || String(a.fullName).localeCompare(String(b.fullName)));
}

async function prospectCompanies(env) {
  const config = await partnerScoreConfig(env);
  const people = await prospectPeople(env);
  const peopleByCompany = new Map();
  for (const person of people) {
    if (!peopleByCompany.has(person.companyId)) peopleByCompany.set(person.companyId, []);
    peopleByCompany.get(person.companyId).push(person);
  }
  const keys = await listKeys(env, PARTNER_PROSPECT_COMPANY_PREFIX);
  const rows = await Promise.all(keys.map(async (key) => {
    const record = await readRawRecord(env, key);
    const companyId = cleanString(record?.companyId, 180) || key.replace(PARTNER_PROSPECT_COMPANY_PREFIX, "");
    return record ? normalizeProspectCompany(key, record, peopleByCompany.get(companyId) || [], config.weights) : null;
  }));
  return rows.filter(Boolean).sort((a, b) => (b.partnerScore - a.partnerScore) || String(a.companyName).localeCompare(String(b.companyName)));
}

async function findProspectCompanyDirect(env, payload = {}, config = null, options = {}) {
  const keys = cleanArray([
    cleanString(payload.key || payload.companyKey, 500),
    cleanString(payload.companyId, 180) ? `${PARTNER_PROSPECT_COMPANY_PREFIX}${cleanString(payload.companyId, 180)}` : "",
    `${PARTNER_PROSPECT_COMPANY_PREFIX}${prospectCompanyId(payload)}`
  ], 6, 500);
  const activeConfig = config || await partnerScoreConfig(env);
  for (const key of keys) {
    if (!key.startsWith(PARTNER_PROSPECT_COMPANY_PREFIX)) continue;
    const record = await readRawRecord(env, key);
    if (!record) continue;
    const companyId = cleanString(record.companyId, 180) || key.replace(PARTNER_PROSPECT_COMPANY_PREFIX, "");
    const people = options.includePeople === false ? [] : await prospectPeople(env, companyId);
    return normalizeProspectCompany(key, record, people, activeConfig.weights);
  }
  return null;
}

async function findProspectCompany(env, payload = {}, options = {}) {
  const direct = await findProspectCompanyDirect(env, payload, options.config || null, {
    includePeople: options.includePeople !== false
  });
  if (direct || options.directOnly) return direct;
  return findProspectCompanyInList(await prospectCompanies(env), payload);
}

async function writeProspectAudit(env, companyId, entry = {}) {
  const now = new Date().toISOString();
  const id = `${companyId}:${now}:${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  await writeSetupJson(env, `${PARTNER_PROSPECT_AUDIT_PREFIX}${id}`, {
    id,
    companyId,
    createdAt: now,
    ...entry
  });
}

async function writeProspectDebug(env, runId = "", entry = {}) {
  const now = new Date().toISOString();
  const id = cleanString(runId, 180) || `${now}:${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  const record = {
    id,
    createdAt: now,
    ...entry,
    accepted: Array.isArray(entry.accepted) ? entry.accepted.slice(0, 40) : [],
    rejected: Array.isArray(entry.rejected) ? entry.rejected.slice(0, 40) : [],
    skipped: Array.isArray(entry.skipped) ? entry.skipped.slice(0, 40) : []
  };
  await writeSetupJson(env, `${PARTNER_PROSPECT_DEBUG_PREFIX}${id}`, record);
  return record;
}

async function prospectDebugEntries(env, limit = 12) {
  const keys = await listKeys(env, PARTNER_PROSPECT_DEBUG_PREFIX);
  const rows = await Promise.all(keys.slice(-50).map(async (key) => {
    const record = await readRawRecord(env, key);
    if (!record) return null;
    return {
      key,
      id: cleanString(record.id, 240) || key.replace(PARTNER_PROSPECT_DEBUG_PREFIX, ""),
      createdAt: cleanString(record.createdAt, 40),
      actor: cleanString(record.actor, 180),
      action: cleanString(record.action, 120),
      sourceName: cleanString(record.sourceName, 180),
      sourceUrl: normalizeUrl(record.sourceUrl),
      sourceTitle: cleanString(record.sourceTitle, 240),
      status: cleanString(record.status, 80),
      error: cleanString(record.error, 1000),
      discovered: cleanNumber(record.discovered, 0, 0, 10000),
      candidates: cleanNumber(record.candidates, 0, 0, 10000),
      skippedExisting: cleanNumber(record.skippedExisting, 0, 0, 10000),
      taggedExisting: cleanNumber(record.taggedExisting, 0, 0, 10000),
      accepted: Array.isArray(record.accepted) ? record.accepted.slice(0, 20) : [],
      rejected: Array.isArray(record.rejected) ? record.rejected.slice(0, 20) : [],
      skipped: Array.isArray(record.skipped) ? record.skipped.slice(0, 20) : []
    };
  }));
  return rows.filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

function normalizeProspectSource(key, record = {}) {
  return {
    key,
    sourceId: cleanString(record.sourceId, 180) || key.replace(PARTNER_PROSPECT_SOURCE_PREFIX, ""),
    sourceName: cleanString(record.sourceName || record.name || record.source, 180),
    sourceType: cleanString(record.sourceType || record.type || "Public Web", 120),
    sourceUrl: normalizeUrl(record.sourceUrl || record.url),
    description: cleanString(record.description, 1000),
    category: cleanString(record.category, 160),
    discoverySegment: cleanString(record.discoverySegment, 120),
    targetEmployeeRange: cleanString(record.targetEmployeeRange, 80),
    status: cleanString(record.status, 80) || "active",
    lastRunAt: cleanString(record.lastRunAt, 40),
    lastRunBy: cleanString(record.lastRunBy, 180),
    lastRunStatus: cleanString(record.lastRunStatus, 80),
    lastRunError: cleanString(record.lastRunError, 1000),
    discoveredCount: cleanNumber(record.discoveredCount, 0, 0, 1000000),
    skippedExistingCount: cleanNumber(record.skippedExistingCount, 0, 0, 1000000),
    taggedExistingCount: cleanNumber(record.taggedExistingCount, 0, 0, 1000000),
    createdAt: cleanString(record.createdAt),
    createdBy: cleanString(record.createdBy, 180),
    updatedAt: cleanString(record.updatedAt),
    updatedBy: cleanString(record.updatedBy, 180)
  };
}

async function prospectSources(env) {
  const keys = await listKeys(env, PARTNER_PROSPECT_SOURCE_PREFIX);
  const rows = await Promise.all(keys.map(async (key) => {
    const record = await readRawRecord(env, key);
    return record ? normalizeProspectSource(key, record) : null;
  }));
  return rows.filter(Boolean).sort((a, b) => String(b.lastRunAt || b.updatedAt || b.createdAt).localeCompare(String(a.lastRunAt || a.updatedAt || a.createdAt)));
}

async function saveProspectSource(env, payload = {}, actor = "") {
  const sourceName = cleanString(payload.sourceName || payload.name || payload.source || "Web Discovery", 180);
  const sourceUrl = normalizeUrl(payload.sourceUrl || payload.url);
  if (!sourceUrl) throw new Error("A discovery source URL is required.");
  const sourceId = cleanString(payload.sourceId, 180) || companySlug(`${sourceName}-${normalizeDomain(sourceUrl)}`) || `source-${Date.now()}`;
  const key = `${PARTNER_PROSPECT_SOURCE_PREFIX}${sourceId}`;
  const existing = await readRawRecord(env, key);
  const now = new Date().toISOString();
  const record = {
    ...(existing || {}),
    sourceId,
    sourceName,
    sourceType: cleanString(payload.sourceType || existing?.sourceType || "Public Web", 120),
    sourceUrl,
    description: cleanString(payload.description ?? existing?.description, 1000),
    category: cleanString(payload.category ?? existing?.category, 160),
    discoverySegment: cleanString(payload.discoverySegment ?? existing?.discoverySegment, 120),
    targetEmployeeRange: cleanString(payload.targetEmployeeRange ?? existing?.targetEmployeeRange, 80),
    status: cleanString(payload.status || existing?.status || "active", 80),
    createdAt: cleanString(existing?.createdAt) || now,
    createdBy: cleanString(existing?.createdBy) || actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  await writeSetupJson(env, key, record);
  return normalizeProspectSource(key, record);
}

async function saveProspectCompany(env, payload = {}, actor = "", options = {}) {
  if (!cleanString(payload.companyName || payload.company || payload.name) &&
    !normalizeDomain(payload.canonicalDomain || payload.websiteUrl) &&
    !cleanString(payload.companyId || payload.key || payload.companyKey, 500)) {
    throw new Error("Company name or domain is required.");
  }
  const config = await partnerScoreConfig(env);
  const existing = await findProspectCompany(env, payload, {
    directOnly: options.directOnly === true,
    config,
    includePeople: options.includePeople !== false
  });
  const now = new Date().toISOString();
  const companyId = cleanString(existing?.companyId, 180) || prospectCompanyId(payload);
  const key = cleanString(existing?.key, 500) || `${PARTNER_PROSPECT_COMPANY_PREFIX}${companyId}`;
  const previous = existing?.key ? await readRawRecord(env, existing.key) : null;
  const mergeDiscoverySourceFields = payload.mergeDiscoverySourceFields === true;
  const scoreChanged = payload.partnerScoreOverride !== undefined &&
    cleanString(payload.partnerScoreOverride) !== cleanString(previous?.partnerScoreOverride);
  const record = {
    ...(previous || {}),
    ...payload,
    companyId,
    companyName: cleanString(payload.companyName || payload.company || previous?.companyName, 240),
    canonicalDomain: normalizeDomain(payload.canonicalDomain || payload.websiteUrl || previous?.canonicalDomain),
    websiteUrl: normalizeUrl(payload.websiteUrl || payload.canonicalDomain || previous?.websiteUrl),
    linkedinCompanyUrl: normalizeUrl(payload.linkedinCompanyUrl || previous?.linkedinCompanyUrl),
    sourceUrls: mergeDiscoverySourceFields
      ? cleanArray([...(cleanArray(previous?.sourceUrls, 30, 500)), ...(cleanArray(payload.sourceUrls, 30, 500))], 30, 500)
      : cleanArray(payload.sourceUrls ?? previous?.sourceUrls, 30, 500),
    discoverySources: mergeDiscoverySourceFields
      ? cleanArray([...(cleanArray(previous?.discoverySources, 20, 160)), ...(cleanArray(payload.discoverySources, 20, 160))], 20, 160)
      : cleanArray(payload.discoverySources ?? previous?.discoverySources, 20, 160),
    sourceAttributions: cleanSourceAttributions([
      ...(cleanSourceAttributions(previous?.sourceAttributions || previous?.discoveryAttributions, 80)),
      ...(cleanSourceAttributions(payload.sourceAttributions || payload.discoveryAttributions, 80))
    ], 80),
    discoveryAttributions: undefined,
    mergeDiscoverySourceFields: undefined,
    discoverySegment: cleanString(payload.discoverySegment ?? previous?.discoverySegment, 120),
    discoverySegments: cleanArray([
      ...(cleanArray(previous?.discoverySegments || previous?.discoverySegment, 12, 120)),
      ...(cleanArray(payload.discoverySegments || payload.discoverySegment, 12, 120))
    ], 12, 120),
    targetEmployeeRange: cleanString(payload.targetEmployeeRange ?? previous?.targetEmployeeRange, 80),
    employeeRangeStatus: cleanString(payload.employeeRangeStatus ?? previous?.employeeRangeStatus, 80),
    companySizeEvidence: cleanString(payload.companySizeEvidence ?? previous?.companySizeEvidence, 1000),
    categories: cleanArray(payload.categories ?? previous?.categories, 20, 160),
    products: cleanArray(payload.products ?? previous?.products, 30, 180),
    targetIndustries: cleanArray(payload.targetIndustries ?? previous?.targetIndustries, 24, 160),
    targetExecutiveRoles: cleanArray(payload.targetExecutiveRoles ?? previous?.targetExecutiveRoles ?? payload.targetBuyers, 24, 160),
    sponsoredEvents: mergeDiscoverySourceFields
      ? cleanArray([...(cleanArray(previous?.sponsoredEvents, 40, 240)), ...(cleanArray(payload.sponsoredEvents, 40, 240))], 40, 240)
      : cleanArray(payload.sponsoredEvents ?? previous?.sponsoredEvents, 40, 240),
    sponsorEvidenceUrls: mergeDiscoverySourceFields
      ? cleanArray([...(cleanArray(previous?.sponsorEvidenceUrls || previous?.evidenceUrls, 40, 500)), ...(cleanArray(payload.sponsorEvidenceUrls || payload.evidenceUrls, 40, 500))], 40, 500)
      : cleanArray(payload.sponsorEvidenceUrls ?? payload.evidenceUrls ?? previous?.sponsorEvidenceUrls, 40, 500),
    sponsorshipFit: cleanString(payload.sponsorshipFit ?? previous?.sponsorshipFit, 120),
    sponsorshipEstimatedSpend: cleanString(payload.sponsorshipEstimatedSpend ?? payload.estimatedSponsorshipSpend ?? previous?.sponsorshipEstimatedSpend, 120),
    sponsorshipThemes: cleanArray(payload.sponsorshipThemes ?? payload.sponsorshipValues ?? previous?.sponsorshipThemes, 24, 160),
    sponsorshipNotes: cleanString(payload.sponsorshipNotes ?? payload.evidenceNotes ?? previous?.sponsorshipNotes, 4000),
    sponsorEvidenceUpdatedAt: (payload.sponsorshipNotes !== undefined || payload.sponsoredEvents !== undefined || payload.sponsorEvidenceUrls !== undefined)
      ? now
      : cleanString(previous?.sponsorEvidenceUpdatedAt, 40),
    sponsorEvidenceUpdatedBy: (payload.sponsorshipNotes !== undefined || payload.sponsoredEvents !== undefined || payload.sponsorEvidenceUrls !== undefined)
      ? actor || "crm"
      : cleanString(previous?.sponsorEvidenceUpdatedBy, 180),
    aiVendor: payload.aiVendor === undefined ? previous?.aiVendor !== false : payload.aiVendor !== false,
    aiNative: payload.aiNative === true || previous?.aiNative === true,
    assignedTo: cleanString(payload.assignedTo ?? previous?.assignedTo ?? "Miller", 180),
    dateDiscovered: cleanString(previous?.dateDiscovered) || now.slice(0, 10),
    createdAt: cleanString(previous?.createdAt) || now,
    createdBy: cleanString(previous?.createdBy) || actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  const people = options.includePeople === false ? [] : await prospectPeople(env, companyId);
  const normalized = normalizeProspectCompany(key, record, people, config.weights);
  const next = {
    ...record,
    partnerScore: normalized.partnerScore,
    partnerPriority: normalized.partnerPriority,
    processingStage: normalized.processingStage,
    processingStatus: normalized.processingStatus,
    scoreAudit: scoreChanged
      ? [
        ...(Array.isArray(previous?.scoreAudit) ? previous.scoreAudit : []),
        { at: now, by: actor || "crm", from: previous?.partnerScoreOverride ?? "", to: normalized.partnerScoreOverride }
      ].slice(-50)
      : (Array.isArray(previous?.scoreAudit) ? previous.scoreAudit : [])
  };
  await writeSetupJson(env, key, next);
  if (scoreChanged) await writeProspectAudit(env, companyId, { actor, action: "score-override", from: previous?.partnerScoreOverride ?? "", to: normalized.partnerScoreOverride });
  return normalizeProspectCompany(key, next, people, config.weights);
}

async function saveDiscoveredProspectCompany(env, payload = {}, actor = "", config = null) {
  if (!cleanString(payload.companyName || payload.company || payload.name) &&
    !normalizeDomain(payload.canonicalDomain || payload.websiteUrl)) {
    throw new Error("Company name or domain is required.");
  }
  const activeConfig = config || await partnerScoreConfig(env);
  const companyId = prospectCompanyId(payload);
  const key = `${PARTNER_PROSPECT_COMPANY_PREFIX}${companyId}`;
  const previous = await readRawRecord(env, key);
  const now = new Date().toISOString();
  const record = {
    ...(previous || {}),
    ...payload,
    companyId,
    companyName: cleanString(payload.companyName || payload.company || previous?.companyName, 240),
    canonicalDomain: normalizeDomain(payload.canonicalDomain || payload.websiteUrl || previous?.canonicalDomain),
    websiteUrl: normalizeUrl(payload.websiteUrl || payload.canonicalDomain || previous?.websiteUrl),
    linkedinCompanyUrl: normalizeUrl(payload.linkedinCompanyUrl || previous?.linkedinCompanyUrl),
    sourceUrls: cleanArray([...(cleanArray(previous?.sourceUrls, 30, 500)), ...(cleanArray(payload.sourceUrls, 30, 500))], 30, 500),
    discoverySources: cleanArray([...(cleanArray(previous?.discoverySources, 20, 160)), ...(cleanArray(payload.discoverySources, 20, 160))], 20, 160),
    sourceAttributions: cleanSourceAttributions([
      ...(cleanSourceAttributions(previous?.sourceAttributions || previous?.discoveryAttributions, 80)),
      ...(cleanSourceAttributions(payload.sourceAttributions || payload.discoveryAttributions, 80))
    ], 80),
    discoveryAttributions: undefined,
    discoverySegment: cleanString(payload.discoverySegment ?? previous?.discoverySegment, 120),
    discoverySegments: cleanArray([
      ...(cleanArray(previous?.discoverySegments || previous?.discoverySegment, 12, 120)),
      ...(cleanArray(payload.discoverySegments || payload.discoverySegment, 12, 120))
    ], 12, 120),
    targetEmployeeRange: cleanString(payload.targetEmployeeRange ?? previous?.targetEmployeeRange, 80),
    employeeRangeStatus: cleanString(payload.employeeRangeStatus ?? previous?.employeeRangeStatus, 80),
    companySizeEvidence: cleanString(payload.companySizeEvidence ?? previous?.companySizeEvidence, 1000),
    categories: cleanArray(payload.categories ?? previous?.categories, 20, 160),
    targetExecutiveRoles: cleanArray(payload.targetExecutiveRoles ?? previous?.targetExecutiveRoles ?? payload.targetBuyers, 24, 160),
    sponsoredEvents: cleanArray([...(cleanArray(previous?.sponsoredEvents, 40, 240)), ...(cleanArray(payload.sponsoredEvents, 40, 240))], 40, 240),
    sponsorEvidenceUrls: cleanArray([...(cleanArray(previous?.sponsorEvidenceUrls || previous?.evidenceUrls, 40, 500)), ...(cleanArray(payload.sponsorEvidenceUrls || payload.evidenceUrls, 40, 500))], 40, 500),
    aiVendor: payload.aiVendor === undefined ? previous?.aiVendor !== false : payload.aiVendor !== false,
    aiNative: payload.aiNative === true || previous?.aiNative === true,
    assignedTo: cleanString(payload.assignedTo ?? previous?.assignedTo ?? "Miller", 180),
    dateDiscovered: cleanString(previous?.dateDiscovered) || now.slice(0, 10),
    createdAt: cleanString(previous?.createdAt) || now,
    createdBy: cleanString(previous?.createdBy) || actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  const normalized = normalizeProspectCompany(key, record, [], activeConfig.weights);
  const next = {
    ...record,
    partnerScore: normalized.partnerScore,
    partnerPriority: normalized.partnerPriority,
    processingStage: normalized.processingStage,
    processingStatus: normalized.processingStatus
  };
  await writeSetupJson(env, key, next);
  return normalizeProspectCompany(key, next, [], activeConfig.weights);
}

async function recalculateProspectCompanyRecord(env, key, record = {}, weights = defaultPartnerScoreWeights, actor = "") {
  const companyId = cleanString(record.companyId, 180) || key.replace(PARTNER_PROSPECT_COMPANY_PREFIX, "");
  const people = await prospectPeople(env, companyId);
  const normalized = normalizeProspectCompany(key, record, people, weights);
  const now = new Date().toISOString();
  const next = {
    ...record,
    companyId,
    partnerScore: normalized.partnerScore,
    partnerPriority: priorityBand(normalized.partnerScore),
    partnerStatus: cleanString(record.partnerStatus) || normalized.partnerStatus,
    updatedAt: now,
    updatedBy: actor || cleanString(record.updatedBy, 180) || "crm"
  };
  await writeSetupJson(env, key, next);
  return normalizeProspectCompany(key, next, people, weights);
}

async function savePartnerScoreConfig(env, payload = {}, actor = "") {
  const now = new Date().toISOString();
  const weights = cleanScoreWeights(payload.weights || payload);
  const record = {
    key: PARTNER_PROSPECT_SCORE_CONFIG_KEY,
    weights,
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  await writeSetupJson(env, PARTNER_PROSPECT_SCORE_CONFIG_KEY, record);

  const keys = await listKeys(env, PARTNER_PROSPECT_COMPANY_PREFIX);
  let recalculated = 0;
  for (const key of keys) {
    const company = await readRawRecord(env, key);
    if (!company) continue;
    await recalculateProspectCompanyRecord(env, key, company, weights, actor);
    recalculated += 1;
  }
  await writeProspectAudit(env, "score-config", {
    actor,
    action: "score-config-updated",
    recalculated,
    weights
  });
  return { ...record, recalculated };
}

async function reviewProspectCompany(env, payload = {}, actor = "") {
  const company = await findProspectCompany(env, payload);
  if (!company) throw new Error("Prospect company was not found.");
  const previous = await readRawRecord(env, company.key);
  if (!previous) throw new Error("Prospect company was not found.");
  const config = await partnerScoreConfig(env);
  const now = new Date().toISOString();
  const reviewAction = cleanString(payload.reviewAction || payload.reviewStatus || "human-verified", 120);
  const patch = {
    reviewedAt: now,
    reviewedBy: actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  };

  if (reviewAction === "mark-ai-vendor") {
    patch.aiVendor = true;
    patch.reviewStatus = "Human Verified AI Vendor";
    patch.humanVerifiedAt = now;
    patch.humanVerifiedBy = actor || "crm";
    patch.processingStatus = company.partnerScore >= 60 ? "READY FOR OUTREACH" : "NEEDS REVIEW";
  } else if (reviewAction === "mark-not-ai-vendor") {
    patch.aiVendor = false;
    patch.partnerStatus = "Vendor Universe";
    patch.reviewStatus = "Not AI Vendor";
    patch.processingStatus = "NEEDS REVIEW";
  } else if (reviewAction === "needs-review") {
    patch.reviewStatus = "Needs Review";
    patch.processingStatus = "NEEDS REVIEW";
  } else if (reviewAction === "override-category") {
    const primaryCategory = cleanString(payload.primaryCategory || payload.category, 160);
    const categories = cleanArray(payload.categories, 20, 160);
    if (!primaryCategory && !categories.length) throw new Error("Category is required.");
    patch.primaryCategory = primaryCategory || categories[0];
    patch.categories = cleanArray([primaryCategory, ...categories, ...(company.categories || [])], 20, 160);
    patch.reviewStatus = "Category Override";
    patch.humanVerifiedAt = previous.humanVerifiedAt || now;
    patch.humanVerifiedBy = previous.humanVerifiedBy || actor || "crm";
  } else if (reviewAction === "override-score") {
    const rawScoreOverride = String(payload.partnerScoreOverride ?? payload.partnerScore ?? "").trim().slice(0, 40);
    patch.partnerScoreOverride = rawScoreOverride === "" ? "" : cleanNumber(rawScoreOverride, company.partnerScore, 0, 100);
    patch.reviewStatus = "Score Override";
    patch.scoreAudit = [
      ...(Array.isArray(previous.scoreAudit) ? previous.scoreAudit : []),
      { at: now, by: actor || "crm", from: previous.partnerScoreOverride ?? previous.partnerScore ?? "", to: patch.partnerScoreOverride }
    ].slice(-50);
  } else {
    patch.reviewStatus = "Human Verified";
    patch.humanVerifiedAt = now;
    patch.humanVerifiedBy = actor || "crm";
  }

  if (payload.aiVendor !== undefined) patch.aiVendor = cleanBoolean(payload.aiVendor);
  if (payload.primaryCategory && reviewAction !== "override-category") patch.primaryCategory = cleanString(payload.primaryCategory, 160);
  if (payload.partnerScoreOverride !== undefined && reviewAction !== "override-score") {
    const rawScoreOverride = String(payload.partnerScoreOverride ?? "").trim().slice(0, 40);
    patch.partnerScoreOverride = rawScoreOverride === "" ? "" : cleanNumber(rawScoreOverride, company.partnerScore, 0, 100);
  }

  const merged = { ...previous, ...patch };
  const normalized = normalizeProspectCompany(company.key, merged, await prospectPeople(env, company.companyId), config.weights);
  const next = {
    ...merged,
    partnerScore: normalized.partnerScore,
    partnerPriority: priorityBand(normalized.partnerScore),
    partnerStatus: cleanString(merged.partnerStatus) || normalized.partnerStatus
  };
  await writeSetupJson(env, company.key, next);
  await writeProspectAudit(env, company.companyId, {
    actor,
    action: "human-review",
    reviewAction,
    reviewStatus: next.reviewStatus,
    partnerScore: next.partnerScore
  });
  return normalizeProspectCompany(company.key, next, await prospectPeople(env, company.companyId), config.weights);
}

async function saveProspectPeopleSearchMission(env, payload = {}, actor = "") {
  const company = await findProspectCompany(env, payload);
  if (!company) throw new Error("Prospect company was not found.");
  const previous = await readRawRecord(env, company.key);
  if (!previous) throw new Error("Prospect company was not found.");
  const config = await partnerScoreConfig(env);
  const now = new Date().toISOString();
  const status = cleanString(payload.peopleSearchStatus || payload.searchStatus || "Search Prepared", 120);
  const completed = /complete|done|people added/i.test(status);
  const record = {
    ...previous,
    peopleSearchStatus: status,
    peopleSearchRoles: cleanArray(payload.peopleSearchRoles || payload.targetRoles || previous.peopleSearchRoles || company.targetExecutiveRoles, 24, 160),
    peopleSearchQuery: cleanString(payload.peopleSearchQuery || previous.peopleSearchQuery, 500),
    peopleSearchNotes: cleanString(payload.peopleSearchNotes ?? payload.notes ?? previous.peopleSearchNotes, 4000),
    peopleSearchPreparedAt: cleanString(previous.peopleSearchPreparedAt) || now,
    peopleSearchPreparedBy: cleanString(previous.peopleSearchPreparedBy, 180) || actor || "crm",
    peopleSearchCompletedAt: completed ? now : cleanString(previous.peopleSearchCompletedAt, 40),
    peopleSearchCompletedBy: completed ? actor || "crm" : cleanString(previous.peopleSearchCompletedBy, 180),
    manualLeadListName: cleanString(payload.manualLeadListName || previous.manualLeadListName, 240),
    manualLeadListUrl: normalizeUrl(payload.manualLeadListUrl || previous.manualLeadListUrl),
    manualLeadListOwner: cleanString(payload.manualLeadListOwner || previous.manualLeadListOwner || actor, 180),
    manualLeadListUpdatedAt: now,
    processingStage: cleanString(previous.processingStage) || "PEOPLE RESEARCH",
    processingStatus: cleanString(previous.processingStatus) || "READY FOR PEOPLE SEARCH",
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  const normalized = normalizeProspectCompany(company.key, record, await prospectPeople(env, company.companyId), config.weights);
  const next = {
    ...record,
    partnerScore: normalized.partnerScore,
    partnerPriority: normalized.partnerPriority,
    partnerStatus: cleanString(record.partnerStatus) || normalized.partnerStatus
  };
  await writeSetupJson(env, company.key, next);
  await writeProspectAudit(env, company.companyId, {
    actor,
    action: "manual-people-search",
    status: next.peopleSearchStatus,
    leadListName: next.manualLeadListName,
    leadListUrl: next.manualLeadListUrl
  });
  return normalizeProspectCompany(company.key, next, await prospectPeople(env, company.companyId), config.weights);
}

function prospectOutreachPatch(action = "", existing = {}, now = new Date().toISOString()) {
  const normalized = cleanString(action, 120);
  const actionMap = {
    "Connection Sent": { outreachStatus: "Connection Sent", connectionRequestedAt: now },
    "Already Connected": { outreachStatus: "Connected", connectedAt: now },
    Connected: { outreachStatus: "Connected", connectedAt: now },
    "Message Sent": { outreachStatus: "Message Sent", firstMessageAt: existing.firstMessageAt || now, lastMessageAt: now },
    Responded: { outreachStatus: "Responded", respondedAt: now },
    "Meeting Scheduled": { outreachStatus: "Meeting Scheduled", meetingAt: now },
    "Not Relevant": { outreachStatus: "Not Relevant", notRelevantAt: now },
    Skip: { outreachStatus: "Skipped", skippedAt: now },
    Skipped: { outreachStatus: "Skipped", skippedAt: now }
  };
  if (normalized === "Not Contacted") {
    return cleanString(existing.outreachStatus) ? {} : { outreachStatus: "Not Contacted" };
  }
  return actionMap[normalized] || null;
}

async function saveProspectPerson(env, payload = {}, actor = "") {
  const companyId = cleanString(payload.companyId, 180);
  if (!companyId) throw new Error("Company is required before adding a prospect person.");
  const company = (await prospectCompanies(env)).find((row) => row.companyId === companyId);
  if (!company) throw new Error("Prospect company was not found.");
  const people = await prospectPeople(env, companyId);
  const linkedin = cleanString(payload.linkedinUrl, 500).toLowerCase().replace(/\/+$/, "");
  const fullName = cleanString(payload.fullName || payload.name || [payload.firstName, payload.lastName].filter(Boolean).join(" "), 240);
  const normalizedName = companySlug(fullName);
  const existing = people.find((person) =>
    (payload.key && person.key === payload.key) ||
    (linkedin && cleanString(person.linkedinUrl, 500).toLowerCase().replace(/\/+$/, "") === linkedin) ||
    (normalizedName && companySlug(person.fullName) === normalizedName)
  );
  const now = new Date().toISOString();
  const personId = cleanString(existing?.personId, 180) || prospectPersonId({ ...payload, fullName });
  const key = cleanString(existing?.key, 500) || `${PARTNER_PROSPECT_PERSON_PREFIX}${companyId}:${personId}`;
  const previous = existing?.key ? await readRawRecord(env, existing.key) : null;
  const outreachPatch = prospectOutreachPatch(payload.outreachStatus, previous || {}, now);
  const record = {
    ...(previous || {}),
    ...payload,
    outreachStatus: cleanString(previous?.outreachStatus, 120) || "Not Contacted",
    ...outreachPatch,
    personId,
    companyId,
    fullName,
    linkedinUrl: normalizeUrl(payload.linkedinUrl || previous?.linkedinUrl),
    assignedTo: cleanString(payload.assignedTo ?? previous?.assignedTo ?? company.assignedTo ?? "Miller", 180),
    createdAt: cleanString(previous?.createdAt) || now,
    createdBy: cleanString(previous?.createdBy) || actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  await writeSetupJson(env, key, record);
  const existingCompany = await readRawRecord(env, company.key);
  await writeSetupJson(env, company.key, {
    ...(existingCompany || {}),
    processingStage: "READY FOR OUTREACH",
    processingStatus: "READY FOR OUTREACH",
    updatedAt: now,
    updatedBy: actor || "crm"
  });
  return normalizeProspectPerson(key, record);
}

async function analyzeProspectWebsite(env, payload = {}, actor = "") {
  const company = await findProspectCompany(env, payload);
  if (!company) throw new Error("Prospect company was not found.");
  const targetUrl = normalizeUrl(payload.websiteUrl || company.websiteUrl || company.canonicalDomain);
  if (!targetUrl) throw new Error("Company website URL is required before analysis.");
  const config = await partnerScoreConfig(env);
  const now = new Date().toISOString();
  const existing = await readRawRecord(env, company.key);
  await writeSetupJson(env, company.key, {
    ...(existing || {}),
    processingStage: "WEBSITE ANALYSIS",
    processingStatus: "RUNNING",
    processingError: "",
    updatedAt: now,
    updatedBy: actor || "crm"
  });

  try {
    const { html } = await fetchPublicHtml(targetUrl);
    const title = htmlTitle(html);
    const description = htmlMetaDescription(html);
    const text = stripHtml(html).slice(0, 18000);
    const classification = classifyWebsiteText(`${title}\n${description}\n${text}`);
    const previous = await readRawRecord(env, company.key);
    const sourceUrls = cleanArray([...(company.sourceUrls || []), targetUrl], 30, 500);
    const categories = cleanArray([...classification.categories, ...(company.categories || [])], 20, 160);
    const targetExecutiveRoles = cleanArray([...classification.targetBuyers, ...(company.targetExecutiveRoles || [])], 24, 160);
    const record = {
      ...(previous || {}),
      description: description || cleanString(previous?.description, 4000) || title,
      aiVendor: classification.isAiVendor,
      aiNative: classification.aiNative,
      aiRelevanceScore: classification.aiRelevance,
      enterpriseFocus: classification.enterpriseFocus,
      primaryCategory: categories[0] || cleanString(previous?.primaryCategory, 160),
      categories,
      targetExecutiveRoles,
      classificationReason: classification.reason,
      sourceUrls,
      provenance: {
        ...(previous?.provenance && typeof previous.provenance === "object" ? previous.provenance : {}),
        websiteAnalysis: {
          source: "WEBSITE_ANALYSIS",
          url: targetUrl,
          valueState: "AI_INFERRED",
          verifiedAt: now
        }
      },
      lastVerified: now.slice(0, 10),
      lastEnriched: now.slice(0, 10),
      processingStage: "AI CLASSIFICATION",
      processingStatus: classification.isAiVendor ? "READY FOR OUTREACH" : "NEEDS REVIEW",
      processingError: "",
      updatedAt: now,
      updatedBy: actor || "crm"
    };
    const normalized = normalizeProspectCompany(company.key, record, await prospectPeople(env, company.companyId), config.weights);
    await writeSetupJson(env, company.key, {
      ...record,
      partnerScore: normalized.partnerScore,
      partnerPriority: normalized.partnerPriority,
      partnerStatus: cleanString(record.partnerStatus) || normalized.partnerStatus
    });
    await writeProspectAudit(env, company.companyId, { actor, action: "website-analysis", url: targetUrl, isAiVendor: classification.isAiVendor });
    return normalizeProspectCompany(company.key, await readRawRecord(env, company.key), await prospectPeople(env, company.companyId), config.weights);
  } catch (error) {
    const failed = await readRawRecord(env, company.key);
    await writeSetupJson(env, company.key, {
      ...(failed || {}),
      processingStage: "WEBSITE ANALYSIS",
      processingStatus: "FAILED",
      processingError: cleanString(error.message || "Website analysis failed.", 1000),
      updatedAt: new Date().toISOString(),
      updatedBy: actor || "crm"
    });
    throw error;
  }
}

async function runSourceDiscovery(env, payload = {}, actor = "") {
  const sourceUrl = normalizeUrl(payload.sourceUrl || payload.url);
  if (!sourceUrl) throw new Error("A discovery source URL is required.");
  const sourceName = cleanString(payload.sourceName || payload.discoverySource || payload.source || "Web Discovery", 160);
  const source = await saveProspectSource(env, {
    sourceId: payload.sourceId || payload.starterSourceId,
    sourceName,
    sourceUrl,
    sourceType: payload.sourceType || "Public Web",
    category: payload.category,
    description: payload.description
  }, actor);
  const limit = cleanNumber(payload.limit, 8, 1, 8);
  const targetNewCompanies = cleanNumber(payload.targetNewCompanies || payload.targetNew || payload.targetRemaining || Math.min(limit, 5), Math.min(limit, 5), 1, 5);
  const now = new Date().toISOString();
  const debug = { accepted: [], rejected: [], skipped: [] };
  const debugRunId = `${companySlug(sourceName) || "source"}:${now}`;
  try {
    const { html } = await fetchPublicHtml(sourceUrl);
    const title = htmlTitle(html);
    const shouldCrawlSponsorPages = sourceWantsSponsorCrawl({ ...source, ...payload }, payload);
    const crawlPageLimit = cleanNumber(payload.crawlPageLimit || payload.maxSponsorPages || source.crawlPageLimit, 1, 0, 1);
    const discoveryPages = [{ url: sourceUrl, html, title, role: "source" }];
    if (shouldCrawlSponsorPages && crawlPageLimit > 0) {
      const sponsorPageUrls = extractSponsorCrawlLinks(html, sourceUrl, crawlPageLimit, debug);
      for (const sponsorPageUrl of sponsorPageUrls) {
        try {
          const sponsorPage = await fetchPublicHtml(sponsorPageUrl);
          discoveryPages.push({
            url: sponsorPageUrl,
            html: sponsorPage.html,
            title: htmlTitle(sponsorPage.html),
            role: "sponsor-page"
          });
        } catch (pageError) {
          recordDiscoveryDiagnostic(debug, "rejected", {
            href: sponsorPageUrl,
            reason: `sponsor-page-fetch-failed: ${pageError.message}`
          });
        }
      }
    }
    const candidatePages = shouldCrawlSponsorPages
      ? discoveryPages.filter((page) => page.role === "sponsor-page" || sponsorPageScore(page.url, page.title) > 0)
      : discoveryPages;
    const candidates = mergeDiscoveryCandidates(candidatePages.map((page) => ({
      ...page,
      candidates: extractCompanyLinks(page.html, page.url, limit, debug)
    })), limit);
    const saved = [];
    const existingCompanies = Array.isArray(payload.existingCompanies) ? payload.existingCompanies : [];
    const seenCompanyIds = payload.seenCompanyIds instanceof Set
      ? payload.seenCompanyIds
      : new Set(existingCompanies.map((company) => company.companyId).filter(Boolean));
    let skippedExisting = 0;
    let taggedExisting = 0;
    const config = await partnerScoreConfig(env);
    const category = discoveryCategoryForSource(source);
    for (const candidate of candidates) {
      const candidateEmployeeCount = cleanNumber(candidate.employeeCount, 0, 0, 1000000);
      if (payload.targetEmployeeRange && candidateEmployeeCount && !employeeCountMatchesTarget(candidateEmployeeCount, payload.targetEmployeeRange)) {
        recordDiscoveryDiagnostic(debug, "rejected", {
          href: candidate.sourceProfileUrl || candidate.sourceUrl || candidate.websiteUrl,
          rawLabel: candidate.rawLabel || candidate.companyName,
          companyName: candidate.companyName,
          reason: `employee-count-outside-${payload.targetEmployeeRange}`
        });
        continue;
      }
      const candidatePayload = {
        companyName: candidate.companyName,
        canonicalDomain: candidate.canonicalDomain,
        websiteUrl: candidate.websiteUrl
      };
      const candidateId = prospectCompanyId(candidatePayload);
      let existing = findProspectCompanyInList(existingCompanies, candidatePayload);
      if (!existing) existing = await findProspectCompanyDirect(env, candidatePayload, config, { includePeople: false });
      const sourceAttribution = discoverySourceAttribution({
        source,
        candidate,
        sourceName,
        sourceUrl,
        title: candidate.sourcePageTitle || title,
        payload,
        now,
        category
      });
      const sponsorRelated = sourceLooksSponsorRelated(source, payload);
      if ((candidateId && seenCompanyIds.has(candidateId)) || existing) {
        skippedExisting += 1;
        const matchedExisting = existing || existingCompanies.find((company) => company.companyId === candidateId);
        if (matchedExisting) {
          const updatedExisting = await saveProspectCompany(env, {
            companyId: matchedExisting.companyId,
            companyName: matchedExisting.companyName || candidate.companyName,
            canonicalDomain: matchedExisting.canonicalDomain || candidate.canonicalDomain,
            websiteUrl: matchedExisting.websiteUrl || candidate.websiteUrl,
            discoverySegment: payload.discoverySegment || matchedExisting.discoverySegment,
            discoverySegments: cleanArray([payload.discoverySegment], 12, 120),
            targetEmployeeRange: payload.targetEmployeeRange || matchedExisting.targetEmployeeRange,
            employeeRangeStatus: payload.employeeRangeStatus || matchedExisting.employeeRangeStatus || (payload.targetEmployeeRange ? "TARGETED_NOT_VERIFIED" : ""),
            companySizeEvidence: payload.companySizeEvidence || matchedExisting.companySizeEvidence || (payload.targetEmployeeRange ? `Found through ${sourceName}, which is being used for the ${payload.targetEmployeeRange} employee discovery lane; verify actual employee count before outreach prioritization.` : ""),
            discoverySources: [sourceName],
            sourceUrls: cleanArray([sourceUrl, candidate.sourceUrl, candidate.sourceProfileUrl], 30, 500),
            sourceAttributions: sourceAttribution ? [sourceAttribution] : [],
            sponsoredEvents: sponsorRelated ? [sourceName] : [],
            sponsorEvidenceUrls: sponsorRelated ? cleanArray([sourceUrl, candidate.sourceUrl, candidate.sourceProfileUrl], 40, 500) : [],
            sponsorshipFit: sponsorRelated ? (matchedExisting.sponsorshipFit || "Needs Review") : matchedExisting.sponsorshipFit,
            sponsorshipNotes: sponsorRelated && !matchedExisting.sponsorshipNotes
              ? `Found on ${sourceName}${candidate.sourceUrl && candidate.sourceUrl !== sourceUrl ? ` via ${candidate.sourceUrl}` : ""}; verify sponsorship level and spend manually.`
              : matchedExisting.sponsorshipNotes,
            mergeDiscoverySourceFields: true
          }, actor, { directOnly: true, includePeople: false });
          const index = existingCompanies.findIndex((company) => company.companyId === updatedExisting.companyId);
          if (index >= 0) existingCompanies[index] = updatedExisting;
          taggedExisting += 1;
        }
        debug.skipped.push({
          companyName: candidate.companyName,
          domain: candidate.canonicalDomain,
          url: candidate.websiteUrl,
          reason: existing ? "already in Vendor Universe" : "duplicate in this discovery run"
        });
        continue;
      }
      const record = await saveDiscoveredProspectCompany(env, {
        companyName: candidate.companyName,
        canonicalDomain: candidate.canonicalDomain,
        websiteUrl: candidate.websiteUrl,
        employeeCount: candidate.employeeCount,
        employeeRange: candidate.employeeRange,
        description: discoveryDescriptionForCandidate(candidate, source, candidate.sourcePageTitle || title),
        classificationReason: discoveryReasonForCandidate(candidate, source, candidate.sourcePageTitle || title),
        primaryCategory: category,
        categories: [category],
        aiRelevanceScore: /directory|forbes|ai/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`) ? 70 : 55,
        enterpriseFocus: /sponsor|conference|summit|expo|enterprise/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`) ? 75 : 60,
        sponsorshipFit: /sponsor|conference|summit|expo|exhibitor|partner/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`) ? "Needs Review" : "",
        sponsoredEvents: /sponsor|conference|summit|expo|exhibitor|partner/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`) ? [sourceName] : [],
        sponsorEvidenceUrls: /sponsor|conference|summit|expo|exhibitor|partner/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`) ? cleanArray([sourceUrl, candidate.sourceUrl, candidate.sourceProfileUrl], 40, 500) : [],
        sponsorshipNotes: /sponsor|conference|summit|expo|exhibitor|partner/i.test(`${source.sourceType} ${source.category} ${source.sourceName}`)
          ? `Found on ${sourceName}${candidate.sourceUrl && candidate.sourceUrl !== sourceUrl ? ` via ${candidate.sourceUrl}` : ""}; verify sponsorship level and spend manually.`
          : "",
        discoverySegment: payload.discoverySegment,
        discoverySegments: cleanArray([payload.discoverySegment], 12, 120),
        targetEmployeeRange: payload.targetEmployeeRange,
        employeeRangeStatus: candidate.employeeCount ? "SOURCE_REPORTED" : payload.employeeRangeStatus || (payload.targetEmployeeRange ? "TARGETED_NOT_VERIFIED" : ""),
        companySizeEvidence: candidate.companySizeEvidence || payload.companySizeEvidence || (payload.targetEmployeeRange ? `Found through ${sourceName}, which is being used for the ${payload.targetEmployeeRange} employee discovery lane; verify actual employee count before outreach prioritization.` : ""),
        discoverySources: [sourceName],
        sourceUrls: cleanArray([sourceUrl, candidate.sourceUrl, candidate.sourceProfileUrl], 30, 500),
        sourceAttributions: sourceAttribution ? [sourceAttribution] : [],
        processingStage: "DOMAIN NORMALIZATION",
        processingStatus: "DISCOVERED",
        provenance: {
          discovery: {
            source: sourceName,
            sourceType: source.sourceType,
            sourcePageTitle: title,
            url: sourceUrl,
            candidateSourceUrl: candidate.sourceUrl || "",
            candidateSourcePageTitle: candidate.sourcePageTitle || "",
            sourceProfileUrl: candidate.sourceProfileUrl || "",
            valueState: "SOURCE_PROVIDED",
            discoveredAt: now
          }
        }
      }, actor, config);
      saved.push(record);
      existingCompanies.push(record);
      if (record.companyId) seenCompanyIds.add(record.companyId);
      if (candidateId) seenCompanyIds.add(candidateId);
      if (saved.length >= targetNewCompanies) break;
    }
    await writeSetupJson(env, source.key, {
      ...source,
      lastRunAt: now,
      lastRunBy: actor || "crm",
      lastRunStatus: "completed",
      lastRunError: "",
      discoveredCount: Number(source.discoveredCount || 0) + saved.length,
      skippedExistingCount: Number(source.skippedExistingCount || 0) + skippedExisting,
      taggedExistingCount: Number(source.taggedExistingCount || 0) + taggedExisting,
      updatedAt: now,
      updatedBy: actor || "crm"
    });
    await writeProspectAudit(env, companySlug(sourceName) || "source-discovery", {
      actor,
      action: "source-discovery",
      sourceName,
      sourceUrl,
      candidates: candidates.length,
      discovered: saved.length,
      skippedExisting,
      taggedExisting
    });
    await writeProspectDebug(env, debugRunId, {
      actor,
      action: "source-discovery",
      sourceName,
      sourceUrl,
      sourceTitle: title,
      status: "completed",
      candidates: candidates.length,
      discovered: saved.length,
      skippedExisting,
      taggedExisting,
      crawledPages: discoveryPages.map((page) => ({ url: page.url, title: page.title, role: page.role })),
      accepted: debug.accepted,
      rejected: debug.rejected,
      skipped: debug.skipped
    });
    return {
      sourceName,
      sourceUrl,
      sourceTitle: title,
      crawledPages: discoveryPages.map((page) => ({ url: page.url, title: page.title, role: page.role })),
      candidates: candidates.length,
      discovered: saved.length,
      skippedExisting,
      taggedExisting,
      companies: saved,
      skipped: debug.skipped
    };
  } catch (error) {
    await writeSetupJson(env, source.key, {
      ...source,
      lastRunAt: now,
      lastRunBy: actor || "crm",
      lastRunStatus: "failed",
      lastRunError: cleanString(error.message || "Discovery source failed.", 1000),
      updatedAt: now,
      updatedBy: actor || "crm"
    });
    await writeProspectDebug(env, debugRunId, {
      actor,
      action: "source-discovery",
      sourceName,
      sourceUrl,
      status: "failed",
      error: cleanString(error.message, 1000),
      accepted: debug.accepted,
      rejected: debug.rejected,
      skipped: debug.skipped
    });
    throw error;
  }
}

function prospectStarterSourceById(sourceId = "") {
  const cleaned = cleanString(sourceId, 180);
  return partnerProspectStarterSources.find((source) => source.sourceId === cleaned || companySlug(source.sourceName) === cleaned) || null;
}

function prospectEmergingSourceById(sourceId = "") {
  const cleaned = cleanString(sourceId, 180);
  return emergingCompanyStarterSources.find((source) => source.sourceId === cleaned || companySlug(source.sourceName) === cleaned) || null;
}

function prospectCompanyMatchesPayload(company = {}, payload = {}) {
  const requestedKey = cleanString(payload.key || payload.companyKey, 500);
  const requestedId = cleanString(payload.companyId, 180);
  const domain = normalizeDomain(payload.canonicalDomain || payload.websiteUrl);
  const linkedin = cleanString(payload.linkedinCompanyUrl, 500).toLowerCase().replace(/\/+$/, "");
  const name = companySlug(payload.companyName || payload.company || payload.name);
  return (requestedKey && company.key === requestedKey) ||
    (requestedId && company.companyId === requestedId) ||
    (domain && company.canonicalDomain === domain) ||
    (linkedin && cleanString(company.linkedinCompanyUrl, 500).toLowerCase().replace(/\/+$/, "") === linkedin) ||
    (name && companySlug(company.companyName) === name);
}

function findProspectCompanyInList(companies = [], payload = {}) {
  return companies.find((company) => prospectCompanyMatchesPayload(company, payload)) || null;
}

async function starterSourcesWithRunState(env, savedSourceRows = null) {
  const savedSources = Array.isArray(savedSourceRows) ? savedSourceRows : await prospectSources(env);
  const savedById = new Map(savedSources.map((source) => [source.sourceId, source]));
  return partnerProspectStarterSources.map((source, index) => {
    const saved = savedById.get(source.sourceId) || {};
    return {
      ...source,
      runOrder: index,
      lastRunAt: cleanString(saved.lastRunAt, 40),
      lastRunBy: cleanString(saved.lastRunBy, 180),
      lastRunStatus: cleanString(saved.lastRunStatus, 80),
      lastRunError: cleanString(saved.lastRunError, 1000),
      discoveredCount: cleanNumber(saved.discoveredCount, 0, 0, 1000000),
      skippedExistingCount: cleanNumber(saved.skippedExistingCount, 0, 0, 1000000),
      taggedExistingCount: cleanNumber(saved.taggedExistingCount, 0, 0, 1000000),
      updatedAt: cleanString(saved.updatedAt, 40)
    };
  });
}

async function emergingSourcesWithRunState(env, savedSourceRows = null) {
  const savedSources = Array.isArray(savedSourceRows) ? savedSourceRows : await prospectSources(env);
  const savedById = new Map(savedSources.map((source) => [source.sourceId, source]));
  return emergingCompanyStarterSources.map((source, index) => {
    const saved = savedById.get(source.sourceId) || {};
    return {
      ...source,
      runOrder: index,
      lastRunAt: cleanString(saved.lastRunAt, 40),
      lastRunBy: cleanString(saved.lastRunBy, 180),
      lastRunStatus: cleanString(saved.lastRunStatus, 80),
      lastRunError: cleanString(saved.lastRunError, 1000),
      discoveredCount: cleanNumber(saved.discoveredCount, 0, 0, 1000000),
      skippedExistingCount: cleanNumber(saved.skippedExistingCount, 0, 0, 1000000),
      taggedExistingCount: cleanNumber(saved.taggedExistingCount, 0, 0, 1000000),
      updatedAt: cleanString(saved.updatedAt, 40)
    };
  });
}

function starterSourcesForRun(sources = [], maxSources = 1) {
  return [...sources]
    .sort((a, b) => {
      const aLast = a.lastRunAt ? Date.parse(a.lastRunAt) || 0 : 0;
      const bLast = b.lastRunAt ? Date.parse(b.lastRunAt) || 0 : 0;
      if (aLast !== bLast) return aLast - bLast;
      return Number(a.runOrder || 0) - Number(b.runOrder || 0);
    })
    .slice(0, maxSources);
}

async function runStarterProspectSource(env, payload = {}, actor = "") {
  const source = prospectStarterSourceById(payload.sourceId || payload.starterSourceId);
  if (!source) throw new Error("Starter discovery source was not found.");
  return runSourceDiscovery(env, {
    ...source,
    limit: payload.limit || 8,
    targetNewCompanies: payload.targetNewCompanies || payload.targetNew || 5,
    crawlPageLimit: payload.crawlPageLimit ?? 1
  }, actor);
}

async function runStarterProspectSources(env, payload = {}, actor = "") {
  const selectedIds = cleanArray(payload.sourceIds || payload.starterSourceIds, 30, 180);
  const targetNewCompanies = cleanNumber(payload.targetNewCompanies || payload.targetNew, 5, 1, 5);
  const maxSources = cleanNumber(payload.maxSources, 1, 1, 1);
  const limitPerSource = cleanNumber(payload.limitPerSource || payload.limit, 8, 1, 8);
  const starterSources = await starterSourcesWithRunState(env);
  const selectedSet = new Set(selectedIds);
  const sources = selectedIds.length
    ? starterSources.filter((source) => selectedSet.has(source.sourceId) || selectedSet.has(companySlug(source.sourceName)))
    : starterSourcesForRun(starterSources, maxSources);
  const existingCompanies = [];
  const seenCompanyIds = new Set();
  const results = [];
  for (const source of sources) {
    const remaining = targetNewCompanies - results.reduce((sum, result) => sum + Number(result.discovered || 0), 0);
    if (remaining <= 0) break;
    try {
      const result = await runSourceDiscovery(env, {
        ...source,
        limit: limitPerSource,
        crawlPageLimit: payload.crawlPageLimit ?? 1,
        targetRemaining: remaining,
        existingCompanies,
        seenCompanyIds
      }, actor);
      results.push({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        ok: true,
        candidates: result.candidates,
        discovered: result.discovered,
        skippedExisting: result.skippedExisting
      });
    } catch (error) {
      results.push({ sourceId: source.sourceId, sourceName: source.sourceName, ok: false, error: cleanString(error.message, 500) });
    }
  }
  const discovered = results.reduce((sum, result) => sum + Number(result.discovered || 0), 0);
  const candidates = results.reduce((sum, result) => sum + Number(result.candidates || 0), 0);
  const skippedExisting = results.reduce((sum, result) => sum + Number(result.skippedExisting || 0), 0);
  await writeProspectAudit(env, "starter-sources", {
    actor,
    action: "run-starter-discovery-sources",
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    targetNewCompanies,
    candidates,
    discovered,
    skippedExisting
  });
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    targetNewCompanies,
    candidates,
    discovered,
    skippedExisting,
    exhausted: discovered < targetNewCompanies && results.length >= sources.length,
    results
  };
}

async function runEmergingProspectSources(env, payload = {}, actor = "") {
  const selectedIds = cleanArray(payload.sourceIds || payload.emergingSourceIds, 30, 180);
  const targetNewCompanies = cleanNumber(payload.targetNewCompanies || payload.targetNew, 5, 1, 5);
  const maxSources = cleanNumber(payload.maxSources, 1, 1, 1);
  const limitPerSource = cleanNumber(payload.limitPerSource || payload.limit, 8, 1, 8);
  const emergingSources = await emergingSourcesWithRunState(env);
  const selectedSet = new Set(selectedIds);
  const sources = selectedIds.length
    ? emergingSources.filter((source) => selectedSet.has(source.sourceId) || selectedSet.has(companySlug(source.sourceName)))
    : starterSourcesForRun(emergingSources, maxSources);
  const existingCompanies = [];
  const seenCompanyIds = new Set();
  const results = [];
  for (const source of sources) {
    const remaining = targetNewCompanies - results.reduce((sum, result) => sum + Number(result.discovered || 0), 0);
    if (remaining <= 0) break;
    try {
      const result = await runSourceDiscovery(env, {
        ...source,
        limit: limitPerSource,
        crawlPageLimit: payload.crawlPageLimit ?? 1,
        targetRemaining: remaining,
        targetNewCompanies: remaining,
        discoverySegment: emergingCompanyDiscoverySegment,
        targetEmployeeRange: emergingCompanyTargetEmployeeRange,
        employeeRangeStatus: "TARGETED_NOT_VERIFIED",
        companySizeEvidence: `Found through ${source.sourceName}, an Emerging 10-100 discovery source; verify actual employee count before outreach prioritization.`,
        existingCompanies,
        seenCompanyIds
      }, actor);
      results.push({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        ok: true,
        candidates: result.candidates,
        discovered: result.discovered,
        skippedExisting: result.skippedExisting,
        taggedExisting: result.taggedExisting
      });
    } catch (error) {
      results.push({ sourceId: source.sourceId, sourceName: source.sourceName, ok: false, error: cleanString(error.message, 500) });
    }
  }
  const discovered = results.reduce((sum, result) => sum + Number(result.discovered || 0), 0);
  const candidates = results.reduce((sum, result) => sum + Number(result.candidates || 0), 0);
  const skippedExisting = results.reduce((sum, result) => sum + Number(result.skippedExisting || 0), 0);
  const taggedExisting = results.reduce((sum, result) => sum + Number(result.taggedExisting || 0), 0);
  await writeProspectAudit(env, "emerging-10-100-sources", {
    actor,
    action: "run-emerging-10-100-sources",
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    targetNewCompanies,
    candidates,
    discovered,
    skippedExisting,
    taggedExisting
  });
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    targetNewCompanies,
    candidates,
    discovered,
    skippedExisting,
    taggedExisting,
    exhausted: discovered < targetNewCompanies && results.length >= sources.length,
    results
  };
}

async function importProspectCompanies(env, payload = {}, actor = "") {
  const sourceName = cleanString(payload.sourceName || payload.discoverySource || "Bulk Import", 160);
  const sourceUrl = normalizeUrl(payload.sourceUrl || payload.url);
  const rows = Array.isArray(payload.rows)
    ? payload.rows
    : parseCompanyImportRows(payload.importText || payload.csv || payload.companiesText);
  if (!rows.length) throw new Error("Paste at least one company row before importing.");
  const now = new Date().toISOString();
  const saved = [];
  for (const row of rows.slice(0, 500)) {
    const company = await saveProspectCompany(env, {
      ...row,
      discoverySources: cleanArray([sourceName, ...(cleanArray(row.discoverySources || row.sources))], 20, 160),
      sourceUrls: cleanArray([sourceUrl, ...(cleanArray(row.sourceUrls, 30, 500))], 30, 500),
      sourceAttributions: cleanSourceAttributions([{
        sourceName,
        sourceType: "Bulk Import",
        evidenceType: "company-import",
        sourceUrl,
        candidateName: row.companyName || row.company || row.name,
        canonicalDomain: row.canonicalDomain || row.websiteUrl,
        websiteUrl: row.websiteUrl || row.canonicalDomain,
        valueState: "SOURCE_PROVIDED",
        importedAt: now
      }], 1),
      mergeDiscoverySourceFields: true,
      processingStage: cleanString(row.processingStage) || "DUPLICATE CHECK",
      processingStatus: cleanString(row.processingStatus) || "DISCOVERED",
      provenance: {
        ...(row.provenance && typeof row.provenance === "object" ? row.provenance : {}),
        bulkImport: {
          source: sourceName,
          url: sourceUrl,
          valueState: "SOURCE_PROVIDED",
          importedAt: now
        }
      }
    }, actor);
    saved.push(company);
  }
  await writeProspectAudit(env, companySlug(sourceName) || "bulk-import", {
    actor,
    action: "bulk-import",
    sourceName,
    sourceUrl,
    imported: saved.length
  });
  return { sourceName, sourceUrl, imported: saved.length, companies: saved };
}

async function rerunProspectSource(env, payload = {}, actor = "") {
  const sourceId = cleanString(payload.sourceId, 180);
  const key = sourceId
    ? `${PARTNER_PROSPECT_SOURCE_PREFIX}${sourceId}`
    : cleanString(payload.sourceKey || payload.key, 500);
  const record = key ? await readRawRecord(env, key) : null;
  if (!record) throw new Error("Discovery source was not found.");
  const source = normalizeProspectSource(key, record);
  return runSourceDiscovery(env, {
    sourceName: source.sourceName,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    limit: payload.limit || 8,
    crawlPageLimit: payload.crawlPageLimit ?? 1
  }, actor);
}

async function runAllProspectSources(env, payload = {}, actor = "") {
  const limitPerSource = cleanNumber(payload.limitPerSource || payload.limit, 8, 1, 12);
  const maxSources = cleanNumber(payload.maxSources, 1, 1, 2);
  const sources = (await prospectSources(env))
    .filter((source) => source.status !== "disabled" && source.sourceUrl)
    .slice(0, maxSources);
  const results = [];
  for (const source of sources) {
    try {
      const result = await runSourceDiscovery(env, {
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        limit: limitPerSource
      }, actor);
      results.push({ sourceId: source.sourceId, sourceName: source.sourceName, ok: true, discovered: result.discovered });
    } catch (error) {
      results.push({ sourceId: source.sourceId, sourceName: source.sourceName, ok: false, error: cleanString(error.message, 500) });
    }
  }
  await writeProspectAudit(env, "run-all-sources", {
    actor,
    action: "run-all-discovery-sources",
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    discovered: results.reduce((sum, result) => sum + Number(result.discovered || 0), 0)
  });
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    discovered: results.reduce((sum, result) => sum + Number(result.discovered || 0), 0),
    results
  };
}

async function batchAnalyzeProspectWebsites(env, payload = {}, actor = "") {
  const limit = cleanNumber(payload.limit, 10, 1, 25);
  const companies = await prospectCompanies(env);
  const candidates = companies
    .filter((company) =>
      !company.lastEnriched &&
      company.websiteUrl &&
      !["RUNNING"].includes(company.processingStatus)
    )
    .slice(0, limit);
  const results = [];
  for (const company of candidates) {
    try {
      const analyzed = await analyzeProspectWebsite(env, { companyId: company.companyId }, actor);
      results.push({ companyId: company.companyId, companyName: company.companyName, ok: true, partnerScore: analyzed.partnerScore });
    } catch (error) {
      results.push({ companyId: company.companyId, companyName: company.companyName, ok: false, error: cleanString(error.message, 500) });
    }
  }
  await writeProspectAudit(env, "batch-analysis", {
    actor,
    action: "batch-website-analysis",
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length
  });
  return { attempted: results.length, succeeded: results.filter((result) => result.ok).length, results };
}

async function recordProspectOutreach(env, payload = {}, actor = "") {
  const key = cleanString(payload.personKey || payload.key, 500);
  const existing = key ? await readRawRecord(env, key) : null;
  if (!existing) throw new Error("Prospect person was not found.");
  const now = new Date().toISOString();
  const action = cleanString(payload.outreachAction || payload.status || payload.actionName, 120);
  const patch = prospectOutreachPatch(action, existing, now);
  if (!patch) throw new Error("Unsupported outreach action.");
  const record = {
    ...existing,
    ...patch,
    notes: cleanString(payload.notes ?? existing.notes, 4000),
    updatedAt: now,
    updatedBy: actor || "crm"
  };
  await writeSetupJson(env, key, record);
  const companyKey = `${PARTNER_PROSPECT_COMPANY_PREFIX}${cleanString(existing.companyId, 180)}`;
  const company = await readRawRecord(env, companyKey);
  if (company) {
    await writeSetupJson(env, companyKey, {
      ...company,
      partnerStatus: ["Vendor Universe", "Partner Target", "Ready For Outreach"].includes(cleanString(company.partnerStatus)) ? "In Outreach" : company.partnerStatus,
      lastContactAt: now,
      updatedAt: now,
      updatedBy: actor || "crm"
    });
  }
  await writeProspectAudit(env, existing.companyId, { actor, action: "outreach", personKey: key, outreachAction: action });
  return normalizeProspectPerson(key, record);
}

async function retryProspectStage(env, payload = {}, actor = "") {
  const company = await findProspectCompany(env, payload);
  if (!company) throw new Error("Prospect company was not found.");
  const existing = await readRawRecord(env, company.key);
  const now = new Date().toISOString();
  await writeSetupJson(env, company.key, {
    ...(existing || {}),
    processingStatus: "DISCOVERED",
    processingError: "",
    retryCount: Number(existing?.retryCount || 0) + 1,
    updatedAt: now,
    updatedBy: actor || "crm"
  });
  await writeProspectAudit(env, company.companyId, { actor, action: "retry-stage", stage: company.processingStage });
}

async function convertProspectCompany(env, payload = {}, actor = "") {
  const company = await findProspectCompany(env, payload);
  if (!company) throw new Error("Prospect company was not found.");
  const people = await prospectPeople(env, company.companyId);
  const now = new Date().toISOString();
  const slug = companySlug(company.companyName);
  const companyKey = `partner-company:${slug}`;
  const existingCompany = await readRawRecord(env, companyKey);
  const contacts = Array.isArray(existingCompany?.contacts) ? existingCompany.contacts : [];
  const contactMap = new Map(contacts.map((entry) => [
    cleanString(entry?.email).toLowerCase() || cleanString(entry?.linkedinUrl).toLowerCase() || cleanString(entry?.name).toLowerCase(),
    entry
  ]));
  for (const person of people) {
    const identity = cleanString(person.email).toLowerCase() || cleanString(person.linkedinUrl).toLowerCase() || cleanString(person.fullName).toLowerCase();
    if (!identity) continue;
    contactMap.set(identity, {
      ...(contactMap.get(identity) || {}),
      id: person.email || person.personId,
      email: person.email,
      name: person.fullName,
      company: company.companyName,
      companySlug: slug,
      title: person.title,
      source: "Partner Prospecting",
      updatedAt: now,
      updatedBy: actor || "crm"
    });
  }
  await writeSetupJson(env, companyKey, {
    ...(existingCompany || {}),
    organizationName: cleanString(existingCompany?.organizationName || company.companyName, 240),
    company: company.companyName,
    companySlug: slug,
    tier: "Partner Candidate",
    status: "partner-candidate",
    contacts: [...contactMap.values()],
    source: cleanString(existingCompany?.source) || "Partner Prospecting",
    updatedAt: now,
    updatedBy: actor || "crm"
  });
  const existingProspect = await readRawRecord(env, company.key);
  await writeSetupJson(env, company.key, {
    ...(existingProspect || {}),
    partnerStatus: "Partner Candidate",
    convertedPartnerKey: companyKey,
    convertedAt: now,
    convertedBy: actor || "crm",
    updatedAt: now,
    updatedBy: actor || "crm"
  });
  await writeProspectAudit(env, company.companyId, { actor, action: "convert-to-partner-candidate", partnerKey: companyKey });
  return { companyKey };
}

function prospectDashboard(companies = [], people = []) {
  const sourceRows = new Map();
  for (const company of companies) {
    const sources = company.discoverySources.length ? company.discoverySources : ["Manual"];
    for (const source of sources) {
      const row = sourceRows.get(source) || {
        source,
        companies: 0,
        qualified: 0,
        ready: 0,
        contacted: 0,
        responses: 0,
        meetings: 0,
        partners: 0,
        totalScore: 0,
        avgScore: 0
      };
      row.companies += 1;
      if (company.aiVendor && company.partnerScore >= 60) row.qualified += 1;
      if (company.processingStatus === "READY FOR OUTREACH") row.ready += 1;
      if (company.outreach.peopleAttempted > 0) row.contacted += 1;
      if (company.outreach.responses > 0) row.responses += 1;
      row.meetings += company.outreach.meetings || 0;
      if (["Partner Candidate", "Research Partner", "Summit Partner", "Strategic Partner"].includes(company.partnerStatus)) row.partners += 1;
      row.totalScore += cleanNumber(company.partnerScore, 0, 0, 100);
      row.avgScore = row.companies ? Math.round(row.totalScore / row.companies) : 0;
      sourceRows.set(source, row);
    }
  }
  const contacted = companies.filter((company) => company.outreach.peopleAttempted > 0).length;
  const responses = companies.filter((company) => company.outreach.responses > 0).length;
  const meetings = companies.filter((company) => company.outreach.meetings > 0).length;
  const candidates = companies.filter((company) => company.partnerStatus === "Partner Candidate").length;
  return {
    companiesDiscovered: companies.length,
    qualifiedAiVendors: companies.filter((company) => company.aiVendor && company.partnerScore >= 60).length,
    immediateTargets: companies.filter((company) => company.partnerPriority === "Immediate").length,
    tierATargets: companies.filter((company) => company.partnerPriority === "Tier A").length,
    peopleIdentified: people.length,
    companiesNeedingPeopleSearch: companies.filter((company) => company.partnerScore >= 60 && !company.peopleCount).length,
    peopleSearchPrepared: companies.filter((company) => !["", "Not Started"].includes(cleanString(company.peopleSearchStatus))).length,
    manualLeadListsBuilt: companies.filter((company) => company.manualLeadListUrl || /lead list built|people added|complete|done/i.test(company.peopleSearchStatus)).length,
    companiesWithSponsorEvidence: companies.filter((company) =>
      company.sponsoredEvents.length ||
      company.sponsorEvidenceUrls.length ||
      company.sponsorshipNotes ||
      company.sponsorshipEstimatedSpend
    ).length,
    companiesContacted: contacted,
    connectionRequests: people.filter((person) => person.connectionRequestedAt).length,
    connectionsAccepted: people.filter((person) => person.connectedAt).length,
    messagesSent: people.filter((person) => person.firstMessageAt || person.lastMessageAt).length,
    responses: people.filter((person) => person.respondedAt).length,
    meetings: people.filter((person) => person.meetingAt).length,
    partnerCandidates: candidates,
    researchPartners: companies.filter((company) => company.partnerStatus === "Research Partner").length,
    summitPartners: companies.filter((company) => company.partnerStatus === "Summit Partner").length,
    strategicPartners: companies.filter((company) => company.partnerStatus === "Strategic Partner").length,
    conversionRates: {
      contactedToResponse: contacted ? Math.round((responses / contacted) * 100) : 0,
      responseToMeeting: responses ? Math.round((meetings / responses) * 100) : 0,
      meetingToPartnerCandidate: meetings ? Math.round((candidates / meetings) * 100) : 0,
      candidateToPaidPartner: candidates
        ? Math.round((companies.filter((company) => ["Research Partner", "Summit Partner", "Strategic Partner"].includes(company.partnerStatus)).length / candidates) * 100)
        : 0
    },
    sourcePerformance: [...sourceRows.values()]
      .map(({ totalScore, ...row }) => row)
      .sort((a, b) => b.partners - a.partners || b.meetings - a.meetings || b.responses - a.responses || b.qualified - a.qualified || b.avgScore - a.avgScore)
  };
}

function prospectQueueSummary(companies = [], sources = []) {
  return {
    sourcesActive: sources.filter((source) => source.status !== "disabled").length,
    sourcesFailed: sources.filter((source) => source.lastRunStatus === "failed").length,
    discovered: companies.filter((company) => company.processingStatus === "DISCOVERED").length,
    needsAnalysis: companies.filter((company) => !company.lastEnriched && company.websiteUrl).length,
    failed: companies.filter((company) => company.processingStatus === "FAILED" || company.processingError).length,
    readyForOutreach: companies.filter((company) => company.processingStatus === "READY FOR OUTREACH").length,
    needsReview: companies.filter((company) => company.processingStatus === "NEEDS REVIEW").length,
    needsPeopleSearch: companies.filter((company) => company.partnerScore >= 60 && !company.peopleCount).length,
    peopleSearchPrepared: companies.filter((company) => !["", "Not Started"].includes(cleanString(company.peopleSearchStatus))).length,
    manualLeadListsBuilt: companies.filter((company) => company.manualLeadListUrl || /lead list built|people added|complete|done/i.test(company.peopleSearchStatus)).length,
    sponsorEvidenceCompanies: companies.filter((company) =>
      company.sponsoredEvents.length ||
      company.sponsorEvidenceUrls.length ||
      company.sponsorshipNotes ||
      company.sponsorshipEstimatedSpend
    ).length
  };
}

async function partnerProspectingPayload(env) {
  const scoreConfig = await partnerScoreConfig(env);
  const companies = await prospectCompanies(env);
  const people = await prospectPeople(env);
  const sources = await prospectSources(env);
  const starterSources = await starterSourcesWithRunState(env, sources);
  const emergingSources = await emergingSourcesWithRunState(env, sources);
  const debug = await prospectDebugEntries(env);
  const nextCompany = companies.find((company) =>
    company.partnerScore >= 60 &&
    !["Partner Candidate", "Research Partner", "Summit Partner", "Strategic Partner"].includes(company.partnerStatus) &&
    company.outreach.peopleAttempted < Math.max(1, company.peopleCount)
  ) || null;
  return {
    ok: true,
    type: "partner-prospecting",
    scoreConfig,
    scoreWeights: scoreConfig.weights,
    dashboard: prospectDashboard(companies, people),
    queue: prospectQueueSummary(companies, sources),
    starterSources,
    emergingSources,
    companies,
    people,
    sources,
    debug,
    nextCompany,
    nextPeople: nextCompany ? people.filter((person) => person.companyId === nextCompany.companyId) : []
  };
}

async function registrationDiagnostics(env) {
  const generatedAt = new Date().toISOString();
  const contactRows = await contacts(env);
  const contactEmails = new Set(contactRows.map((row) => row.email).filter(Boolean));
  const registrationRows = [];
  const counts = {
    contacts: contactRows.length,
    guest: 0,
    member: 0,
    partner: 0,
    missingContacts: 0,
    debugAttempts: 0,
    emailAttempts: 0
  };

  for (const type of ["guest", "member", "partner"]) {
    const rows = await registrants(env, type);
    const seenRows = new Set();
    for (const row of rows) {
      const rowIdentity = row.id || `${row.email}:${row.createdAt}:${row.inviteCode}`;
      if (seenRows.has(rowIdentity)) continue;
      seenRows.add(rowIdentity);
      const expectedContactKey = row.email ? `${registrantTypes.contacts.crmPrefix}${row.email}` : "";
      const contactExists = row.email ? contactEmails.has(row.email) : false;
      registrationRows.push({
        key: row.key,
        type,
        id: row.id,
        createdAt: row.createdAt,
        name: row.name,
        email: row.email,
        company: row.company,
        title: row.title,
        phone: row.phone,
        inviteCode: row.inviteCode,
        eventName: row.eventName,
        eventDate: row.eventDate,
        contactKey: expectedContactKey,
        contactExists
      });
    }
    counts[type] = seenRows.size;
  }

  registrationRows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const missingContacts = registrationRows.filter((row) => row.email && !row.contactExists);
  counts.missingContacts = missingContacts.length;

  const debugKeys = [
    ...(await listKeys(env, REGISTRATION_DEBUG_PREFIX)),
    ...(await listKeys(env, PHONE_VERIFICATION_DEBUG_PREFIX))
  ];
  const debugAttempts = (await Promise.all(
    debugKeys.map(async (key) => {
      const record = await readRawRecord(env, key);
      return record ? normalizeDebugEntry(key, record) : null;
    })
  ))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  counts.debugAttempts = debugAttempts.length;

  const emailKeys = await listKeys(env, EMAIL_LOG_PREFIX);
  const emailAttempts = (await Promise.all(
    emailKeys.map(async (key) => {
      const record = await readRawRecord(env, key);
      return record ? normalizeEmailLogEntry(key, record) : null;
    })
  ))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  counts.emailAttempts = emailAttempts.length;

  return {
    ok: true,
    generatedAt,
    counts,
    latestRegistrations: registrationRows.slice(0, 40),
    missingContacts: missingContacts.slice(0, 40),
    debugAttempts: debugAttempts.slice(0, 40),
    emailAttempts: emailAttempts.slice(0, 40)
  };
}

function summarize(rows) {
    return {
    total: rows.length,
    newCount: rows.filter((row) => row.crmStatus === "new").length,
    presenterCount: rows.filter((row) => row.isPresenter).length,
    roundtableLeaderCount: rows.filter((row) => row.isRoundtableLeader).length,
    pendingPhoneCount: rows.filter((row) => row.phoneVerificationStatus !== "verified").length
  };
}

function summarizeContacts(rows) {
  const eventSignupCount = rows.reduce((sum, row) => sum + (row.eventCount || 0), 0);
  const attendedEventCount = rows.reduce((sum, row) => sum + (row.attendedCount || 0), 0);
  return {
    total: rows.length,
    newCount: rows.filter((row) => row.eventCount > 0).length,
    presenterCount: eventSignupCount,
    roundtableLeaderCount: attendedEventCount,
    eventSignupCount,
    attendedEventCount,
    pendingPhoneCount: rows.filter((row) => !row.phone).length
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function crmRecordKey(row, type = "member") {
  const config = registrantTypes[cleanType(type)];
  return row.key.startsWith(config.crmPrefix)
    ? row.key
    : `${config.crmPrefix}${row.createdAt || new Date().toISOString()}:${row.id}`;
}

async function ensureCrmRecord(env, row, type = "member") {
  const config = registrantTypes[cleanType(type)];
  const key = crmRecordKey(row, type);
  if (key === row.key) return { key, row };

  const next = {
    ...row,
    crmType: config.crmType
  };
  await writeSetupJson(env, key, next);
  return { key, row: normalizeRecord(key, next) };
}

function normalizeInviteCode(key, record) {
  const name = invitePersonName(record);
  const email = invitePersonEmail(record);
  const company = cleanString(record?.company || record?.partnerCompany || record?.organization, 240);
  const title = cleanString(record?.title || record?.jobTitle || record?.roleTitle || record?.contactTitle, 240);
  const inviteType = cleanString(record?.type) || "partner";
  const isPartnerInvite = inviteType === "partner" || Boolean(record?.partnerRegistrationType || record?.partnerCompany || record?.partnerContactName || record?.partnerContactEmail);
  return {
    key,
    code: cleanCode(record?.code) || key.split(":").pop(),
    type: inviteType,
    status: cleanString(record?.status) || "active",
    eventId: cleanString(record?.eventId),
    eventSlug: cleanString(record?.eventSlug),
    eventName: cleanString(record?.eventName),
    eventDate: cleanString(record?.eventDate),
    eventTime: cleanString(record?.eventTime),
    eventAccessLink: cleanString(record?.eventAccessLink || record?.accessLink || record?.joinUrl || record?.zoomUrl || record?.zoomJoinUrl, 1000),
    accessLink: cleanString(record?.accessLink || record?.eventAccessLink || record?.joinUrl || record?.zoomUrl || record?.zoomJoinUrl, 1000),
    zoomJoinUrl: cleanString(record?.zoomJoinUrl || record?.eventAccessLink || record?.accessLink || record?.joinUrl || record?.zoomUrl, 1000),
    eventShowId: cleanEventShowId(record?.eventShowId || record?.showId || record?.eventShow, ""),
    eventShowLabel: cleanString(record?.eventShowLabel) || (record?.eventShowId ? eventShowLabel(record.eventShowId) : ""),
    eventShowTime: cleanString(record?.eventShowTime) || cleanString(record?.eventTime),
    name,
    email,
    company,
    title,
    jobTitle: title,
    intendedGuestName: name,
    intendedGuestEmail: email,
    invitedEmail: email,
    invitedName: name,
    guestName: name,
    guestRegistrationType: cleanGuestRegistrationType(record?.guestRegistrationType || record?.registrationRole),
    partnerRegistrationType: cleanOptionalRegistrationType(record?.partnerRegistrationType || record?.registrationRole),
    registrationRole: cleanGuestRegistrationType(record?.registrationRole || record?.partnerRegistrationType || record?.guestRegistrationType),
    potentialSponsor: record?.potentialSponsor === true || record?.isPotentialSponsor === true || record?.sponsorProspect === true,
    crmStatus: cleanGuestRegistrationLifecycleStatus(record?.crmStatus || record?.guestStatus || record?.registrationStatus, record?.status === "used" ? "registered" : record?.code ? "invited" : "contacted"),
    guestStatus: cleanGuestRegistrationLifecycleStatus(record?.guestStatus || record?.crmStatus || record?.registrationStatus, record?.status === "used" ? "registered" : record?.code ? "invited" : "contacted"),
    registrationStatus: cleanGuestRegistrationLifecycleStatus(record?.registrationStatus || record?.crmStatus || record?.guestStatus, record?.status === "used" ? "registered" : record?.code ? "invited" : "contacted"),
    linkedinConnectionStatus: cleanGuestMatrixOption(record?.linkedinConnectionStatus || record?.linkedInConnectionStatus || record?.connectionStatus, allowedGuestMatrixLinkedInStatuses, "unknown"),
    registrationRequestStatus: cleanGuestMatrixOption(record?.registrationRequestStatus || record?.inviteStage || record?.inviteStatus, allowedGuestMatrixRegistrationRequestStatuses, "not-sent"),
    matrixInterestRating: cleanStarRating(record?.matrixInterestRating ?? record?.participationInterestRating ?? record?.interestRating, 1),
    partnerCompany: isPartnerInvite ? cleanString(record?.partnerCompany || company) : "",
    partnerContactName: isPartnerInvite ? name : "",
    partnerContactEmail: isPartnerInvite ? email : "",
    partnerTier: cleanString(record?.partnerTier),
    invitedBy: cleanString(record?.invitedBy || record?.inviter || record?.invitedByName || record?.createdBy, 180),
    createdAt: cleanString(record?.createdAt),
    createdBy: cleanString(record?.createdBy),
    usedAt: cleanString(record?.usedAt),
    usedBy: cleanString(record?.usedBy),
    usedByName: cleanString(record?.usedByName),
    usedByEmail: cleanString(record?.usedByEmail || record?.usedBy).toLowerCase(),
    usedFor: cleanString(record?.usedFor || record?.eventName),
    usedForDate: cleanString(record?.usedForDate || record?.eventDate),
    registrationId: cleanString(record?.registrationId),
    eventNotes: cleanEventNotes(record),
    registrationNotes: cleanEventNotes(record),
    preRegistrationNotes: cleanPreRegistrationNotes(record)
  };
}

function registrationMatchesInvite(invite = {}, row = {}) {
  const inviteRegistrationId = cleanString(invite.registrationId);
  const rowRegistrationId = cleanString(row.id || row.registrationId);
  if (inviteRegistrationId && rowRegistrationId && inviteRegistrationId === rowRegistrationId) return true;

  const inviteCode = cleanCode(invite.code || invite.inviteCode);
  const rowInviteCode = cleanCode(row.inviteCode || row.code);
  if (inviteCode && rowInviteCode && inviteCode === rowInviteCode) return true;

  const inviteEmail = invitePersonEmail(invite);
  const rowEmail = invitePersonEmail(row);
  if (!inviteEmail || !rowEmail || inviteEmail !== rowEmail) return false;

  const inviteEvent = cleanString(invite.eventSlug || invite.eventName || invite.eventId || invite.eventDate).toLowerCase();
  const rowEvent = cleanString(row.eventSlug || row.eventName || row.eventId || row.eventDate).toLowerCase();
  return !inviteEvent || !rowEvent || inviteEvent === rowEvent;
}

function inviteUsageMatchesInvite(invite = {}, usage = {}) {
  const inviteCode = cleanCode(invite.code || invite.inviteCode);
  const usageCode = cleanCode(usage.code || usage.inviteCode);
  if (inviteCode && usageCode && inviteCode === usageCode) return true;

  const inviteRegistrationId = cleanString(invite.registrationId);
  const usageRegistrationId = cleanString(usage.registrationId);
  return Boolean(inviteRegistrationId && usageRegistrationId && inviteRegistrationId === usageRegistrationId);
}

async function enrichInviteUsage(env, invites, types = ["member", "guest", "partner"]) {
  const rows = (await Promise.all(types.map((type) => registrants(env, type)))).flat();
  const usageRows = (await Promise.all(types.map((type) => r2InviteUsages(env, type)))).flat();
  return invites.map((invite) => {
    const row = rows.find((entry) => registrationMatchesInvite(invite, entry));
    const usage = usageRows.find((entry) => inviteUsageMatchesInvite(invite, entry));
    const inviteAlreadyUsed = cleanString(invite.status).toLowerCase() === "used" &&
      Boolean(invite.usedAt || invite.registrationId || invite.usedByName || invite.usedByEmail || invite.usedBy);
    const registered = Boolean(row || usage || inviteAlreadyUsed);
    const currentStatus = cleanGuestRegistrationLifecycleStatus(
      row?.crmStatus || usage?.registrationStatus || invite.crmStatus || invite.guestStatus || invite.registrationStatus,
      invite.code ? "invited" : "contacted"
    );
    const registrationStatus = registered
      ? ["scott-engagement", "pending-engagement", "contacted", "confirmed", "invited"].includes(currentStatus) ? "registered" : currentStatus
      : currentStatus === "registered" || currentStatus === "attended" ? invite.code ? "invited" : "contacted" : currentStatus;
    return {
      ...invite,
      status: registered ? "used" : invite.status,
      crmStatus: registrationStatus,
      guestStatus: registrationStatus,
      registrationStatus,
      actualRegistrationRegistered: registered,
      registrationMatched: registered,
      potentialSponsor: invite.potentialSponsor === true || row?.potentialSponsor === true || row?.isPotentialSponsor === true || row?.sponsorProspect === true,
      guestRegistrationType: row?.guestRegistrationType || invite.guestRegistrationType,
      partnerRegistrationType: row?.partnerRegistrationType || invite.partnerRegistrationType,
      registrationRole: row?.registrationRole || row?.partnerRegistrationType || row?.guestRegistrationType || invite.registrationRole || invite.partnerRegistrationType || invite.guestRegistrationType,
      eventNotes: cleanEventNotes(row) || (row ? cleanString(row.crmNotes, 4000) : "") || cleanEventNotes(invite),
      registrationNotes: cleanEventNotes(row) || (row ? cleanString(row.crmNotes, 4000) : "") || cleanEventNotes(invite),
      preRegistrationNotes: cleanPreRegistrationNotes(invite),
      usedAt: cleanString(invite.usedAt || usage?.usedAt || row?.createdAt),
      usedByName: cleanString(row?.name || usage?.usedByName || invite.usedByName),
      usedByEmail: cleanString(row?.email || usage?.usedByEmail || invite.usedByEmail || invite.usedBy).toLowerCase(),
      usedBy: cleanString(row?.name || row?.email || usage?.usedBy || usage?.usedByEmail || invite.usedBy),
      registrationId: cleanString(row?.id || usage?.registrationId || invite.registrationId),
      usedFor: cleanString(row?.eventName || usage?.eventName || invite.usedFor || invite.eventName),
      usedForDate: cleanString(row?.eventDate || usage?.eventDate || invite.usedForDate || invite.eventDate),
      usedForShow: cleanString(row?.eventShowLabel || usage?.eventShowLabel || invite.usedForShow || invite.eventShowLabel),
      usedForTime: cleanString(row?.eventShowTime || row?.eventTime || usage?.eventShowTime || usage?.eventTime || invite.usedForTime || invite.eventShowTime || invite.eventTime)
    };
  });
}

async function partnerInviteCodes(env) {
  const keys = await listKeys(env, PARTNER_INVITE_PREFIX);
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? normalizeInviteCode(key, record) : null;
    })
  );
  const invites = rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return enrichInviteUsage(env, invites, ["partner"]);
}

async function partnerRegistrationLinkRows(env) {
  const invites = await partnerInviteCodes(env);
  const registrations = (await registrants(env, "partner"))
    .filter((row) => row.manualPartner !== true && cleanString(row.inviteCode));
  const registrationsByCode = new Map();
  registrations.forEach((row) => {
    const code = cleanCode(row.inviteCode);
    if (code && !registrationsByCode.has(code)) registrationsByCode.set(code, row);
  });

  return invites.map((invite) => {
    const registration = registrationsByCode.get(cleanCode(invite.code));
    const registered = Boolean(registration || invite.usedAt || invite.usedBy || invite.usedByEmail);
    const crmStatus = cleanAllowed(
      registration?.crmStatus || invite.crmStatus,
      allowedStatuses,
      registered ? "registered" : "invited"
    );
    return normalizeRecord(registration?.key || invite.key, {
      ...(registration || {}),
      id: registration?.id || invite.registrationId || invite.code,
      type: "partner",
      crmType: "partner-registration-link",
      source: registration ? cleanString(registration.source) || "partner-registration" : "partner-invite",
      createdAt: registration?.createdAt || invite.createdAt,
      updatedAt: registration?.updatedAt || invite.updatedAt || invite.createdAt,
      name: registration?.name || invite.usedByName || invite.partnerContactName || invite.partnerContactEmail || "Name not recorded",
      company: registration?.company || registration?.partnerCompany || invite.partnerCompany,
      partnerCompany: registration?.partnerCompany || registration?.company || invite.partnerCompany,
      title: registration?.title,
      email: registration?.email || invite.usedByEmail || invite.partnerContactEmail,
      phone: registration?.phone,
      inviteCode: invite.code,
      invitedBy: registration?.invitedBy || invite.invitedBy || invite.createdBy,
      phoneVerificationStatus: registration?.phoneVerificationStatus || (registered ? "verified" : "unverified"),
      eventId: registration?.eventId || invite.eventId,
      eventSlug: registration?.eventSlug || invite.eventSlug,
      eventName: registration?.eventName || invite.usedFor || invite.eventName,
      eventDate: registration?.eventDate || invite.usedForDate || invite.eventDate,
      eventTime: registration?.eventTime || invite.usedForTime || invite.eventTime,
      eventShowId: registration?.eventShowId || invite.eventShowId,
      eventShowLabel: registration?.eventShowLabel || invite.usedForShow || invite.eventShowLabel,
      eventShowTime: registration?.eventShowTime || invite.usedForTime || invite.eventShowTime,
      partnerRegistrationType: registration?.partnerRegistrationType || invite.partnerRegistrationType || invite.registrationRole,
      registrationRole: registration?.registrationRole || invite.partnerRegistrationType || invite.registrationRole || "partner-candidate",
      partnerTier: registration?.partnerTier || invite.partnerTier,
      partnerProductTypes: registration?.partnerProductTypes,
      partnerClientMessaging: registration?.partnerClientMessaging,
      partnerLinkedInPromotionText: registration?.partnerLinkedInPromotionText,
      attended: registration?.attended === true,
      attendanceStatus: registration?.attendanceStatus,
      crmStatus,
      crmNotes: registration?.crmNotes || invite.crmNotes,
      crmUpdatedAt: registration?.crmUpdatedAt || invite.crmUpdatedAt,
      crmUpdatedBy: registration?.crmUpdatedBy || invite.crmUpdatedBy
    });
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function registrationInviteCodes(env) {
  const entries = await Promise.all(
    Object.entries(REGISTRATION_INVITE_PREFIXES).map(async ([type, prefix]) => {
      const keys = await listKeys(env, prefix);
      return Promise.all(
        keys.map(async (key) => {
          const record = await readSetupJson(env, key);
          return record ? normalizeInviteCode(key, { ...record, type: record.type || type }) : null;
        })
      );
    })
  );
  const invites = entries.flat().filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return enrichInviteUsage(env, invites, ["member", "guest"]);
}

function matrixProspectPrefix(type = "guest") {
  return type === "partner" ? PARTNER_MATRIX_PROSPECT_PREFIX : GUEST_MATRIX_PROSPECT_PREFIX;
}

function matrixProspectRecordType(type = "guest") {
  return type === "partner" ? "partner-matrix-prospect" : "guest-matrix-prospect";
}

function matrixProspectRole(type = "guest", record = {}) {
  const fallback = type === "partner" ? "partner-candidate" : "guest";
  return cleanGuestRegistrationType(record?.partnerRegistrationType || record?.guestRegistrationType || record?.registrationRole || fallback);
}

function normalizeGuestMatrixProspect(key, record = {}, type = "guest") {
  const prospectType = type === "partner" ? "partner" : "guest";
  const rawGuestName = cleanString(
    record?.intendedGuestName || record?.invitedName || record?.guestName || record?.partnerContactName || record?.name,
    240
  );
  const rawGuestEmail = cleanString(
    record?.intendedGuestEmail || record?.invitedEmail || record?.guestEmail || record?.partnerContactEmail || record?.email,
    240
  ).toLowerCase();
  const intendedGuestEmail = isEmail(rawGuestEmail)
    ? rawGuestEmail
    : isEmail(rawGuestName)
      ? rawGuestName.toLowerCase()
      : "";
  const intendedGuestName = isEmail(rawGuestName) ? "" : rawGuestName;
  const guestRegistrationType = matrixProspectRole(prospectType, record);
  const linkedinProfileUrl = cleanLinkedInProfileUrl(record?.linkedinProfileUrl || record?.linkedInProfileUrl || record?.linkedinUrl || record?.linkedInUrl);
  const company = cleanString(record?.company || record?.partnerCompany || record?.organization, 240);
  const title = cleanString(record?.title || record?.jobTitle || record?.roleTitle || record?.contactTitle, 240);
  const hasAssignedEvent = Boolean(cleanString(record?.eventSlug || record?.eventName || record?.eventId, 240));
  const rawShowId = hasAssignedEvent ? cleanEventShowId(record?.eventShowId || record?.showId || record?.eventShow, "both") : "";
  const eventShowId = requiresSingleShowRegistrationRole(guestRegistrationType) && rawShowId === "both" ? "morning" : rawShowId;
  return {
    key,
    id: cleanString(record?.id, 200) || key,
    type: matrixProspectRecordType(prospectType),
    matrixOnly: true,
    status: cleanString(record?.status, 80) || "tracking",
    eventId: cleanString(record?.eventId || (hasAssignedEvent ? `${record?.eventSlug || record?.eventName || "event"}:${eventShowId || "both"}` : ""), 200),
    eventSlug: cleanString(record?.eventSlug, 200),
    eventName: cleanString(record?.eventName, 240),
    eventDate: cleanString(record?.eventDate, 120),
    eventTime: cleanString(record?.eventTime || (eventShowId ? eventShowTime(eventShowId) : ""), 120),
    eventShowId,
    eventShowLabel: cleanString(record?.eventShowLabel, 120) || (eventShowId ? eventShowLabel(eventShowId) : ""),
    eventShowTime: cleanString(record?.eventShowTime || record?.eventTime, 120) || (eventShowId ? eventShowTime(eventShowId) : ""),
    name: intendedGuestName,
    email: intendedGuestEmail,
    intendedGuestName,
    intendedGuestEmail,
    invitedEmail: intendedGuestEmail,
    invitedName: intendedGuestName,
    guestEmail: intendedGuestEmail,
    guestName: intendedGuestName,
    partnerContactEmail: prospectType === "partner" ? intendedGuestEmail : "",
    partnerContactName: prospectType === "partner" ? intendedGuestName : "",
    partnerCompany: prospectType === "partner" ? company : "",
    company,
    title,
    jobTitle: title,
    linkedinProfileUrl,
    linkedinUrl: linkedinProfileUrl,
    enrichmentSource: cleanString(record?.enrichmentSource, 120),
    crmStatus: cleanGuestRegistrationLifecycleStatus(record?.crmStatus || record?.partnerStatus || record?.guestStatus || record?.registrationStatus, "pending-engagement"),
    guestStatus: cleanGuestRegistrationLifecycleStatus(record?.guestStatus || record?.partnerStatus || record?.crmStatus || record?.registrationStatus, "pending-engagement"),
    partnerStatus: prospectType === "partner" ? cleanGuestRegistrationLifecycleStatus(record?.partnerStatus || record?.crmStatus || record?.registrationStatus || record?.guestStatus, "pending-engagement") : "",
    registrationStatus: cleanGuestRegistrationLifecycleStatus(record?.registrationStatus || record?.crmStatus || record?.partnerStatus || record?.guestStatus, "pending-engagement"),
    matrixInterestRating: cleanStarRating(record?.matrixInterestRating ?? record?.participationInterestRating ?? record?.interestRating, 1),
    potentialSponsor: prospectType === "guest" && (record?.potentialSponsor === true || record?.isPotentialSponsor === true || record?.sponsorProspect === true),
    preRegistrationNotes: cleanPreRegistrationNotes(record),
    guestRegistrationType,
    partnerRegistrationType: prospectType === "partner" ? guestRegistrationType : "",
    registrationRole: guestRegistrationType,
    invitedBy: cleanString(record?.invitedBy || record?.inviter || record?.invitedByName || record?.createdBy, 180),
    linkedinConnectionStatus: cleanGuestMatrixOption(record?.linkedinConnectionStatus || record?.linkedInConnectionStatus || record?.connectionStatus, allowedGuestMatrixLinkedInStatuses, "unknown"),
    registrationRequestStatus: cleanGuestMatrixOption(record?.registrationRequestStatus || record?.inviteStage || record?.inviteStatus, allowedGuestMatrixRegistrationRequestStatuses, "not-sent"),
    createdAt: cleanString(record?.createdAt),
    createdBy: cleanString(record?.createdBy),
    updatedAt: cleanString(record?.updatedAt),
    updatedBy: cleanString(record?.updatedBy)
  };
}

function manualPartnerMatrixProspectKey(row = {}) {
  const identity = cleanString(row.id || row.email || row.name || row.key, 240);
  return `${PARTNER_MATRIX_PROSPECT_PREFIX}manual-partner:${safeFileSegment(identity, "partner")}`;
}

function manualPartnerMatchesMatrixProspect(row = {}, prospect = {}) {
  const email = cleanString(row.email).toLowerCase();
  const prospectEmail = cleanString(prospect.partnerContactEmail || prospect.intendedGuestEmail || prospect.email).toLowerCase();
  if (email && prospectEmail && email === prospectEmail) return true;

  const linkedin = cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl);
  const prospectLinkedin = cleanLinkedInProfileUrl(prospect.linkedinProfileUrl || prospect.linkedInProfileUrl || prospect.linkedinUrl || prospect.linkedInUrl);
  if (linkedin && prospectLinkedin && linkedin === prospectLinkedin) return true;

  const nameKey = guestMatrixMergeNameKey(row.name);
  const prospectNameKey = guestMatrixMergeNameKey(prospect.partnerContactName || prospect.intendedGuestName || prospect.name);
  const company = cleanString(row.partnerCompany || row.company).toLowerCase();
  const prospectCompany = cleanString(prospect.partnerCompany || prospect.company).toLowerCase();
  return nameKey.length >= 6 && nameKey === prospectNameKey && (!company || !prospectCompany || company === prospectCompany);
}

async function upsertManualPartnerMatrixProspect(env, row = {}, actor = "crm") {
  const key = manualPartnerMatrixProspectKey(row);
  const existing = await readSetupJson(env, key).catch(() => null);
  const now = new Date().toISOString();
  const status = cleanGuestRegistrationLifecycleStatus(
    row.registrationStatus || row.partnerStatus || row.crmStatus || existing?.registrationStatus || existing?.partnerStatus,
    "pending-engagement"
  );
  const registrationRole = cleanGuestRegistrationType(row.partnerRegistrationType || row.registrationRole || existing?.partnerRegistrationType || "partner-candidate");
  const next = {
    ...(existing || {}),
    id: cleanString(existing?.id || row.id, 200) || key,
    source: "manual-partner",
    manualPartnerSourceKey: cleanString(row.key, 500),
    intendedGuestName: cleanString(row.name, 240),
    intendedGuestEmail: cleanString(row.email, 240).toLowerCase(),
    partnerContactName: cleanString(row.name, 240),
    partnerContactEmail: cleanString(row.email, 240).toLowerCase(),
    partnerCompany: cleanString(row.partnerCompany || row.company, 240),
    company: cleanString(row.company || row.partnerCompany, 240),
    title: cleanString(row.title, 240),
    phone: cleanString(row.phone, 80),
    linkedinProfileUrl: cleanLinkedInProfileUrl(row.linkedinProfileUrl || row.linkedInProfileUrl || row.linkedinUrl || row.linkedInUrl),
    crmStatus: status,
    guestStatus: status,
    partnerStatus: status,
    registrationStatus: status,
    preRegistrationNotes: cleanString(row.preRegistrationNotes || row.matrixNotes || row.engagementNotes || row.crmNotes || existing?.preRegistrationNotes, 4000),
    matrixInterestRating: cleanStarRating(row.matrixInterestRating ?? existing?.matrixInterestRating, 1),
    partnerRegistrationType: registrationRole,
    registrationRole,
    invitedBy: cleanString(row.invitedBy || row.inviter || row.invitedByName || row.createdBy || existing?.invitedBy, 180),
    createdAt: cleanString(existing?.createdAt || row.createdAt) || now,
    createdBy: cleanString(existing?.createdBy || row.createdBy || actor),
    updatedAt: now,
    updatedBy: actor
  };
  await writeSetupJson(env, key, next);
  const prospect = normalizeGuestMatrixProspect(key, next, "partner");
  await upsertContactFromInviteRecord(env, prospect, "partner-matrix-prospect", actor, {
    preferIncomingCompany: Boolean(prospect.company || prospect.partnerCompany)
  });
  return prospect;
}

function guestMatrixMergeNameKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b(dr|doctor|phd|ph\.d|m\.d|md|mba|ms|ma|cpa|esq)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function findGuestMatrixProspectForInvite(env, invite = {}) {
  const targetEmail = invitePersonEmail(invite);
  const targetLinkedIn = cleanLinkedInProfileUrl(invite.linkedinProfileUrl || invite.linkedInProfileUrl || invite.linkedinUrl || invite.linkedInUrl);
  const targetNameKey = guestMatrixMergeNameKey(invitePersonName(invite));
  if (!targetEmail && !targetLinkedIn && targetNameKey.length < 6) return null;

  const keys = await listKeys(env, GUEST_MATRIX_PROSPECT_PREFIX);
  for (const key of keys) {
    const record = await readSetupJson(env, key);
    if (!record) continue;
    const prospect = normalizeGuestMatrixProspect(key, record, "guest");
    const prospectEmail = invitePersonEmail(prospect);
    const prospectLinkedIn = cleanLinkedInProfileUrl(prospect.linkedinProfileUrl || prospect.linkedinUrl);
    const prospectNameKey = guestMatrixMergeNameKey(invitePersonName(prospect));
    if (targetEmail && prospectEmail && targetEmail === prospectEmail) return { key, prospect };
    if (targetLinkedIn && prospectLinkedIn && targetLinkedIn === prospectLinkedIn) return { key, prospect };
    if (targetNameKey.length >= 6 && prospectNameKey.length >= 6 && targetNameKey === prospectNameKey) return { key, prospect };
  }

  return null;
}

async function guestMatrixProspects(env) {
  const keys = await listKeys(env, GUEST_MATRIX_PROSPECT_PREFIX);
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? normalizeGuestMatrixProspect(key, record, "guest") : null;
    })
  );
  return rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function guestRegistrationRowFromMatrixProspect(prospect = {}) {
  const row = normalizeRecord(prospect.key, {
    ...prospect,
    id: prospect.id || prospect.key,
    name: prospect.intendedGuestName || prospect.guestName || prospect.invitedName || prospect.intendedGuestEmail || "Name not recorded",
    email: prospect.intendedGuestEmail || prospect.guestEmail || prospect.invitedEmail,
    source: "guest-matrix-prospect",
    crmStatus: prospect.crmStatus || prospect.guestStatus || prospect.registrationStatus || "pending-engagement",
    guestStatus: prospect.guestStatus || prospect.crmStatus || prospect.registrationStatus || "pending-engagement",
    registrationStatus: prospect.registrationStatus || prospect.crmStatus || prospect.guestStatus || "pending-engagement",
    crmNotes: prospect.preRegistrationNotes,
    eventNotes: prospect.preRegistrationNotes,
    registrationNotes: prospect.preRegistrationNotes,
    phoneVerificationStatus: "unverified"
  });
  return {
    ...row,
    guestStatus: prospect.guestStatus || row.crmStatus,
    registrationStatus: prospect.registrationStatus || row.crmStatus,
    matrixOnly: true
  };
}

function guestRegistrationRowIdentity(row = {}) {
  const person = cleanString(
    row.email ||
      row.intendedGuestEmail ||
      row.invitedEmail ||
      row.guestEmail ||
      row.linkedinProfileUrl ||
      row.name ||
      row.id ||
      row.key
  ).toLowerCase();
  const event = cleanString(row.eventSlug || row.eventName || row.eventId || "no-event").toLowerCase();
  const show = cleanEventShowId(row.eventShowId || row.showId || row.eventShow, "");
  return `${person}|${event}|${show}`;
}

async function guestRegistrationRows(env) {
  const registrationRows = await registrants(env, "guest");
  const seen = new Set(registrationRows.map(guestRegistrationRowIdentity));
  const prospectRows = (await guestMatrixProspects(env))
    .map(guestRegistrationRowFromMatrixProspect)
    .filter((row) => {
      const identity = guestRegistrationRowIdentity(row);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  return [...registrationRows, ...prospectRows]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function partnerMatrixProspects(env) {
  const keys = await listKeys(env, PARTNER_MATRIX_PROSPECT_PREFIX);
  const rows = await Promise.all(
    keys.map(async (key) => {
      const record = await readSetupJson(env, key);
      return record ? normalizeGuestMatrixProspect(key, record, "partner") : null;
    })
  );
  return rows.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function matrixPersonEnrichmentFromRecord(record = {}, linkedinProfileUrl = "", extra = {}) {
  const name = cleanString(
    record.name ||
      record.fullName ||
      record.intendedGuestName ||
      record.invitedName ||
      record.guestName ||
      record.partnerContactName,
    240
  );
  return {
    intendedGuestName: name,
    intendedGuestEmail: cleanString(
      record.email ||
        record.intendedGuestEmail ||
        record.invitedEmail ||
        record.guestEmail ||
        record.partnerContactEmail,
      240
    ).toLowerCase(),
    company: cleanString(record.company || record.organization || record.partnerCompany || extra.company, 240),
    title: cleanString(record.title || record.jobTitle || record.roleTitle, 240),
    linkedinProfileUrl,
    enrichmentSource: cleanString(extra.source || record.source || "crm-linkedin-match", 120)
  };
}

function mergeMatrixPersonEnrichment(fallback = {}, found = {}) {
  return {
    ...fallback,
    ...found,
    intendedGuestName: cleanString(found.intendedGuestName, 240) || cleanString(fallback.intendedGuestName, 240),
    intendedGuestEmail: cleanString(found.intendedGuestEmail, 240).toLowerCase() || cleanString(fallback.intendedGuestEmail, 240).toLowerCase(),
    company: cleanString(found.company, 240) || cleanString(fallback.company, 240),
    title: cleanString(found.title, 240) || cleanString(fallback.title, 240),
    linkedinProfileUrl: cleanLinkedInProfileUrl(found.linkedinProfileUrl || fallback.linkedinProfileUrl),
    enrichmentSource: cleanString(found.enrichmentSource || fallback.enrichmentSource, 120)
  };
}

async function enrichMatrixPersonFromLinkedIn(env, rawLinkedInProfileUrl = "") {
  const linkedinProfileUrl = cleanLinkedInProfileUrl(rawLinkedInProfileUrl);
  if (!linkedinProfileUrl) return {};
  const identity = linkedInProfileIdentity(linkedinProfileUrl);
  const fallback = {
    intendedGuestName: nameFromLinkedInProfileUrl(linkedinProfileUrl),
    linkedinProfileUrl,
    enrichmentSource: "linkedin-profile-slug"
  };
  const profileMatches = (record = {}) => {
    const values = [
      record.linkedinProfileUrl,
      record.linkedInProfileUrl,
      record.linkedinUrl,
      record.linkedInUrl
    ];
    return values.some((value) => linkedInProfileIdentity(value) === identity);
  };
  const prefixes = [
    registrantTypes.contacts.crmPrefix,
    registrantTypes.guest.crmPrefix,
    registrantTypes.guest.legacyPrefix,
    registrantTypes.member.crmPrefix,
    registrantTypes.member.legacyPrefix,
    registrantTypes.partner.crmPrefix,
    registrantTypes.partner.legacyPrefix,
    GUEST_MATRIX_PROSPECT_PREFIX,
    PARTNER_MATRIX_PROSPECT_PREFIX,
    PARTNER_PROSPECT_PERSON_PREFIX
  ];
  const keys = [...new Set((await Promise.all(prefixes.map((prefix) => listKeys(env, prefix).catch(() => [])))).flat())];
  for (const key of keys) {
    const record = await readRawRecord(env, key);
    if (!record) continue;
    if (profileMatches(record)) {
      let extra = { source: "crm-linkedin-match" };
      if (key.startsWith(PARTNER_PROSPECT_PERSON_PREFIX) && record.companyId) {
        const company = await readRawRecord(env, `${PARTNER_PROSPECT_COMPANY_PREFIX}${cleanString(record.companyId, 180)}`);
        extra = { ...extra, company: company?.companyName || company?.company || company?.name };
      }
      return mergeMatrixPersonEnrichment(fallback, matrixPersonEnrichmentFromRecord(record, linkedinProfileUrl, extra));
    }
    const event = Array.isArray(record.events) ? record.events.find(profileMatches) : null;
    if (event) {
      return mergeMatrixPersonEnrichment(
        fallback,
        matrixPersonEnrichmentFromRecord({ ...record, ...event }, linkedinProfileUrl, { source: "crm-contact-event-linkedin-match" })
      );
    }
  }
  return fallback;
}

async function createGuestMatrixProspect(env, payload = {}, actor = "", type = "guest") {
  const prospectType = type === "partner" ? "partner" : "guest";
  const eventSlug = cleanString(payload.eventSlug, 200);
  const eventName = cleanString(payload.eventName, 240);
  const hasAssignedEvent = Boolean(eventSlug || eventName || cleanString(payload.eventId, 200));

  const rawLinkedInProfileUrl = cleanString(payload.linkedinProfileUrl || payload.linkedInProfileUrl || payload.linkedinUrl || payload.linkedInUrl, 500);
  const linkedinProfileUrl = cleanLinkedInProfileUrl(rawLinkedInProfileUrl);
  if (rawLinkedInProfileUrl && !linkedinProfileUrl) throw new Error("Enter a valid LinkedIn profile URL.");
  const enrichment = linkedinProfileUrl ? await enrichMatrixPersonFromLinkedIn(env, linkedinProfileUrl) : {};
  const rawGuestName = cleanString(
    payload.intendedGuestName ||
      payload.invitedName ||
      payload.guestName ||
      payload.partnerContactName ||
      payload.name ||
      enrichment.intendedGuestName,
    240
  );
  const rawGuestEmail = cleanString(
    payload.intendedGuestEmail ||
      payload.invitedEmail ||
      payload.guestEmail ||
      payload.partnerContactEmail ||
      payload.email ||
      enrichment.intendedGuestEmail,
    240
  ).toLowerCase();
  const intendedGuestEmail = isEmail(rawGuestEmail)
    ? rawGuestEmail
    : isEmail(rawGuestName)
      ? rawGuestName.toLowerCase()
      : "";
  const intendedGuestName = isEmail(rawGuestName) ? "" : rawGuestName;
  if (!intendedGuestName && !intendedGuestEmail && !linkedinProfileUrl) throw new Error("Enter a name, email, or LinkedIn profile before adding a tracked person.");

  const guestRegistrationType = matrixProspectRole(prospectType, payload);
  const rawShowId = hasAssignedEvent ? cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, "both") : "";
  const eventShowId = requiresSingleShowRegistrationRole(guestRegistrationType) && rawShowId === "both" ? "morning" : rawShowId;
  const eventTime = eventShowId ? eventShowTime(eventShowId) : "";
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID?.() || `${Date.now()}-${randomInviteCode()}`;
  const record = {
    id,
    type: matrixProspectRecordType(prospectType),
    matrixOnly: true,
    status: "tracking",
    eventId: cleanString(payload.eventId || (hasAssignedEvent ? `${eventSlug || eventName}:${eventShowId || "both"}` : ""), 200),
    eventSlug,
    eventName,
    eventDate: cleanString(payload.eventDate, 120),
    eventTime,
    eventShowId,
    eventShowLabel: eventShowId ? eventShowLabel(eventShowId) : "",
    eventShowTime: eventTime,
    name: intendedGuestName,
    email: intendedGuestEmail,
    intendedGuestName,
    intendedGuestEmail,
    invitedEmail: intendedGuestEmail,
    guestEmail: intendedGuestEmail,
    invitedName: intendedGuestName,
    guestName: intendedGuestName,
    partnerContactEmail: prospectType === "partner" ? intendedGuestEmail : "",
    partnerContactName: prospectType === "partner" ? intendedGuestName : "",
    partnerCompany: prospectType === "partner" ? cleanString(payload.partnerCompany || payload.company || enrichment.company, 240) : "",
    company: cleanString(payload.company || payload.partnerCompany || enrichment.company, 240),
    title: cleanString(payload.title || payload.jobTitle || enrichment.title, 240),
    jobTitle: cleanString(payload.jobTitle || payload.title || enrichment.title, 240),
    linkedinProfileUrl,
    linkedinUrl: linkedinProfileUrl,
    enrichmentSource: cleanString(enrichment.enrichmentSource || (linkedinProfileUrl ? "linkedin-profile-url" : ""), 120),
    crmStatus: cleanGuestRegistrationLifecycleStatus(payload.crmStatus || payload.partnerStatus || payload.guestStatus || payload.registrationStatus, "pending-engagement"),
    guestStatus: cleanGuestRegistrationLifecycleStatus(payload.guestStatus || payload.partnerStatus || payload.crmStatus || payload.registrationStatus, "pending-engagement"),
    partnerStatus: prospectType === "partner" ? cleanGuestRegistrationLifecycleStatus(payload.partnerStatus || payload.crmStatus || payload.registrationStatus || payload.guestStatus, "pending-engagement") : "",
    registrationStatus: cleanGuestRegistrationLifecycleStatus(payload.registrationStatus || payload.partnerStatus || payload.guestStatus || payload.crmStatus, "pending-engagement"),
    guestRegistrationType,
    partnerRegistrationType: prospectType === "partner" ? guestRegistrationType : "",
    registrationRole: guestRegistrationType,
    potentialSponsor: prospectType === "guest" && (payload.potentialSponsor === true || payload.isPotentialSponsor === true || payload.sponsorProspect === true),
    invitedBy: cleanString(payload.invitedBy || payload.inviter || payload.invitedByName || actor, 180),
    linkedinConnectionStatus: cleanGuestMatrixOption(payload.linkedinConnectionStatus || payload.connectionStatus, allowedGuestMatrixLinkedInStatuses, "unknown"),
    registrationRequestStatus: cleanGuestMatrixOption(payload.registrationRequestStatus || payload.inviteStage || payload.inviteStatus, allowedGuestMatrixRegistrationRequestStatuses, "not-sent"),
    matrixInterestRating: cleanStarRating(payload.matrixInterestRating ?? payload.participationInterestRating ?? payload.interestRating, 1),
    preRegistrationNotes: cleanPreRegistrationNotes(payload),
    createdAt,
    createdBy: actor,
    updatedAt: createdAt,
    updatedBy: actor
  };
  const identityId = linkedInProfileIdentity(linkedinProfileUrl)
    ? `linkedin:${safeFileSegment(linkedInProfileIdentity(linkedinProfileUrl), "profile")}`
    : id;
  const eventSegment = safeFileSegment(hasAssignedEvent ? `${eventSlug || eventName}:${eventShowId || "both"}` : "unassigned", "unassigned");
  const key = `${matrixProspectPrefix(prospectType)}${eventSegment}:${identityId}`;
  const previous = await readRawRecord(env, key);
  const nextRecord = {
    ...(previous || {}),
    ...record,
    id: cleanString(previous?.id, 200) || record.id,
    linkedinConnectionStatus: cleanString(previous?.linkedinConnectionStatus) || record.linkedinConnectionStatus,
    registrationRequestStatus: cleanString(previous?.registrationRequestStatus) || record.registrationRequestStatus,
    createdAt: cleanString(previous?.createdAt) || record.createdAt,
    createdBy: cleanString(previous?.createdBy) || record.createdBy,
    updatedAt: createdAt,
    updatedBy: actor
  };
  await writeSetupJson(env, key, nextRecord);
  const prospect = normalizeGuestMatrixProspect(key, nextRecord, prospectType);
  await upsertContactFromInviteRecord(env, prospect, `${prospectType}-matrix-prospect`, actor, {
    preferIncomingCompany: Boolean(prospect.company || prospect.partnerCompany)
  });
  return prospect;
}

async function updateGuestMatrixProspect(env, payload = {}, actor = "") {
  const key = cleanString(payload.key, 500);
  const prospectType = key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX) ? "partner" : "guest";
  if (!key || (!key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX) && !key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX))) throw new Error("Tracked person was not found.");
  const existing = await readSetupJson(env, key);
  if (!existing) throw new Error("Tracked person was not found.");
  const field = cleanString(payload.field, 80);
  const hasCompanyChange = field === "company" || field === "partnerCompany";
  const next = { ...existing };
  if (field === "linkedinConnection") {
    next.linkedinConnectionStatus = cleanGuestMatrixOption(payload.value, allowedGuestMatrixLinkedInStatuses, existing.linkedinConnectionStatus || "unknown");
  } else if (field === "registrationRequest") {
    next.registrationRequestStatus = cleanGuestMatrixOption(payload.value, allowedGuestMatrixRegistrationRequestStatuses, existing.registrationRequestStatus || "not-sent");
  } else if (field === "guestStatus" || field === "partnerStatus") {
    const status = cleanGuestRegistrationLifecycleStatus(payload.value, existing.crmStatus || existing.partnerStatus || existing.guestStatus || "pending-engagement");
    next.crmStatus = status;
    next.guestStatus = status;
    if (prospectType === "partner") next.partnerStatus = status;
    next.registrationStatus = status;
  } else if (field === "matrixInterestRating") {
    next.matrixInterestRating = cleanStarRating(payload.value, existing.matrixInterestRating || 1);
  } else if (field === "potentialSponsor") {
    next.potentialSponsor = prospectType === "guest" && payload.value === true;
  } else if (field === "registrationRole") {
    Object.assign(next, registrationRoleUpdate(payload.value, prospectType, existing));
  } else if (field === "company" || field === "partnerCompany") {
    const company = cleanString(payload.value, 240);
    next.company = company;
    if (prospectType === "partner") next.partnerCompany = company;
  } else if (field === "preRegistrationNotes" || field === "eventNotes") {
    next.preRegistrationNotes = cleanString(payload.value, 4000);
  } else {
    throw new Error("Unsupported tracked person field.");
  }
  next.updatedAt = new Date().toISOString();
  next.updatedBy = actor;
  await writeSetupJson(env, key, next);
  const prospect = normalizeGuestMatrixProspect(key, next, prospectType);
  await upsertContactFromInviteRecord(env, prospect, `${prospectType}-matrix-prospect`, actor, {
    preferIncomingCompany: hasCompanyChange
  });
  return prospect;
}

async function deleteGuestMatrixProspect(env, payload = {}) {
  const key = cleanString(payload.key, 500);
  const isPartnerProspect = key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX);
  if (!key || (!key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX) && !isPartnerProspect)) throw new Error("Tracked person was not found.");
  const existing = await readSetupJson(env, key);
  if (!existing) throw new Error("Tracked person was not found.");
  await deleteSetupRecord(env, key);
  return normalizeGuestMatrixProspect(key, existing, isPartnerProspect ? "partner" : "guest");
}

async function updateRegistrantEventNotesForMatrixChange(env, record = {}, noteValue = "", actor = "", now = new Date().toISOString()) {
  const note = cleanString(noteValue, 4000);
  const inviteCode = cleanCode(record.code || record.inviteCode);
  const registrationId = cleanString(record.registrationId);
  const email = invitePersonEmail(record);
  const typeCandidates = record.type === "partner" || record.partnerContactEmail
    ? ["partner"]
    : ["guest", "member"];

  for (const type of typeCandidates) {
    const rows = await registrants(env, type);
    const row = rows.find((entry) =>
      (registrationId && (entry.key === registrationId || entry.id === registrationId)) ||
      (inviteCode && cleanCode(entry.inviteCode) === inviteCode && (!email || cleanString(entry.email).toLowerCase() === email))
    );
    if (!row) continue;
    const { key, row: crmRow } = await ensureCrmRecord(env, row, type);
    await writeSetupJson(env, key, {
      ...crmRow,
      key: undefined,
      crmType: registrantTypes[type].crmType,
      eventNotes: note,
      registrationNotes: note,
      crmUpdatedAt: now,
      crmUpdatedBy: actor
    });
    return true;
  }

  return false;
}

function registrationRoleUpdate(roleValue = "", type = "guest", existing = {}) {
  const role = cleanContactEventRole(roleValue);
  const partnerRole = role.includes("partner") ? role : cleanOptionalRegistrationType(existing.partnerRegistrationType);
  return {
    registrationRole: role,
    guestRegistrationType: type === "partner" ? cleanOptionalRegistrationType(existing.guestRegistrationType) : cleanGuestRegistrationType(role),
    partnerRegistrationType: type === "partner" ? role : partnerRole,
    role: contactEventRoleLabel(role),
    isPresenter: role === "presenter",
    isRoundtableLeader: role === "roundtable-leader",
    isFeaturedGuest: role === "featured-guest",
    isFeaturedMember: role === "featured-member",
    isFeaturedAuthor: role === "featured-author",
    isFeaturedPartner: role === "featured-partner"
  };
}

async function updateRegistrantRoleForMatrixChange(env, record = {}, roleValue = "", actor = "", now = new Date().toISOString()) {
  const inviteCode = cleanCode(record.code || record.inviteCode);
  const registrationId = cleanString(record.registrationId);
  const email = invitePersonEmail(record);
  const typeCandidates = record.type === "partner" || record.partnerContactEmail
    ? ["partner"]
    : ["guest", "member"];

  for (const type of typeCandidates) {
    const rows = await registrants(env, type);
    const row = rows.find((entry) =>
      (registrationId && (entry.key === registrationId || entry.id === registrationId)) ||
      (inviteCode && cleanCode(entry.inviteCode) === inviteCode && (!email || cleanString(entry.email).toLowerCase() === email))
    );
    if (!row) continue;
    const { key, row: crmRow } = await ensureCrmRecord(env, row, type);
    const roleUpdate = registrationRoleUpdate(roleValue, type, crmRow);
    await writeSetupJson(env, key, {
      ...crmRow,
      ...roleUpdate,
      key: undefined,
      crmType: registrantTypes[type].crmType,
      crmUpdatedAt: now,
      crmUpdatedBy: actor
    });
    return true;
  }

  return false;
}

async function saveGuestMatrixStatuses(env, payload = {}, actor = "") {
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const now = new Date().toISOString();
  let updatedCount = 0;
  for (const change of changes) {
    const key = cleanString(change?.key, 500);
    if (!key) continue;
    const allowedPrefix = key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX) ||
      key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX) ||
      key.startsWith(PARTNER_INVITE_PREFIX) ||
      key.startsWith(REGISTRATION_INVITE_PREFIXES.guest) ||
      key.startsWith(REGISTRATION_INVITE_PREFIXES.member);
    if (!allowedPrefix) continue;
    const existing = await readSetupJson(env, key);
    if (!existing) continue;
    const isPartnerRecord = key.startsWith(PARTNER_INVITE_PREFIX) || key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX);
    const hasCompanyChange = Object.prototype.hasOwnProperty.call(change, "company") ||
      Object.prototype.hasOwnProperty.call(change, "partnerCompany");
    const hasTitleChange = Object.prototype.hasOwnProperty.call(change, "title");
    const hasNameChange = Object.prototype.hasOwnProperty.call(change, "name");
    const hasLinkedInChange = Object.prototype.hasOwnProperty.call(change, "linkedinProfileUrl");
    const hasInvitedByChange = Object.prototype.hasOwnProperty.call(change, "invitedBy");
    const next = { ...existing };
    if (hasNameChange) {
      const name = cleanString(change.name, 240);
      next.name = name;
      next.intendedGuestName = name;
      next.invitedName = name;
      next.guestName = name;
      if (isPartnerRecord) next.partnerContactName = name;
    }
    if (Object.prototype.hasOwnProperty.call(change, "email")) {
      const rawEmail = cleanString(change.email, 240).toLowerCase();
      const email = rawEmail && isEmail(rawEmail) ? rawEmail : "";
      next.email = email;
      next.intendedGuestEmail = email;
      next.invitedEmail = email;
      next.guestEmail = email;
      if (isPartnerRecord) next.partnerContactEmail = email;
    }
    if (hasTitleChange) {
      const title = cleanString(change.title, 240);
      next.title = title;
      next.jobTitle = title;
      next.roleTitle = title;
      next.contactTitle = title;
    }
    if (hasLinkedInChange) {
      const linkedinProfileUrl = cleanLinkedInProfileUrl(change.linkedinProfileUrl);
      next.linkedinProfileUrl = linkedinProfileUrl;
      next.linkedinUrl = linkedinProfileUrl;
      next.linkedInProfileUrl = linkedinProfileUrl;
      next.linkedInUrl = linkedinProfileUrl;
    }
    if (hasInvitedByChange) {
      next.invitedBy = cleanString(change.invitedBy, 180);
    }
    if (
      Object.prototype.hasOwnProperty.call(change, "eventSlug") ||
      Object.prototype.hasOwnProperty.call(change, "eventName") ||
      Object.prototype.hasOwnProperty.call(change, "eventDate")
    ) {
      const eventSlug = cleanString(change.eventSlug ?? next.eventSlug, 200);
      const eventName = cleanString(change.eventName ?? next.eventName, 240);
      const eventDate = cleanString(change.eventDate ?? next.eventDate, 120);
      next.eventSlug = eventSlug;
      next.eventName = eventName;
      next.eventDate = eventDate;
      if (!eventSlug && !eventName) {
        next.eventId = "";
        next.eventTime = "";
        next.eventShowId = "";
        next.eventShowLabel = "";
        next.eventShowTime = "";
      } else {
        const showId = cleanEventShowId(next.eventShowId || next.showId || next.eventShow, "both");
        next.eventShowId = showId;
        next.eventShowLabel = showId ? eventShowLabel(showId) : "";
        next.eventShowTime = showId ? eventShowTime(showId) : "";
        next.eventTime = next.eventShowTime;
        next.eventId = cleanString(`${eventSlug || eventName}:${showId || "both"}`, 200);
      }
    }
    if (Object.prototype.hasOwnProperty.call(change, "eventShowId")) {
      const role = next.partnerRegistrationType || next.guestRegistrationType || next.registrationRole;
      const showId = requiresSingleShowRegistrationRole(role)
        ? cleanEventShowId(change.eventShowId, "morning")
        : cleanEventShowId(change.eventShowId, "both");
      next.eventShowId = showId;
      next.showId = showId;
      next.eventShowLabel = showId ? eventShowLabel(showId) : "";
      next.eventShowTime = showId ? eventShowTime(showId) : "";
      next.eventTime = next.eventShowTime;
      if (next.eventSlug || next.eventName) next.eventId = cleanString(`${next.eventSlug || next.eventName}:${showId || "both"}`, 200);
    }
    if (Object.prototype.hasOwnProperty.call(change, "linkedinConnection")) {
      next.linkedinConnectionStatus = cleanGuestMatrixOption(change.linkedinConnection, allowedGuestMatrixLinkedInStatuses, existing.linkedinConnectionStatus || "unknown");
    }
    if (Object.prototype.hasOwnProperty.call(change, "registrationRequest")) {
      next.registrationRequestStatus = cleanGuestMatrixOption(change.registrationRequest, allowedGuestMatrixRegistrationRequestStatuses, existing.registrationRequestStatus || "not-sent");
    }
    if (Object.prototype.hasOwnProperty.call(change, "guestStatus") || Object.prototype.hasOwnProperty.call(change, "partnerStatus")) {
      const status = cleanGuestRegistrationLifecycleStatus(change.partnerStatus ?? change.guestStatus, existing.crmStatus || existing.partnerStatus || existing.guestStatus || "pending-engagement");
      next.crmStatus = status;
      next.guestStatus = status;
      if (key.startsWith(PARTNER_INVITE_PREFIX) || key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX)) next.partnerStatus = status;
      next.registrationStatus = status;
    }
    if (Object.prototype.hasOwnProperty.call(change, "registrationRole")) {
      const roleUpdate = registrationRoleUpdate(change.registrationRole, isPartnerRecord ? "partner" : "guest", existing);
      next.registrationRole = roleUpdate.registrationRole;
      next.guestRegistrationType = roleUpdate.guestRegistrationType;
      next.partnerRegistrationType = roleUpdate.partnerRegistrationType;
      next.isPresenter = roleUpdate.isPresenter;
      next.isRoundtableLeader = roleUpdate.isRoundtableLeader;
      next.isFeaturedGuest = roleUpdate.isFeaturedGuest;
      next.isFeaturedMember = roleUpdate.isFeaturedMember;
      next.isFeaturedAuthor = roleUpdate.isFeaturedAuthor;
      next.isFeaturedPartner = roleUpdate.isFeaturedPartner;
      await updateRegistrantRoleForMatrixChange(env, next, roleUpdate.registrationRole, actor, now);
    }
    if (hasCompanyChange) {
      const company = cleanString(change.partnerCompany ?? change.company, 240);
      next.company = company;
      if (key.startsWith(PARTNER_INVITE_PREFIX) || key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX)) {
        next.partnerCompany = company;
      }
    }
    if (Object.prototype.hasOwnProperty.call(change, "matrixInterestRating")) {
      next.matrixInterestRating = cleanStarRating(change.matrixInterestRating, existing.matrixInterestRating || 1);
    }
    if (Object.prototype.hasOwnProperty.call(change, "potentialSponsor")) {
      const isGuestRecord = !isPartnerRecord;
      next.potentialSponsor = isGuestRecord && change.potentialSponsor === true;
    }
    if (Object.prototype.hasOwnProperty.call(change, "preRegistrationNotes")) {
      next.preRegistrationNotes = cleanString(change.preRegistrationNotes, 4000);
    }
    if (Object.prototype.hasOwnProperty.call(change, "eventNotes")) {
      const eventNotes = cleanString(change.eventNotes, 4000);
      next.eventNotes = eventNotes;
      next.registrationNotes = eventNotes;
      await updateRegistrantEventNotesForMatrixChange(env, next, eventNotes, actor, now);
    }
    next.updatedAt = now;
    next.updatedBy = actor;
    await writeSetupJson(env, key, next);
    const normalized = key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX)
      ? normalizeGuestMatrixProspect(key, next, "partner")
      : key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX)
        ? normalizeGuestMatrixProspect(key, next, "guest")
        : normalizeInviteCode(key, next);
    const source = key.startsWith(PARTNER_INVITE_PREFIX) || key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX)
      ? key.startsWith(PARTNER_MATRIX_PROSPECT_PREFIX) ? "partner-matrix-prospect" : "partner-invite"
      : key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX) ? "guest-matrix-prospect" : `${normalized.type || "guest"}-invite`;
    await upsertContactFromInviteRecord(env, normalized, source, actor, {
      preferIncomingName: hasNameChange,
      preferIncomingCompany: hasCompanyChange,
      preferIncomingTitle: hasTitleChange,
      preferIncomingLinkedIn: hasLinkedInChange,
      preferIncomingInvitedBy: hasInvitedByChange
    });
    updatedCount += 1;
  }
  return { updatedCount };
}

function eventTime(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const exactDate = new Date(`${value}T12:00:00`).getTime();
  if (!Number.isNaN(exactDate)) return exactDate;
  const looseDate = new Date(value).getTime();
  return Number.isNaN(looseDate) ? Number.POSITIVE_INFINITY : looseDate;
}

async function upcomingEvents(env) {
  const stored = await readSetupJson(env, EVENT_INDEX_KEY).catch(() => []);
  const rows = Array.isArray(stored) ? stored : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = rows
    .map((event) => ({
      slug: cleanString(event?.slug, 200),
      title: cleanString(event?.title, 240),
      date: cleanString(event?.date, 80),
      format: cleanString(event?.format, 80),
      updatedAt: cleanString(event?.updatedAt, 80)
    }))
    .filter((event) => event.slug && event.title);

  const bySlug = new Map(DEFAULT_UPCOMING_EVENTS.map((event) => [event.slug, { ...event, updatedAt: "" }]));
  for (const event of events) bySlug.set(event.slug, event);

  return [...bySlug.values()]
    .filter((event) => !event.date || eventTime(event.date) >= today.getTime())
    .sort((a, b) => eventTime(a.date) - eventTime(b.date) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function codeExists(env, code) {
  const keys = [
    `${PARTNER_INVITE_PREFIX}${code}`,
    `${REGISTRATION_INVITE_PREFIXES.guest}${code}`,
    `${REGISTRATION_INVITE_PREFIXES.member}${code}`,
    `partner-invite-code:${code}`,
    `guest-invite-code:${code}`,
    `member-invite-code:${code}`,
    `partner-invite:${code}`,
    `guest-invite:${code}`,
    `member-invite:${code}`
  ];
  for (const key of keys) {
    const record = await readSetupJson(env, key);
    if (record) return true;
  }
  return false;
}

async function createRegistrationInviteCode(env, payload = {}, actor = "") {
  const type = cleanInviteType(payload.type);
  let code = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomInviteCode();
    if (!(await codeExists(env, candidate))) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not generate a unique registration invite code.");

  let sourceMatrixProspectKey = cleanString(payload.sourceMatrixProspectKey, 500);
  const sourceMatrixProspect = sourceMatrixProspectKey.startsWith(GUEST_MATRIX_PROSPECT_PREFIX)
    ? await readSetupJson(env, sourceMatrixProspectKey)
    : null;
  let sourceProspect = sourceMatrixProspect
    ? normalizeGuestMatrixProspect(sourceMatrixProspectKey, sourceMatrixProspect, "guest")
    : null;
  const eventSlug = cleanString(payload.eventSlug, 200);
  const eventName = cleanString(payload.eventName, 240);
  const guestRegistrationType = cleanGuestRegistrationType(payload.guestRegistrationType || payload.registrationRole || payload.type);
  const rawShowId = cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, "both");
  const eventShowId = requiresSingleShowRegistrationRole(guestRegistrationType) && rawShowId === "both" ? "morning" : rawShowId;
  const eventTime = eventShowTime(eventShowId);
  const rawGuestName = cleanString(
    payload.intendedGuestName || payload.invitedName || payload.guestName || payload.name,
    240
  );
  const rawGuestEmail = cleanString(
    payload.intendedGuestEmail || payload.invitedEmail || payload.guestEmail || payload.email,
    240
  ).toLowerCase();
  const intendedGuestEmail = isEmail(rawGuestEmail)
    ? rawGuestEmail
    : isEmail(rawGuestName)
      ? rawGuestName.toLowerCase()
      : "";
  const intendedGuestName = isEmail(rawGuestName) ? "" : rawGuestName;
  if (!eventSlug && !eventName) throw new Error("Select an event before generating an invite code.");

  const createdAt = new Date().toISOString();
  if (!sourceProspect) {
    const matchedProspect = await findGuestMatrixProspectForInvite(env, {
      intendedGuestName,
      intendedGuestEmail,
      linkedinProfileUrl: payload.linkedinProfileUrl || payload.linkedInProfileUrl || payload.linkedinUrl || payload.linkedInUrl
    });
    if (matchedProspect) {
      sourceMatrixProspectKey = matchedProspect.key;
      sourceProspect = matchedProspect.prospect;
    }
  }
  const linkedinProfileUrl = cleanLinkedInProfileUrl(
    payload.linkedinProfileUrl ||
    payload.linkedInProfileUrl ||
    payload.linkedinUrl ||
    payload.linkedInUrl ||
    sourceProspect?.linkedinProfileUrl ||
    sourceProspect?.linkedinUrl
  );
  const matrixInterestRating = cleanStarRating(
    payload.matrixInterestRating ??
    payload.participationInterestRating ??
    payload.interestRating ??
    sourceProspect?.matrixInterestRating,
    1
  );
  const potentialSponsor = payload.potentialSponsor === true ||
    payload.isPotentialSponsor === true ||
    payload.sponsorProspect === true ||
    sourceProspect?.potentialSponsor === true;
  const record = {
    type,
    code,
    status: "active",
    eventId: cleanString(payload.eventId || `${eventSlug || eventName}:${eventShowId}`, 200),
    eventSlug,
    eventName,
    eventDate: cleanString(payload.eventDate, 120),
    eventTime,
    eventShowId,
    eventShowLabel: eventShowLabel(eventShowId),
    eventShowTime: eventTime,
    invitedBy: cleanString(payload.invitedBy || payload.inviter || payload.invitedByName || actor, 180),
    company: cleanString(payload.company || sourceProspect?.company || sourceProspect?.partnerCompany, 240),
    title: cleanString(payload.title || payload.jobTitle || sourceProspect?.title, 240),
    jobTitle: cleanString(payload.jobTitle || payload.title || sourceProspect?.title, 240),
    linkedinProfileUrl,
    linkedinUrl: linkedinProfileUrl,
    name: intendedGuestName,
    email: intendedGuestEmail,
    intendedGuestName,
    intendedGuestEmail,
    invitedEmail: intendedGuestEmail,
    guestEmail: intendedGuestEmail,
    invitedName: intendedGuestName,
    guestName: intendedGuestName,
    guestRegistrationType,
    registrationRole: guestRegistrationType,
    crmStatus: "invited",
    guestStatus: "invited",
    registrationStatus: "invited",
    linkedinConnectionStatus: cleanGuestMatrixOption(
      payload.linkedinConnectionStatus || payload.linkedInConnectionStatus || payload.connectionStatus || sourceProspect?.linkedinConnectionStatus,
      allowedGuestMatrixLinkedInStatuses,
      "unknown"
    ),
    registrationRequestStatus: cleanGuestMatrixOption(
      payload.registrationRequestStatus || payload.inviteStage || payload.inviteStatus || sourceProspect?.registrationRequestStatus,
      allowedGuestMatrixRegistrationRequestStatuses,
      "sent"
    ),
    matrixInterestRating,
    potentialSponsor,
    preRegistrationNotes: cleanString(payload.preRegistrationNotes || sourceProspect?.preRegistrationNotes, 4000),
    sourceMatrixProspectKey: sourceProspect ? sourceMatrixProspectKey : "",
    createdAt,
    createdBy: actor
  };

  const key = `${REGISTRATION_INVITE_PREFIXES[type]}${code}`;
  await writeSetupJson(env, key, record);
  if (sourceProspect) {
    await deleteSetupRecord(env, sourceMatrixProspectKey);
  }
  const invite = normalizeInviteCode(key, record);
  await upsertContactFromInviteRecord(env, invite, `${type}-invite`, actor, {
    preferIncomingCompany: Boolean(record.company)
  });
  return invite;
}

async function createPartnerInviteCode(env, payload = {}, actor = "") {
  let code = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomInviteCode();
    if (!(await codeExists(env, candidate))) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not generate a unique partner invite code.");

  const partnerRegistrationType = cleanGuestRegistrationType(payload.partnerRegistrationType || payload.registrationRole || "partner-candidate");
  const rawShowId = cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, "both");
  const eventShowId = requiresSingleShowRegistrationRole(partnerRegistrationType) && rawShowId === "both" ? "morning" : rawShowId;
  const eventTime = eventShowTime(eventShowId);
  const createdAt = new Date().toISOString();
  const name = cleanString(payload.partnerContactName || payload.intendedGuestName || payload.invitedName || payload.name, 240);
  const email = cleanString(payload.partnerContactEmail || payload.intendedGuestEmail || payload.invitedEmail || payload.email, 240).toLowerCase();
  const company = cleanString(payload.partnerCompany || payload.company, 240);
  const record = {
    type: "partner",
    code,
    status: "active",
    eventId: cleanString(payload.eventId || `${payload.eventSlug || payload.eventName}:${eventShowId}`, 200),
    eventSlug: cleanString(payload.eventSlug, 200),
    eventName: cleanString(payload.eventName, 240),
    eventDate: cleanString(payload.eventDate, 120),
    eventTime,
    eventShowId,
    eventShowLabel: eventShowLabel(eventShowId),
    eventShowTime: eventTime,
    invitedBy: cleanString(payload.invitedBy || payload.inviter || payload.invitedByName || actor, 180),
    name,
    email,
    company,
    partnerCompany: company,
    partnerContactName: name,
    partnerContactEmail: email,
    partnerTier: cleanString(payload.partnerTier, 120),
    partnerRegistrationType,
    registrationRole: partnerRegistrationType,
    createdAt,
    createdBy: actor
  };

  const key = `${PARTNER_INVITE_PREFIX}${code}`;
  await writeSetupJson(env, key, record);
  const invite = normalizeInviteCode(key, record);
  await upsertContactFromInviteRecord(env, invite, "partner-invite", actor, {
    preferIncomingCompany: Boolean(company)
  });
  return invite;
}

async function deleteInviteCode(env, payload = {}) {
  const type = cleanString(payload.type);
  const key = cleanString(payload.key, 300);
  const code = cleanCode(payload.code);
  const prefixes = type === "partner"
    ? [PARTNER_INVITE_PREFIX]
    : type === "member" || type === "guest"
      ? [REGISTRATION_INVITE_PREFIXES[type]]
      : [REGISTRATION_INVITE_PREFIXES.guest, REGISTRATION_INVITE_PREFIXES.member, PARTNER_INVITE_PREFIX];

  const candidates = [
    key,
    ...prefixes.map((prefix) => code ? `${prefix}${code}` : "")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const record = await readSetupJson(env, candidate);
    if (record) {
      await deleteSetupRecord(env, candidate);
      return { deleted: candidate };
    }
  }

  throw new Error("Invite link was not found.");
}

async function findInviteCodeRecord(env, payload = {}) {
  const type = cleanString(payload.type);
  const key = cleanString(payload.key, 300);
  const code = cleanCode(payload.code);
  const prefixes = type === "member" || type === "guest"
    ? [REGISTRATION_INVITE_PREFIXES[type]]
    : [REGISTRATION_INVITE_PREFIXES.guest, REGISTRATION_INVITE_PREFIXES.member];

  const candidates = [
    key,
    ...prefixes.map((prefix) => code ? `${prefix}${code}` : "")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const record = await readSetupJson(env, candidate);
    if (record) return normalizeInviteCode(candidate, record);
  }

  throw new Error("Invite link was not found.");
}

async function updateRegistrationInviteShow(env, payload = {}, actor = "") {
  const invite = await findInviteCodeRecord(env, payload);
  if (invite.status === "used" || invite.usedBy || invite.usedByEmail || invite.usedByName) {
    throw new Error("This invite has already been used. Update the registrant event details instead.");
  }

  const existing = await readSetupJson(env, invite.key);
  if (!existing) throw new Error("Invite link was not found.");

  const role = cleanGuestRegistrationType(existing.guestRegistrationType || existing.registrationRole || invite.guestRegistrationType || invite.registrationRole);
  const rawShowId = cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, "");
  if (!rawShowId) throw new Error("Choose a valid show time.");
  if (requiresSingleShowRegistrationRole(role) && rawShowId === "both") {
    throw new Error("Choose either the morning show or afternoon show for this featured invite.");
  }

  const now = new Date().toISOString();
  const next = {
    ...existing,
    eventShowId: rawShowId,
    eventShowLabel: eventShowLabel(rawShowId),
    eventShowTime: eventShowTime(rawShowId),
    eventTime: eventShowTime(rawShowId),
    eventId: cleanString(existing.eventSlug || existing.eventName, 200)
      ? `${cleanString(existing.eventSlug || existing.eventName, 200)}:${rawShowId}`
      : existing.eventId,
    updatedAt: now,
    updatedBy: actor
  };
  await writeSetupJson(env, invite.key, next);
  const updatedInvite = normalizeInviteCode(invite.key, next);
  await upsertContactFromInviteRecord(env, updatedInvite, `${updatedInvite.type || "guest"}-invite`, actor);
  return updatedInvite;
}

function inviteRegistrationUrl(origin, invite) {
  const path = invite.type === "member" ? "/member-registration/" : "/guest/";
  return `${origin}${path}?invite=${encodeURIComponent(invite.code || "")}`;
}

function partnerInviteRegistrationUrl(origin, invite) {
  return `${origin}/partner-registration/?invite=${encodeURIComponent(invite.code || "")}`;
}

function partnerInviteRoleLabel(invite = {}) {
  const role = cleanGuestRegistrationType(invite.partnerRegistrationType || invite.registrationRole || "partner-candidate");
  if (role === "featured-partner") return "featured partner";
  if (role === "partner-candidate") return "partner candidate";
  return "partner";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function inviteReminderFirstName(invite) {
  const name = invitePersonName(invite);
  if (!name) return "there";
  return name.split(/\s+/)[0];
}

function inviteReminderEventTime(invite = {}) {
  const explicitTime =
    cleanString(invite.eventShowTime, 120) ||
    cleanString(invite.usedForTime, 120) ||
    cleanString(invite.eventTime, 120);
  if (explicitTime) return explicitTime;

  const showId = cleanEventShowId(invite.eventShowId || invite.showId || invite.eventShow || invite.show, "");
  return showId ? eventShowTime(showId) : "";
}

function inviteReminderEventPhrase(eventName, eventDate, eventTime = "") {
  const date = cleanString(eventDate, 120);
  const time = cleanString(eventTime, 120);
  const eventDetails = date && time
    ? ` on ${date} at ${time}`
    : date
      ? ` on ${date}`
      : time
        ? ` at ${time}`
        : "";
  return `Mojo AI Summit's ${eventName}${eventDetails}`;
}

function inviteReminderText({ firstName, eventName, eventDate, eventTime, registrationUrl }) {
  return [
    `Hi ${firstName},`,
    "",
    `This is a friendly reminder to complete your registration for ${inviteReminderEventPhrase(eventName, eventDate, eventTime)}.`,
    "",
    "Your invitation includes a personal registration link created specifically for you. Please use the link below to confirm your attendance:",
    "",
    registrationUrl,
    "",
    "We look forward to having you join us. If you have any trouble registering, please reply to this email for assistance.",
    "",
    "Best,",
    "",
    "Angel Mosley",
    "Program Director",
    "MOJO AI Summits",
    "Angel@mojoaisummits.com"
  ].join("\n");
}

function inviteReminderHtml({ firstName, eventName, eventDate, eventTime, registrationUrl }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.6;font-size:15px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>This is a friendly reminder to complete your registration for ${escapeHtml(inviteReminderEventPhrase(eventName, eventDate, eventTime))}.</p>
      <p>Your invitation includes a personal registration link created specifically for you. Please use the link below to confirm your attendance:</p>
      <p><a href="${escapeHtml(registrationUrl)}" style="color:#1656d9">${escapeHtml(registrationUrl)}</a></p>
      <p>We look forward to having you join us. If you have any trouble registering, please reply to this email for assistance.</p>
      <p>
        Best,<br>
        <br>
        Angel Mosley<br>
        Program Director<br>
        MOJO AI Summits<br>
        Angel@mojoaisummits.com
      </p>
    </div>
  `;
}

async function sendResendEmail(env, { to, subject, html, text, replyTo, cc = [] }) {
  const apiKey = cleanString(env.RESEND_API_KEY || env.MOJO_RESEND_API_KEY, 400);
  if (!apiKey) throw new Error("Resend is not configured (missing RESEND_API_KEY or MOJO_RESEND_API_KEY).");

  const from = cleanString(env.MOJO_RESEND_FROM, 200) || "Angel Mosley <angel@mojoaisummits.com>";
  const ccList = cleanEmailList(cc, [to]);
  const payload = {
    from,
    to: [to],
    subject,
    html,
    text,
    ...(ccList.length ? { cc: ccList } : {}),
    ...(replyTo ? { reply_to: replyTo } : {})
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Resend could not send the reminder email.");
  }

  return {
    ...(await response.json().catch(() => ({}))),
    cc: ccList,
    to,
    subject
  };
}

function inviteInvitationText({ firstName, eventName, eventDate, eventTime, registrationUrl }) {
  return [
    `Hi ${firstName},`,
    "",
    `We're pleased to invite you to join us for ${inviteReminderEventPhrase(eventName, eventDate, eventTime)}.`,
    "",
    "Please use your personal registration link below to review the event details and confirm your attendance:",
    "",
    registrationUrl,
    "",
    "This link is unique to you, so please do not forward or share it.",
    "",
    "We're looking forward to having you join us and be part of the conversation.",
    "",
    "Best,",
    "",
    "Angel Mosley",
    "Program Director",
    "MOJO AI Summits",
    "Angel@mojoaisummits.com"
  ].join("\n");
}

function inviteInvitationHtml({ firstName, eventName, eventDate, eventTime, registrationUrl }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.6;font-size:15px">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>We're pleased to invite you to join us for ${escapeHtml(inviteReminderEventPhrase(eventName, eventDate, eventTime))}.</p>
      <p>Please use your personal registration link below to review the event details and confirm your attendance:</p>
      <p><a href="${escapeHtml(registrationUrl)}" style="color:#1656d9">${escapeHtml(registrationUrl)}</a></p>
      <p>This link is unique to you, so please do not forward or share it.</p>
      <p>We're looking forward to having you join us and be part of the conversation.</p>
      <p>
        Best,<br>
        <br>
        Angel Mosley<br>
        Program Director<br>
        MOJO AI Summits<br>
        Angel@mojoaisummits.com
      </p>
    </div>
  `;
}

async function sendInviteInvitationEmail(env, invite, origin = "") {
  const toEmail = invitePersonEmail(invite);
  if (!isEmail(toEmail)) throw new Error("Enter a valid email address before sending the invitation.");

  const eventName = cleanString(invite.eventName, 240) || "our upcoming event";
  const eventDate = cleanString(invite.eventDate, 120);
  const eventTime = inviteReminderEventTime(invite);
  const firstName = inviteReminderFirstName(invite);
  const registrationUrl = inviteRegistrationUrl(origin, invite);

  const context = { firstName, eventName, eventDate, eventTime, registrationUrl };
  const result = await sendResendEmail(env, {
    to: toEmail,
    subject: `You’re Invited: ${eventName}`,
    html: inviteInvitationHtml(context),
    text: inviteInvitationText(context),
    replyTo: "Angel@mojoaisummits.com",
    cc: guestInviteEmailCc
  });

  return { sentTo: toEmail, cc: result.cc || [], messageId: cleanString(result.id || result.messageId, 200) };
}

function partnerInviteInvitationText({ eventName, eventDate, eventTime, registrationUrl, partnerCompany, roleLabel }) {
  const companyLine = partnerCompany ? `This invite is for ${partnerCompany}.` : "This invite is for your organization.";
  return [
    "Hi there,",
    "",
    `We're pleased to invite you to complete the ${roleLabel} registration for ${inviteReminderEventPhrase(eventName, eventDate, eventTime)}.`,
    "",
    companyLine,
    "",
    "Please use the link below to review the event details and confirm the partner registration:",
    "",
    registrationUrl,
    "",
    "This link is unique to this partner invite, so please do not forward or share it.",
    "",
    "Best,",
    "",
    "MOJO AI Summits"
  ].join("\n");
}

function partnerInviteInvitationHtml({ eventName, eventDate, eventTime, registrationUrl, partnerCompany, roleLabel }) {
  const companyLine = partnerCompany ? `This invite is for ${escapeHtml(partnerCompany)}.` : "This invite is for your organization.";
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0F1E;line-height:1.6;font-size:15px">
      <p>Hi there,</p>
      <p>We're pleased to invite you to complete the ${escapeHtml(roleLabel)} registration for ${escapeHtml(inviteReminderEventPhrase(eventName, eventDate, eventTime))}.</p>
      <p>${companyLine}</p>
      <p>Please use the link below to review the event details and confirm the partner registration:</p>
      <p><a href="${escapeHtml(registrationUrl)}" style="color:#1656d9">${escapeHtml(registrationUrl)}</a></p>
      <p>This link is unique to this partner invite, so please do not forward or share it.</p>
      <p>
        Best,<br>
        <br>
        MOJO AI Summits
      </p>
    </div>
  `;
}

async function sendPartnerInviteInvitationEmail(env, invite, origin = "") {
  const toEmail = invitePersonEmail(invite) || cleanString(invite.partnerEmail, 240).toLowerCase();
  if (!isEmail(toEmail)) throw new Error("Enter a valid partner email address before sending the invitation.");

  const eventName = cleanString(invite.eventName, 240) || "our upcoming event";
  const eventDate = cleanString(invite.eventDate, 120);
  const eventTime = inviteReminderEventTime(invite);
  const partnerCompany = cleanString(invite.partnerCompany, 240);
  const roleLabel = partnerInviteRoleLabel(invite);
  const registrationUrl = partnerInviteRegistrationUrl(origin, invite);
  const context = { eventName, eventDate, eventTime, registrationUrl, partnerCompany, roleLabel };
  const result = await sendResendEmail(env, {
    to: toEmail,
    subject: `Partner Invite: ${eventName}`,
    html: partnerInviteInvitationHtml(context),
    text: partnerInviteInvitationText(context),
    replyTo: "scott@mojoaisummits.com",
    cc: partnerInviteEmailCc
  });

  return { sentTo: toEmail, cc: result.cc || [], messageId: cleanString(result.id || result.messageId, 200) };
}

async function sendInviteReminderEmail(env, payload = {}, origin = "") {
  const invite = await findInviteCodeRecord(env, payload);
  const toEmail = invitePersonEmail(invite);
  if (!isEmail(toEmail)) throw new Error("This invite does not have a valid email address on file.");

  const eventName = cleanString(invite.eventName, 240) || "your upcoming event";
  const eventDate = cleanString(invite.eventDate, 120);
  const eventTime = inviteReminderEventTime(invite);
  const firstName = inviteReminderFirstName(invite);
  const registrationUrl = inviteRegistrationUrl(cleanString(payload.origin, 200) || origin, invite);

  const context = { firstName, eventName, eventDate, eventTime, registrationUrl };
  const result = await sendResendEmail(env, {
    to: toEmail,
    subject: `Reminder: complete your registration for ${eventName}`,
    html: inviteReminderHtml(context),
    text: inviteReminderText(context),
    replyTo: "Angel@mojoaisummits.com",
    cc: guestInviteEmailCc
  });

  return { sentTo: toEmail, cc: result.cc || [], messageId: cleanString(result.id || result.messageId, 200) };
}

async function logGuestRegistrationEmail(env, entry = {}) {
  if (!env.MOJO_SUMMITS_SETUP_STATE?.put && !crmD1Available(env)) return;
  const now = new Date().toISOString();
  const id = `${now}:${crypto.randomUUID()}`;
  await writeSetupJson(env, `${EMAIL_LOG_PREFIX}${id}`, {
    id,
    createdAt: now,
    type: cleanString(entry.type, 80) || "guest-registration",
    status: cleanString(entry.status, 80) || "attempted",
    to: cleanString(entry.to, 240).toLowerCase(),
    cc: cleanEmailList(entry.cc || []),
    subject: cleanString(entry.subject, 300),
    contactKey: cleanString(entry.contactKey, 300),
    inviteKey: cleanString(entry.inviteKey, 300),
    inviteCode: cleanCode(entry.inviteCode),
    eventSlug: cleanString(entry.eventSlug, 200),
    eventName: cleanString(entry.eventName, 240),
    actor: cleanString(entry.actor, 240),
    messageId: cleanString(entry.messageId, 240),
    error: cleanString(entry.error, 500)
  });
}

async function removeEmailFromCompanyContacts(env, email, actor = "") {
  const deletedFromCompanies = [];
  const companyKeys = [
    ...(await listKeys(env, "crm:company:")),
    ...(await listKeys(env, "partner-company:")),
    ...(await listKeys(env, "member-company:")),
    ...(await listKeys(env, "guest-company:"))
  ];

  for (const key of [...new Set(companyKeys)]) {
    const record = await readRawRecord(env, key);
    if (!record || !Array.isArray(record.contacts)) continue;
    const nextContacts = record.contacts.filter((entry) => cleanString(entry?.email).toLowerCase() !== email);
    if (nextContacts.length === record.contacts.length) continue;
    await writeSetupJson(env, key, {
      ...record,
      contacts: nextContacts,
      updatedAt: new Date().toISOString(),
      updatedBy: actor || "crm"
    });
    deletedFromCompanies.push(key);
  }

  return deletedFromCompanies;
}

async function deleteDerivedContactSources(env, contactKey = "") {
  const requestedKey = cleanString(contactKey, 500);
  if (!requestedKey) return [];

  const deletedSourceKeys = [];
  const deleteMatchingSource = async (row = {}, source = "") => {
    const derivedContact = contactFromInviteRecord(row, source);
    if (derivedContact?.key !== requestedKey) return;
    const sourceKey = cleanString(row.key, 500);
    if (!sourceKey) return;
    const existing = await readSetupJson(env, sourceKey);
    if (!existing) return;
    await deleteSetupRecord(env, sourceKey);
    deletedSourceKeys.push(sourceKey);
  };

  for (const invite of await registrationInviteCodes(env)) {
    await deleteMatchingSource(invite, `${invite.type || "guest"}-invite`);
  }

  for (const prospect of await guestMatrixProspects(env)) {
    await deleteMatchingSource(prospect, "guest-matrix-prospect");
  }

  return [...new Set(deletedSourceKeys)];
}

async function deleteContact(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key, 500);
  const requestedEmail = cleanString(payload.email, 180).toLowerCase();
  const keyIdentity = requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
    ? cleanString(requestedKey.replace(registrantTypes.contacts.crmPrefix, ""), 240).toLowerCase()
    : "";
  const directContactKey = requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
    ? requestedKey
    : isEmail(requestedEmail)
      ? `${registrantTypes.contacts.crmPrefix}${requestedEmail}`
      : "";
  const existingContact = directContactKey
    ? await readSetupJson(env, directContactKey)
    : null;
  const existingEmail = cleanString(existingContact?.email, 180).toLowerCase();
  const email = isEmail(requestedEmail)
    ? requestedEmail
    : isEmail(existingEmail)
      ? existingEmail
      : isEmail(keyIdentity)
        ? keyIdentity
        : "";
  if (!directContactKey && !email) throw new Error("Contact key or email is required before deleting a contact.");

  const deletedKeys = [];
  const primaryContactKey = directContactKey || `${registrantTypes.contacts.crmPrefix}${email}`;
  await deleteSetupRecord(env, primaryContactKey);
  deletedKeys.push(primaryContactKey);

  if (email) {
    const emailContactKey = `${registrantTypes.contacts.crmPrefix}${email}`;
    if (emailContactKey !== primaryContactKey) {
      await deleteSetupRecord(env, emailContactKey);
      deletedKeys.push(emailContactKey);
    }
  }

  if (email) {
    for (const type of ["guest", "member", "partner"]) {
      const config = registrantTypes[type];
      const keys = [...new Set([
        ...(await listKeys(env, config.crmPrefix)),
        ...(await listKeys(env, config.legacyPrefix))
      ])];
      for (const key of keys) {
        const record = await readRawRecord(env, key);
        if (cleanString(record?.email).toLowerCase() !== email) continue;
        await deleteSetupRecord(env, key);
        deletedKeys.push(key);
      }
    }
  }

  const deletedSourceKeys = directContactKey ? await deleteDerivedContactSources(env, directContactKey) : [];
  const deletedR2Keys = email ? await deleteR2RegistrantsForEmail(env, email) : [];
  const deletedFromCompanies = email ? await removeEmailFromCompanyContacts(env, email, actor) : [];
  return {
    email,
    deletedKeys: [...new Set(deletedKeys)],
    deletedSourceKeys,
    deletedR2Keys,
    deletedFromCompanies
  };
}

function registrationEventTarget(row = {}) {
  return {
    id: cleanString(row.id || row.key),
    eventId: cleanString(row.eventId),
    eventSlug: cleanString(row.eventSlug),
    eventName: cleanString(row.eventName),
    eventDate: cleanString(row.eventDate),
    eventTime: cleanString(row.eventTime),
    eventShowId: cleanEventShowId(row.eventShowId || row.showId || row.eventShow, ""),
    eventShowLabel: cleanString(row.eventShowLabel),
    eventShowTime: cleanString(row.eventShowTime),
    inviteCode: cleanString(row.inviteCode),
    registrationId: cleanString(row.id),
    registeredAt: cleanString(row.createdAt)
  };
}

async function removeContactEventForRegistrant(env, row = {}, actor = "") {
  const email = cleanString(row.email).toLowerCase();
  if (!email || !email.includes("@")) return { contactKey: "", removedEvents: 0, contactDeleted: false };

  const contactKey = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, contactKey);
  if (!existing) return { contactKey, removedEvents: 0, contactDeleted: false };

  const events = Array.isArray(existing.events) ? existing.events : [];
  const targetEvent = registrationEventTarget(row);
  const nextEvents = events.filter((event) => !contactEventMatches(event, targetEvent));
  const removedEvents = events.length - nextEvents.length;
  if (!removedEvents) return { contactKey, removedEvents: 0, contactDeleted: false };

  const now = new Date().toISOString();
  const canDeleteContact =
    !nextEvents.length &&
    !cleanString(existing.crmNotes) &&
    cleanString(existing.source).toLowerCase().includes("registration");

  if (canDeleteContact) {
    await deleteSetupRecord(env, contactKey);
    return { contactKey, removedEvents, contactDeleted: true };
  }

  await writeSetupJson(env, contactKey, {
    ...existing,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });

  return { contactKey, removedEvents, contactDeleted: false };
}

async function deleteGuestRegistrant(env, payload = {}, actor = "") {
  const type = cleanType(payload.type || "guest");
  if (type !== "guest") throw new Error("Only guest registrants can be deleted from this view.");

  const key = cleanString(payload.key, 500);
  const rows = await registrants(env, "guest");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Guest registrant was not found.");

  const deletedKeys = [];
  const rowId = cleanString(row.id);
  const rowCreatedAt = cleanString(row.createdAt);
  const rowEmail = cleanString(row.email).toLowerCase();
  const rowInviteCode = cleanString(row.inviteCode);
  const matchesRow = (candidateKey, record = {}) => {
    if (candidateKey === row.key) return true;
    if (rowId && cleanString(record.id) === rowId) return true;
    return Boolean(
      rowCreatedAt &&
      rowEmail &&
      cleanString(record.createdAt) === rowCreatedAt &&
      cleanString(record.email).toLowerCase() === rowEmail &&
      (!rowInviteCode || cleanString(record.inviteCode) === rowInviteCode)
    );
  };

  const kvKeys = [...new Set([
    ...(await listKeys(env, registrantTypes.guest.crmPrefix)),
    ...(await listKeys(env, registrantTypes.guest.legacyPrefix))
  ])];
  for (const candidateKey of kvKeys) {
    const record = await readRawRecord(env, candidateKey);
    if (!record || !matchesRow(candidateKey, record)) continue;
    await deleteSetupRecord(env, candidateKey);
    deletedKeys.push(candidateKey);
  }

  if (env.MOJO_SUMMITS_STORAGE?.list && env.MOJO_SUMMITS_STORAGE?.get && env.MOJO_SUMMITS_STORAGE?.delete) {
    for (const prefix of [`${R2_REGISTRATION_PREFIX}/guest/`, `${OVERFLOW_REGISTRATION_PREFIX}/guest/`]) {
      let cursor;
      do {
        const result = await env.MOJO_SUMMITS_STORAGE.list({ prefix, cursor, limit: 1000 }).catch(() => null);
        if (!result) break;
        for (const object of result.objects || []) {
          const stored = await env.MOJO_SUMMITS_STORAGE.get(object.key).catch(() => null);
          const record = stored ? await stored.json().catch(() => null) : null;
          if (!record || !matchesRow(object.key, record)) continue;
          await env.MOJO_SUMMITS_STORAGE.delete(object.key);
          deletedKeys.push(object.key);
        }
        cursor = result.truncated ? result.cursor : undefined;
      } while (cursor);
    }
  }

  if (!deletedKeys.length) throw new Error("Guest registrant storage record was not found.");

  const contactCleanup = await removeContactEventForRegistrant(env, row, actor);
  return {
    key: row.key,
    id: row.id,
    email: row.email,
    name: row.name,
    deletedKeys,
    contactCleanup
  };
}

async function updateContact(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key);
  const currentEmail = cleanString(
    requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
      ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
      : requestedKey
  ).toLowerCase();
  const email = cleanString(payload.email || currentEmail).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before updating a contact.");

  const currentKey = `${registrantTypes.contacts.crmPrefix}${currentEmail || email}`;
  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, currentKey);
  const targetExisting = key === currentKey ? existing : await readRawRecord(env, key);
  if (key !== currentKey && targetExisting) throw new Error("A contact with that email address already exists.");
  const now = new Date().toISOString();
  const firstName = cleanString(payload.firstName ?? existing?.firstName, 120);
  const lastName = cleanString(payload.lastName ?? existing?.lastName, 120);
  const existingName = cleanString(existing?.name) || email;
  const name = cleanString(payload.name) || [firstName, lastName].filter(Boolean).join(" ") || existingName;
  const topicInterests = cleanTopicTracks(payload.topicInterests ?? existing?.topicInterests);
  const emailPermission = cleanAllowed(payload.emailPermission ?? existing?.emailPermission, allowedEmailPermissions, "unknown");
  const rawLinkedInProfileUrl = cleanString(
    payload.linkedinProfileUrl ??
      payload.linkedInProfileUrl ??
      payload.linkedinUrl ??
      payload.linkedInUrl ??
      existing?.linkedinProfileUrl ??
      existing?.linkedInProfileUrl ??
      existing?.linkedinUrl ??
      existing?.linkedInUrl,
    500
  );
  const linkedinProfileUrl = cleanLinkedInProfileUrl(rawLinkedInProfileUrl);
  if (rawLinkedInProfileUrl && !linkedinProfileUrl) {
    throw new Error("Enter a valid LinkedIn profile URL.");
  }

  await writeSetupJson(env, key, {
    ...(existing || {}),
    id: email,
    email,
    name,
    firstName,
    lastName,
    company: cleanString(payload.company ?? payload.partnerCompany ?? existing?.company ?? existing?.partnerCompany, 240),
    title: cleanString(payload.title ?? existing?.title, 180),
    phone: cleanString(payload.phone ?? existing?.phone, 80),
    linkedinProfileUrl,
    partnerLinkedInPromotionText: cleanString(payload.partnerLinkedInPromotionText ?? payload.partnerPromotionText ?? payload.partnerHypeText ?? existing?.partnerLinkedInPromotionText, 4000),
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    photoUrl: cleanString(payload.photoUrl ?? payload.photoURL ?? payload.photo ?? existing?.photoUrl, 500),
    photoKey: safeObjectKey(payload.photoKey ?? existing?.photoKey),
    companyLogoUrl: cleanString(payload.companyLogoUrl ?? payload.partnerCompanyLogoUrl ?? payload.logoUrl ?? existing?.companyLogoUrl ?? existing?.partnerCompanyLogoUrl ?? existing?.logoUrl, 500),
    companyLogoKey: safeObjectKey(payload.companyLogoKey ?? payload.partnerCompanyLogoKey ?? payload.logoKey ?? existing?.companyLogoKey ?? existing?.partnerCompanyLogoKey ?? existing?.logoKey),
    companyLogoOriginalName: cleanString(payload.companyLogoOriginalName ?? payload.partnerCompanyLogoOriginalName ?? existing?.companyLogoOriginalName ?? existing?.partnerCompanyLogoOriginalName),
    companyLogoUploadedAt: cleanString(payload.companyLogoUploadedAt ?? payload.partnerCompanyLogoUploadedAt ?? existing?.companyLogoUploadedAt ?? existing?.partnerCompanyLogoUploadedAt),
    bio: cleanString(payload.bio ?? payload.biography ?? existing?.bio, 4000),
    executiveFunction: cleanAllowed(payload.executiveFunction ?? existing?.executiveFunction, allowedExecutiveFunctions, ""),
    industry: cleanString(payload.industry ?? existing?.industry),
    companySize: cleanAllowed(payload.companySize ?? existing?.companySize, allowedCompanySizes, ""),
    organizationType: cleanAllowed(payload.organizationType ?? existing?.organizationType, allowedOrganizationTypes, ""),
    city: cleanString(payload.city ?? existing?.city, 120),
    stateCountry: cleanString(payload.stateCountry ?? payload.state ?? existing?.stateCountry ?? existing?.state ?? existing?.country, 120),
    state: cleanString(payload.state ?? payload.stateCountry ?? existing?.state ?? existing?.stateCountry ?? existing?.country, 120),
    timeZone: cleanString(payload.timeZone ?? existing?.timeZone, 120),
    location: cleanString(payload.location ?? existing?.location, 180),
    invitationSource: cleanString(payload.invitationSource ?? existing?.invitationSource, 180),
    invitedBy: cleanString(payload.invitedBy ?? payload.inviter ?? payload.invitedByName ?? existing?.invitedBy, 180),
    relationshipOwner: cleanString(payload.relationshipOwner ?? existing?.relationshipOwner, 180),
    lifecycleStage: cleanAllowed(payload.lifecycleStage ?? existing?.lifecycleStage, allowedLifecycleStages, "guest"),
    contactGuestRating: cleanStarRating(payload.contactGuestRating ?? payload.guestRelationshipRating ?? existing?.contactGuestRating, 1),
    nextAction: cleanAllowed(payload.nextAction ?? existing?.nextAction, allowedNextActions, "none"),
    nextActionDueDate: cleanString(payload.nextActionDueDate ?? payload.dueDate ?? existing?.nextActionDueDate, 40),
    lastContactDate: cleanString(payload.lastContactDate ?? existing?.lastContactDate, 40),
    emailPermission,
    emailOptOut: payload.emailOptOut === true || emailPermission === "opted-out",
    topicInterests,
    events: Array.isArray(existing?.events)
      ? existing.events.map((event) => ({ ...event, email }))
      : existing?.events,
    crmNotes: cleanString(payload.crmNotes),
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });
  if (currentKey !== key && currentEmail) await deleteSetupRecord(env, currentKey);
}

async function serveContactPhoto(request, env) {
  if (!env.MOJO_SUMMITS_STORAGE?.get) {
    return json({ error: "CRM photo storage is not configured." }, { status: 500 });
  }
  const url = new URL(request.url);
  const key = safeObjectKey(url.searchParams.get("photo"));
  const isAllowedPhotoKey = key.startsWith(`${CONTACT_PHOTO_PREFIX}/`) ||
    key.startsWith(`${REGISTRATION_PHOTO_PREFIX}/`) ||
    key.startsWith(`${REGISTRATION_COMPANY_LOGO_PREFIX}/`);
  if (!key || !isAllowedPhotoKey) {
    return json({ error: "Contact photo was not found." }, { status: 404 });
  }
  const object = await env.MOJO_SUMMITS_STORAGE.get(key);
  if (!object) return json({ error: "Contact photo was not found." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": object.httpMetadata?.contentType || "application/octet-stream"
    }
  });
}

async function uploadContactPhoto(request, env, form, actor = "") {
  if (!env.MOJO_SUMMITS_STORAGE?.put) {
    return json({ error: "CRM photo storage is not configured." }, { status: 500 });
  }

  const requestedKey = cleanString(form.get("key"));
  const email = cleanString(
    form.get("email") ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) return json({ error: "Contact email is required before uploading a photo." }, { status: 400 });

  const file = form.get("photo") || form.get("file");
  if (!file || typeof file.name !== "string" || typeof file.stream !== "function") {
    return json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!String(file.type || "").toLowerCase().startsWith("image/")) {
    return json({ error: "Upload an image file." }, { status: 400 });
  }
  if (Number(file.size || 0) > 6 * 1024 * 1024) {
    return json({ error: "Contact photos must be 6 MB or smaller." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const stamp = now.replace(/[:.]/g, "-");
  const id = crypto.randomUUID().slice(0, 8);
  const emailSegment = safeFileSegment(email.replace("@", "-at-"), "contact");
  const originalName = safeFileSegment(file.name, "photo");
  const photoKey = `${CONTACT_PHOTO_PREFIX}/${emailSegment}/${stamp}-${id}-${originalName}`;
  const photoUrl = `/api/crm?photo=${encodeURIComponent(photoKey)}`;

  await env.MOJO_SUMMITS_STORAGE.put(photoKey, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
    },
    customMetadata: {
      contactEmail: email,
      originalName: file.name,
      uploadedBy: actor || "crm",
      uploadedAt: now
    }
  });

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);
  await writeSetupJson(env, key, {
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    photoUrl,
    photoKey,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });

  const rows = await contacts(env);
  return json({
    ok: true,
    type: "contacts",
    label: registrantTypes.contacts.label,
    summary: summarizeContacts(rows),
    rows,
    photoUrl,
    photoKey,
    partnerInviteCodes: await partnerInviteCodes(env),
    registrationInviteCodes: await registrationInviteCodes(env),
    guestMatrixProspects: await guestMatrixProspects(env),
    upcomingEvents: await upcomingEvents(env)
  }, { status: 201 });
}

async function addContactActivity(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key);
  const email = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before adding activity.");
  const text = cleanString(payload.text || payload.activityText);
  if (!text) throw new Error("Activity text is required.");

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);
  const now = new Date().toISOString();
  const entry = normalizeActivity({
    type: payload.activityType || payload.type,
    owner: payload.owner || actor,
    text,
    nextAction: payload.nextAction,
    dueDate: payload.dueDate || payload.nextActionDueDate,
    createdAt: now
  });
  const activity = [entry, ...(Array.isArray(existing?.activity) ? existing.activity : [])]
    .map(normalizeActivity)
    .slice(0, 100);

  await writeSetupJson(env, key, {
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    activity,
    lastContactDate: cleanString(payload.lastContactDate) || now.slice(0, 10),
    nextAction: cleanAllowed(payload.nextAction ?? existing?.nextAction, allowedNextActions, cleanString(existing?.nextAction) || "none"),
    nextActionDueDate: cleanString(payload.dueDate || payload.nextActionDueDate || existing?.nextActionDueDate, 40),
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });
}

async function createManualPartner(env, payload = {}, actor = "") {
  const company = cleanString(payload.partnerCompany || payload.company, 240);
  const rawContacts = Array.isArray(payload.contacts) && payload.contacts.length
    ? payload.contacts
    : [{
      name: payload.name || payload.contactName,
      title: payload.title || payload.contactTitle,
      email: payload.email || payload.contactEmail,
      phone: payload.phone || payload.contactPhone
    }];
  const contacts = rawContacts.map((contact = {}) => ({
    name: cleanString(contact.name || contact.contactName, 180),
    title: cleanString(contact.title || contact.contactTitle, 180),
    email: cleanString(contact.email || contact.contactEmail, 180).toLowerCase(),
    phone: cleanString(contact.phone || contact.contactPhone, 80)
  })).filter((contact) => contact.name || contact.email || contact.phone || contact.title);
  const crmStatus = allowedStatuses.has(payload.crmStatus || payload.status) ? payload.crmStatus || payload.status : "new";
  if (!company) throw new Error("Company name is required.");
  if (!contacts.length) throw new Error("At least one partner contact is required.");

  const now = new Date().toISOString();
  const seenEmails = new Set();
  for (const contact of contacts) {
    if (!contact.name) throw new Error("Contact name is required for every partner contact.");
    if (!isEmail(contact.email)) throw new Error("Enter a valid contact email for every partner contact.");
    if (!contact.phone) throw new Error("Contact phone is required for every partner contact.");
    if (seenEmails.has(contact.email)) throw new Error("Each partner contact email must be unique.");
    seenEmails.add(contact.email);
  }

  const existingRows = await registrants(env, "partner", { includeManualPartners: true });
  const records = [];
  for (const contact of contacts) {
    const existingManual = existingRows.find((row) =>
      row.manualPartner === true && cleanString(row.email).toLowerCase() === contact.email
    );
    const id = cleanString(existingManual?.id) || `manual-partner-${now.replace(/[^0-9]/g, "")}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const key = cleanString(existingManual?.key) || `${registrantTypes.partner.crmPrefix}${now}:${id}`;
    const existing = existingManual?.key ? await readRawRecord(env, existingManual.key) : null;
    const record = {
      ...(existing || {}),
      id,
      name: contact.name,
      company,
      partnerCompany: company,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      partnerTier: cleanString(payload.partnerTier, 120) || cleanString(existing?.partnerTier, 120) || "Partner Candidate",
      phoneVerificationStatus: cleanString(existing?.phoneVerificationStatus) || "manual",
      crmType: registrantTypes.partner.crmType,
      crmStatus,
      crmNotes: cleanString(payload.crmNotes || payload.notes),
      crmUpdatedAt: now,
      crmUpdatedBy: actor || "crm",
      createdAt: cleanString(existing?.createdAt) || now,
      updatedAt: now,
      manualPartner: true,
      source: "manual-partner"
    };

    await writeSetupJson(env, key, record);
    await upsertManualPartnerMatrixProspect(env, normalizeRecord(key, record), actor);
    await upsertPartnerContactProfile(env, record, actor);
    records.push(normalizeRecord(key, record));
  }

  return records;
}

function contactEventIdentity(event = {}) {
  return cleanString(
    event.registrationId ||
      event.eventId ||
      event.eventSlug ||
      event.eventName ||
      event.inviteCode ||
      event.registeredAt ||
      event.id
  ).toLowerCase();
}

function contactEventMatches(event = {}, target = {}) {
  const leftShow = eventShowKey(event);
  const rightShow = eventShowKey(target);
  const showCompatible = !leftShow || !rightShow || leftShow === rightShow;
  const directFields = ["registrationId", "eventId", "eventSlug", "inviteCode", "registeredAt", "id"];
  for (const field of directFields) {
    const left = cleanString(event[field]).toLowerCase();
    const right = cleanString(target[field]).toLowerCase();
    if (["registrationId", "inviteCode"].includes(field) && left && right && left === right) return true;
    if (left && right && left === right && showCompatible) return true;
  }

  const leftIdentity = contactEventIdentity(event);
  const rightIdentity = contactEventIdentity(target);
  if (leftIdentity && rightIdentity && leftIdentity === rightIdentity && showCompatible) return true;

  const leftName = cleanString(event.eventName).toLowerCase();
  const rightName = cleanString(target.eventName).toLowerCase();
  const leftDate = cleanString(event.eventDate).toLowerCase();
  const rightDate = cleanString(target.eventDate).toLowerCase();
  return Boolean(showCompatible && leftName && rightName && leftName === rightName && (!rightDate || leftDate === rightDate));
}

async function syncRegistrationAttendance(env, email, targetEvent, attended, actor = "", now = "") {
  for (const type of ["guest", "member", "partner"]) {
    const config = registrantTypes[type];
    const keys = [...new Set([
      ...(await listKeys(env, config.crmPrefix)),
      ...(await listKeys(env, config.legacyPrefix))
    ])];

    for (const key of keys) {
      const record = await readRawRecord(env, key);
      if (!record || cleanString(record.email).toLowerCase() !== email) continue;
      if (!contactEventMatches(record, targetEvent)) continue;

      await writeSetupJson(env, key, {
        ...record,
        attended,
        attendanceStatus: attended ? "attended" : "not_attended",
        attendedAt: attended ? (cleanString(record.attendedAt) || now) : "",
        attendanceUpdatedAt: now,
        attendanceUpdatedBy: actor || "crm"
      });
    }
  }
}

async function syncContactEventAttendance(env, email, targetEvent, attended, actor = "", now = "") {
  const normalizedEmail = cleanString(email).toLowerCase();
  if (!isEmail(normalizedEmail)) return;
  const key = `${registrantTypes.contacts.crmPrefix}${normalizedEmail}`;
  const existing = await readRawRecord(env, key);
  if (!existing || !Array.isArray(existing.events)) return;

  let matched = false;
  const nextEvents = existing.events.map((event) => {
    if (!contactEventMatches(event, targetEvent)) return event;
    matched = true;
    return {
      ...event,
      attended,
      attendanceStatus: attended ? "attended" : "not_attended",
      attendedAt: attended ? (cleanString(event.attendedAt) || now) : "",
      attendanceUpdatedAt: now,
      attendanceUpdatedBy: actor || "crm"
    };
  });
  if (!matched) return;

  await writeSetupJson(env, key, {
    ...existing,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });
}

async function updateContactEventAttendance(env, payload = {}, actor = "") {
  const requestedKey = cleanString(payload.key || payload.contactKey);
  const email = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Contact email is required before updating attendance.");

  const key = `${registrantTypes.contacts.crmPrefix}${email}`;
  const existing = await readRawRecord(env, key);

  const targetEvent = {
    id: cleanString(payload.eventKey || payload.id),
    eventId: cleanString(payload.eventId),
    eventSlug: cleanString(payload.eventSlug),
    eventName: cleanString(payload.eventName),
    eventDate: cleanString(payload.eventDate),
    eventTime: cleanString(payload.eventTime),
    eventShowId: cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, ""),
    eventShowLabel: cleanString(payload.eventShowLabel),
    eventShowTime: cleanString(payload.eventShowTime),
    inviteCode: cleanString(payload.inviteCode),
    registrationId: cleanString(payload.registrationId),
    registeredAt: cleanString(payload.registeredAt)
  };
  if (!contactEventIdentity(targetEvent)) throw new Error("Event is required before updating attendance.");

  const events = Array.isArray(existing?.events) ? existing.events : [targetEvent];
  let matched = false;
  const attended = payload.attended === true;
  const now = new Date().toISOString();
  const nextEvents = events.map((event) => {
    if (!contactEventMatches(event, targetEvent)) return event;
    matched = true;
    return {
      ...event,
      attended,
      attendanceStatus: attended ? "attended" : "not_attended",
      attendedAt: attended ? (cleanString(event.attendedAt) || now) : "",
      attendanceUpdatedAt: now,
      attendanceUpdatedBy: actor || "crm"
    };
  });

  if (!matched) throw new Error("Contact event was not found.");

  await writeSetupJson(env, key, {
    ...(existing || {}),
    id: email,
    email,
    name: cleanString(existing?.name) || email,
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });

  await syncRegistrationAttendance(env, email, targetEvent, attended, actor, now);
}

async function updateRegistrantEventAttendance(env, payload = {}, actor = "") {
  const type = cleanType(payload.type);
  if (type === "contacts") throw new Error("Use Guest Registration to update event attendance.");
  const key = cleanString(payload.key);
  if (!key) throw new Error("Registration key is required before updating attendance.");

  const rows = await registrants(env, type);
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error(`${registrantTypes[type].label} registrant was not found.`);

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
  const targetEvent = {
    id: cleanString(payload.eventKey || payload.id || row.id),
    eventId: cleanString(payload.eventId || row.eventId),
    eventSlug: cleanString(payload.eventSlug || row.eventSlug),
    eventName: cleanString(payload.eventName || row.eventName),
    eventDate: cleanString(payload.eventDate || row.eventDate),
    eventTime: cleanString(payload.eventTime || row.eventTime),
    eventShowId: cleanEventShowId(payload.eventShowId || row.eventShowId || row.showId || row.eventShow, ""),
    eventShowLabel: cleanString(payload.eventShowLabel || row.eventShowLabel),
    eventShowTime: cleanString(payload.eventShowTime || row.eventShowTime || row.eventTime),
    inviteCode: cleanString(payload.inviteCode || row.inviteCode),
    registrationId: cleanString(payload.registrationId || row.id),
    registeredAt: cleanString(payload.registeredAt || row.createdAt)
  };
  if (!contactEventIdentity(targetEvent)) throw new Error("Event is required before updating attendance.");

  const attended = payload.attended === true;
  const now = new Date().toISOString();
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes[type].crmType,
    attended,
    attendanceStatus: attended ? "attended" : "not_attended",
    attendedAt: attended ? (cleanString(crmRow.attendedAt) || now) : "",
    attendanceUpdatedAt: now,
    attendanceUpdatedBy: actor || "crm",
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  };

  await writeSetupJson(env, crmKey, next);
  await syncContactEventAttendance(env, cleanString(next.email || row.email).toLowerCase(), targetEvent, attended, actor, now);
}

function contactStorageTarget(payload = {}) {
  const requestedKey = cleanString(payload.key || payload.contactKey);
  const requestedEmail = cleanString(
    payload.email ||
      (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)
        ? requestedKey.replace(registrantTypes.contacts.crmPrefix, "")
        : requestedKey)
  ).toLowerCase();

  if (isEmail(requestedEmail)) {
    return {
      key: `${registrantTypes.contacts.crmPrefix}${requestedEmail}`,
      email: requestedEmail,
      identity: requestedEmail
    };
  }

  if (requestedKey.startsWith(registrantTypes.contacts.crmPrefix)) {
    const identity = cleanString(requestedKey.replace(registrantTypes.contacts.crmPrefix, ""));
    return {
      key: requestedKey,
      email: "",
      identity
    };
  }

  throw new Error("Contact key or email is required before updating role.");
}

function contactRecordIdFromIdentity(identity = "") {
  const normalized = cleanString(identity);
  if (!normalized.startsWith("pending:")) return normalized;
  const pendingId = normalized.split(":").slice(2).join(":");
  return pendingId || normalized;
}

async function updateContactEventRole(env, payload = {}, actor = "") {
  const targetContact = contactStorageTarget(payload);
  const existing = await readRawRecord(env, targetContact.key);
  const targetEvent = {
    id: cleanString(payload.eventKey || payload.id),
    eventId: cleanString(payload.eventId),
    eventSlug: cleanString(payload.eventSlug),
    eventName: cleanString(payload.eventName),
    eventDate: cleanString(payload.eventDate),
    eventTime: cleanString(payload.eventTime),
    eventShowId: cleanEventShowId(payload.eventShowId || payload.showId || payload.eventShow, ""),
    eventShowLabel: cleanString(payload.eventShowLabel),
    eventShowTime: cleanString(payload.eventShowTime),
    inviteCode: cleanString(payload.inviteCode),
    registrationId: cleanString(payload.registrationId),
    registeredAt: cleanString(payload.registeredAt)
  };
  if (!contactEventIdentity(targetEvent)) throw new Error("Event is required before updating role.");

  const contactEventRole = cleanContactEventRole(payload.role || payload.contactEventRole || payload.registrationRole);
  const roleUpdate = {
    contactEventRole,
    registrationRole: contactEventRole,
    guestRegistrationType: cleanGuestRegistrationType(contactEventRole),
    partnerRegistrationType: contactEventRole.includes("partner") ? contactEventRole : cleanOptionalRegistrationType(existing?.partnerRegistrationType),
    role: contactEventRoleLabel(contactEventRole),
    strategicRole: contactEventStrategicRole(contactEventRole)
  };
  const now = new Date().toISOString();
  const events = Array.isArray(existing?.events) && existing.events.length ? existing.events : [targetEvent];
  let matched = false;
  const nextEvents = events.map((event) => {
    if (!contactEventMatches(event, targetEvent)) return event;
    matched = true;
    return {
      ...event,
      ...targetEvent,
      ...roleUpdate,
      roleUpdatedAt: now,
      roleUpdatedBy: actor || "crm"
    };
  });

  if (!matched) {
    nextEvents.unshift({
      ...targetEvent,
      ...roleUpdate,
      roleUpdatedAt: now,
      roleUpdatedBy: actor || "crm"
    });
  }

  const existingName = cleanString(existing?.name);
  await writeSetupJson(env, targetContact.key, {
    ...(existing || {}),
    id: cleanString(existing?.id) || targetContact.email || contactRecordIdFromIdentity(targetContact.identity) || targetContact.key,
    email: targetContact.email || cleanString(existing?.email).toLowerCase(),
    name: existingName && existingName !== "Name not recorded" ? existingName : targetContact.email || "",
    source: cleanString(existing?.source) || "crm-contact-overlay",
    createdAt: cleanString(existing?.createdAt) || now,
    events: nextEvents,
    updatedAt: now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor || "crm"
  });
}

function companySlug(value) {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function grantAccessGroupEmail(env, groupId, email, actor = "") {
  const normalizedEmail = cleanString(email).toLowerCase();
  if (!normalizedEmail) return;

  const config = await readAccessConfig(env);
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const target = groups.find((group) => group.id === groupId) || {
    id: groupId,
    label: groupId === "partners" ? "Partners" : groupId,
    summary: "",
    emails: []
  };
  const nextEmails = [...new Set([...(target.emails || []), normalizedEmail])].sort();
  const nextTarget = { ...target, emails: nextEmails };
  const nextGroups = groups.some((group) => group.id === groupId)
    ? groups.map((group) => group.id === groupId ? nextTarget : group)
    : [...groups, nextTarget];

  await writeAccessConfig(env, { ...config, groups: nextGroups }, actor);
}

async function upsertPartnerContactProfile(env, row, actor = "") {
  const email = cleanString(row.email).toLowerCase();
  const company = cleanString(row.partnerCompany || row.company, 240);
  const slug = companySlug(company);
  if (!email || !company || !slug) return null;

  const now = new Date().toISOString();
  const companyKey = `partner-company:${slug}`;
  if (row.manualPartner === true) {
    const contactKey = `crm:contact:${email}`;
    const crmCompanyKey = `crm:company:${slug}`;
    const profileContact = {
      id: email,
      email,
      name: cleanString(row.name) || email,
      company,
      companySlug: slug,
      companyKey: crmCompanyKey,
      profileKey: companyKey,
      title: cleanString(row.title),
      phone: cleanString(row.phone),
      companyLogoUrl: cleanString(row.companyLogoUrl || row.partnerCompanyLogoUrl || row.logoUrl, 500),
      companyLogoKey: safeObjectKey(row.companyLogoKey || row.partnerCompanyLogoKey || row.logoKey),
      companyLogoOriginalName: cleanString(row.companyLogoOriginalName || row.partnerCompanyLogoOriginalName),
      companyLogoUploadedAt: cleanString(row.companyLogoUploadedAt || row.partnerCompanyLogoUploadedAt),
      partnerProductTypes: cleanString(row.partnerProductTypes, 2000),
      partnerClientMessaging: cleanString(row.partnerClientMessaging, 4000),
      partnerLinkedInPromotionText: cleanString(row.partnerLinkedInPromotionText || row.partnerPromotionText || row.partnerHypeText, 4000),
      registrationId: cleanString(row.id),
      registrationType: "partner",
      source: "Partner CRM",
      crmNotes: cleanString(row.crmNotes),
      crmStatus: cleanString(row.crmStatus),
      updatedAt: now,
      updatedBy: actor || "crm"
    };
    const existingContact = await readSetupJson(env, contactKey);
    await writeSetupJson(env, contactKey, {
      ...(existingContact || {}),
      ...profileContact,
      createdAt: cleanString(existingContact?.createdAt) || cleanString(row.createdAt) || now,
      events: Array.isArray(existingContact?.events) ? existingContact.events : []
    });

    const existingCompany = await readSetupJson(env, companyKey);
    const contacts = Array.isArray(existingCompany?.contacts) ? existingCompany.contacts : [];
    const contactMap = new Map(contacts.map((entry) => [
      cleanString(entry?.email).toLowerCase() || cleanString(entry?.name),
      entry
    ]));
    contactMap.set(email, {
      ...(contactMap.get(email) || {}),
      ...profileContact
    });
    await writeSetupJson(env, companyKey, {
      ...(existingCompany || {}),
      organizationName: cleanString(existingCompany?.organizationName || existingCompany?.company || company),
      company,
      companySlug: slug,
      companyLogoUrl: cleanString(row.companyLogoUrl || row.partnerCompanyLogoUrl || row.logoUrl || existingCompany?.companyLogoUrl, 500),
      companyLogoKey: safeObjectKey(row.companyLogoKey || row.partnerCompanyLogoKey || row.logoKey || existingCompany?.companyLogoKey),
      companyLogoOriginalName: cleanString(row.companyLogoOriginalName || row.partnerCompanyLogoOriginalName || existingCompany?.companyLogoOriginalName),
      companyLogoUploadedAt: cleanString(row.companyLogoUploadedAt || row.partnerCompanyLogoUploadedAt || existingCompany?.companyLogoUploadedAt),
      tier: cleanString(row.partnerTier || existingCompany?.tier, 120),
      partnerLinkedInPromotionText: cleanString(row.partnerLinkedInPromotionText || row.partnerPromotionText || row.partnerHypeText || existingCompany?.partnerLinkedInPromotionText, 4000),
      status: cleanString(row.crmStatus || existingCompany?.status, 80) || "new",
      crmNotes: cleanString(row.crmNotes || existingCompany?.crmNotes),
      contacts: [...contactMap.values()],
      updatedAt: now,
      updatedBy: actor || "crm"
    });
    return { contactId: email, contactKey, companyKey: crmCompanyKey, profileKey: companyKey };
  }

  const refs = await upsertRegistrationContact(env, "partner", {
    ...row,
    company,
    partnerCompany: company,
    createdAt: row.createdAt || now,
    source: "Partner CRM"
  }, {
    label: "partner",
    source: "Partner CRM",
    updatedBy: actor || "crm"
  });

  const existingCompany = await readSetupJson(env, companyKey);
  const companyRecord = {
    ...(existingCompany || {}),
    organizationName: cleanString(existingCompany?.organizationName || company, 240),
    company,
    companySlug: slug,
    companyLogoUrl: cleanString(row.companyLogoUrl || row.partnerCompanyLogoUrl || row.logoUrl || existingCompany?.companyLogoUrl, 500),
    companyLogoKey: safeObjectKey(row.companyLogoKey || row.partnerCompanyLogoKey || row.logoKey || existingCompany?.companyLogoKey),
    companyLogoOriginalName: cleanString(row.companyLogoOriginalName || row.partnerCompanyLogoOriginalName || existingCompany?.companyLogoOriginalName),
    companyLogoUploadedAt: cleanString(row.companyLogoUploadedAt || row.partnerCompanyLogoUploadedAt || existingCompany?.companyLogoUploadedAt),
    tier: cleanString(row.partnerTier || existingCompany?.tier, 120),
    updatedAt: now,
    updatedBy: actor || "crm"
  };

  await writeSetupJson(env, companyKey, companyRecord);
  return { ...refs, companyKey };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  if (url.searchParams.has("photo")) return serveContactPhoto(request, env);

  const access = requireCrmAccess(data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE && !crmD1Available(env)) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  if (url.searchParams.get("debug") === "registration") {
    return json(await registrationDiagnostics(env));
  }

  if (url.searchParams.has("prospecting")) {
    return json(await partnerProspectingPayload(env));
  }

  const type = cleanType(url.searchParams.get("type"));
  const config = registrantTypes[type];
  const isContacts = type === "contacts";
  const matrixMode = cleanString(url.searchParams.get("matrix")).toLowerCase();
  const includeSideList = (name) => ["1", "true", "yes"].includes(cleanString(url.searchParams.get(name)).toLowerCase());
  if (matrixMode === "guest") {
    const registrationInviteRows = await registrationInviteCodes(env);
    const guestProspectRows = await guestMatrixProspects(env);
    return json({
      ok: true,
      type,
      label: config.label,
      section: config.section,
      summary: { total: registrationInviteRows.length + guestProspectRows.length },
      rows: [],
      partnerInviteCodes: [],
      registrationInviteCodes: registrationInviteRows,
      guestMatrixProspects: guestProspectRows,
      partnerMatrixProspects: [],
      upcomingEvents: await upcomingEvents(env)
    });
  }
  if (matrixMode === "partner") {
    const partnerInviteRows = await partnerInviteCodes(env);
    const partnerProspectRows = await partnerMatrixProspects(env);
    const manualPartnerRows = includeSideList("includeManualPartners")
      ? (await registrants(env, "partner", { includeManualPartners: true })).filter((row) => row.manualPartner === true)
      : [];
    return json({
      ok: true,
      type,
      label: config.label,
      section: config.section,
      summary: { total: partnerInviteRows.length + partnerProspectRows.length },
      rows: manualPartnerRows,
      partnerInviteCodes: partnerInviteRows,
      registrationInviteCodes: [],
      guestMatrixProspects: [],
      partnerMatrixProspects: partnerProspectRows,
      upcomingEvents: await upcomingEvents(env)
    });
  }
  const partnerRegistrationLinksOnly = type === "partner" && url.searchParams.get("registrationLinks") === "1";
  const includeManualPartners = type === "partner" && url.searchParams.get("includeManualPartners") === "1";
  const rows = isContacts
    ? await contacts(env)
    : partnerRegistrationLinksOnly
      ? await partnerRegistrationLinkRows(env)
      : type === "guest"
        ? await guestRegistrationRows(env)
      : await registrants(env, type, { includeManualPartners });

  if (url.searchParams.get("download") === "csv") {
    const headings = isContacts
      ? [
        "Contact ID",
        "First Name",
        "Last Name",
        "Name",
        "Company",
        "Title",
        "Photo URL",
        "Bio",
        "Executive Function",
        "Email",
        "Phone",
        "Industry",
        "Company Size",
        "Organization Type",
        "City",
        "State / Country",
        "Time Zone",
        "Invitation Source",
        "Invited By",
        "Relationship Owner",
        "Lifecycle Stage",
        "Last Contact Date",
        "Next Action",
        "Next Action Due Date",
        "Email Permission",
        "Topic Interests",
        "Partner Products Sold",
        "Partner Client Messaging",
        "Partner LinkedIn Promotion Text",
        "Last Updated",
        "Latest Registration",
        "Latest Event",
        "Latest Event Date",
        "Events",
        "Attended",
        "Source"
      ]
      : [
        "Registered At",
        "Status",
        "Registration Type",
        "Name",
        "Company",
        "Title",
        "Industry",
        "City",
        "State / Country",
        "Email",
        "Phone",
        "Brief Photo URL",
        "Invite Code",
        "Event",
        "Event Date",
        "Partner Tier",
        "Partner Products Sold",
        "Partner Client Messaging",
        "Partner LinkedIn Promotion Text",
        "Phone Verification",
        "Presenter",
        "Round Table Leader",
        "Featured Guest",
        "Featured Member",
        "Publication Use Name",
        "Publication Use Company",
        "CRM Notes"
      ];
    const csvRows = isContacts
      ? rows.map((row) => [
        row.id,
        row.firstName,
        row.lastName,
        row.name,
        row.company,
        row.title,
        row.photoUrl,
        row.bio,
        row.executiveFunction,
        row.email,
        row.phone,
        row.industry,
        row.companySize,
        row.organizationType,
        row.city,
        row.stateCountry || row.state || row.country,
        row.timeZone,
        row.invitationSource,
        row.invitedBy,
        row.relationshipOwner,
        row.lifecycleStage,
        row.lastContactDate,
        row.nextAction,
        row.nextActionDueDate,
        row.emailPermission,
        (row.topicInterests || []).join("; "),
        row.partnerProductTypes,
        row.partnerClientMessaging,
        row.partnerLinkedInPromotionText,
        row.updatedAt,
        row.latestRegisteredAt,
        row.latestEventName,
        row.latestEventDate,
        row.eventCount,
        row.attendedCount,
        row.source
      ])
      : rows.map((row) => [
        row.createdAt,
        row.crmStatus,
        config.label,
        row.name,
        row.company,
        row.title,
        row.industry,
        row.city,
        row.stateCountry || row.state || row.country,
        row.email,
        row.phone,
        row.photoUrl,
        row.inviteCode,
        row.eventName,
        row.eventDate,
        row.partnerTier,
        row.partnerProductTypes,
        row.partnerClientMessaging,
        row.partnerLinkedInPromotionText,
        row.phoneVerificationStatus,
        row.isPresenter ? "Yes" : "No",
        row.isRoundtableLeader ? "Yes" : "No",
        row.isFeaturedGuest ? "Yes" : "No",
        row.isFeaturedMember ? "Yes" : "No",
        row.publicationUseName ? "Yes" : "No",
        row.publicationUseCompany ? "Yes" : "No",
        row.crmNotes
      ]);
    const csv = [headings, ...csvRows]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${config.csvFilename}"`
      }
    });
  }

  return json({
    ok: true,
    type,
    label: config.label,
    section: config.section,
    summary: isContacts ? summarizeContacts(rows) : summarize(rows),
    rows,
    partnerInviteCodes: includeSideList("includePartnerInvites") ? await partnerInviteCodes(env) : [],
    registrationInviteCodes: includeSideList("includeRegistrationInvites") ? await registrationInviteCodes(env) : [],
    guestMatrixProspects: includeSideList("includeGuestMatrixProspects") ? await guestMatrixProspects(env) : [],
    partnerMatrixProspects: includeSideList("includePartnerMatrixProspects") ? await partnerMatrixProspects(env) : [],
    upcomingEvents: includeSideList("includeUpcomingEvents") ? await upcomingEvents(env) : []
  });
}

async function createMemberPassword(env, payload = {}, actor = "") {
  const key = cleanString(payload?.key);
  const rows = await registrants(env, "member");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Member registrant was not found.");
  if (!row.email) throw new Error("Member registrant needs an email before a password can be generated.");

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, "member");
  const password = cleanString(payload?.password, 120) || randomMemberPassword();
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const existingUser = await getUserByEmail(env, crmRow.email);
  const authPayload = {
    name: crmRow.name || crmRow.email,
    email: crmRow.email,
    password,
    role: "member",
    status: "active"
  };

  if (existingUser) {
    await updateUser(env, crmRow.email, authPayload, actor);
  } else {
    await createUser(env, authPayload, actor);
  }

  const now = new Date().toISOString();
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes.member.crmType,
    crmStatus: "accepted",
    memberStatus: "accepted",
    memberTier: cleanString(payload?.memberTier, 120) || crmRow.memberTier || "Fellow",
    memberPassword: password,
    memberPasswordGeneratedAt: now,
    memberPasswordGeneratedBy: actor,
    acceptedAt: crmRow.acceptedAt || now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor
  };

  await writeSetupJson(env, crmKey, next);
  return {
    record: normalizeRecord(crmKey, next),
    password
  };
}

async function createPartnerPassword(env, payload = {}, actor = "") {
  const key = cleanString(payload?.key);
  const rows = await registrants(env, "partner");
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) throw new Error("Partner registrant was not found.");
  if (!row.email) throw new Error("Partner registrant needs an email before a password can be generated.");

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, "partner");
  const password = cleanString(payload?.password, 120) || randomMemberPassword();
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const existingUser = await getUserByEmail(env, crmRow.email);
  const authPayload = {
    name: crmRow.name || crmRow.email,
    email: crmRow.email,
    password,
    role: "member",
    status: "active"
  };

  if (existingUser) {
    await updateUser(env, crmRow.email, authPayload, actor);
  } else {
    await createUser(env, authPayload, actor);
  }

  await grantAccessGroupEmail(env, "partners", crmRow.email, actor);
  await upsertPartnerContactProfile(env, crmRow, actor);

  const now = new Date().toISOString();
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes.partner.crmType,
    crmStatus: "accepted",
    partnerPassword: password,
    partnerPasswordGeneratedAt: now,
    partnerPasswordGeneratedBy: actor,
    acceptedAt: crmRow.acceptedAt || now,
    crmUpdatedAt: now,
    crmUpdatedBy: actor
  };

  await writeSetupJson(env, crmKey, next);
  return {
    record: normalizeRecord(crmKey, next),
    password
  };
}

export async function onRequestPost({ request, env, data }) {
  const access = requireCrmAccess(data);
  if (access.response) return access.response;

  if (!env.MOJO_SUMMITS_SETUP_STATE && !crmD1Available(env)) {
    return json({ error: "CRM storage is not configured." }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return json({ error: "Expected form data." }, { status: 400 });
    if (form.get("action") === "upload-contact-photo") {
      try {
        return uploadContactPhoto(request, env, form, access.email);
      } catch (error) {
        return json({ error: error.message || "Contact photo could not be uploaded." }, { status: 500 });
      }
    }
    return json({ error: "Unsupported CRM upload action." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  if (payload?.action === "backfill-crm-d1") {
    try {
      return json(await backfillCrmD1(env, payload));
    } catch (error) {
      return json(
        {
          error: error.message || "CRM D1 backfill could not run.",
          allowedPrefixes: error.allowedPrefixes || undefined
        },
        { status: error.status || 500 }
      );
    }
  }

  if (payload?.action === "save-partner-prospect-company") {
    try {
      const company = await saveProspectCompany(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        company
      }, { status: 201 });
    } catch (error) {
      const status = /required|not found/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect company could not be saved." }, { status });
    }
  }

  if (payload?.action === "save-partner-prospect-person") {
    try {
      const person = await saveProspectPerson(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        person
      }, { status: 201 });
    } catch (error) {
      const status = /required|not found/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect person could not be saved." }, { status });
    }
  }

  if (payload?.action === "run-partner-prospect-discovery") {
    try {
      const discovery = await runSourceDiscovery(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discovery
      }, { status: 201 });
    } catch (error) {
      const status = /required|Fetch failed|HTML/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect discovery could not run." }, { status });
    }
  }

  if (payload?.action === "import-partner-prospect-companies") {
    try {
      const imported = await importProspectCompanies(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        imported
      }, { status: 201 });
    } catch (error) {
      const status = /Paste at least|required/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect companies could not be imported." }, { status });
    }
  }

  if (payload?.action === "rerun-partner-prospect-source") {
    try {
      const discovery = await rerunProspectSource(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discovery
      });
    } catch (error) {
      const status = /not found|required|Fetch failed|HTML/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Discovery source could not be rerun." }, { status });
    }
  }

  if (payload?.action === "run-all-partner-prospect-sources") {
    try {
      const discoveryBatch = await runAllProspectSources(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discoveryBatch
      });
    } catch (error) {
      return json({ error: error.message || "Discovery sources could not be run." }, { status: 500 });
    }
  }

  if (payload?.action === "run-partner-prospect-starter-source") {
    try {
      const discovery = await runStarterProspectSource(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discovery
      });
    } catch (error) {
      const status = /not found|required|Fetch failed|HTML/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Starter discovery source could not be run." }, { status });
    }
  }

  if (payload?.action === "run-partner-prospect-starter-sources") {
    try {
      const discoveryBatch = await runStarterProspectSources(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discoveryBatch
      });
    } catch (error) {
      return json({ error: error.message || "Starter discovery sources could not be run." }, { status: 500 });
    }
  }

  if (payload?.action === "run-partner-prospect-emerging-sources") {
    try {
      const discoveryBatch = await runEmergingProspectSources(env, payload, access.email);
      return json({
        ok: true,
        type: "partner-prospecting",
        refreshRequired: true,
        discoveryBatch
      });
    } catch (error) {
      return json({ error: error.message || "Emerging 10-100 discovery sources could not be run." }, { status: 500 });
    }
  }

  if (payload?.action === "analyze-partner-prospect-website") {
    try {
      const company = await analyzeProspectWebsite(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        company
      });
    } catch (error) {
      const status = /required|not found|Fetch failed|HTML/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect website could not be analyzed." }, { status });
    }
  }

  if (payload?.action === "batch-analyze-partner-prospect-websites") {
    try {
      const batch = await batchAnalyzeProspectWebsites(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        batch
      });
    } catch (error) {
      return json({ error: error.message || "Partner prospect websites could not be batch analyzed." }, { status: 500 });
    }
  }

  if (payload?.action === "review-partner-prospect-company") {
    try {
      const company = await reviewProspectCompany(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        company
      });
    } catch (error) {
      const status = /required|not found/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect review could not be saved." }, { status });
    }
  }

  if (payload?.action === "save-partner-score-config") {
    try {
      const scoreConfig = await savePartnerScoreConfig(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        scoreConfig
      });
    } catch (error) {
      return json({ error: error.message || "Partner scoring config could not be saved." }, { status: 500 });
    }
  }

  if (payload?.action === "save-partner-people-search-mission") {
    try {
      const company = await saveProspectPeopleSearchMission(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        company
      });
    } catch (error) {
      const status = /required|not found/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "People search mission could not be saved." }, { status });
    }
  }

  if (payload?.action === "record-partner-prospect-outreach") {
    try {
      const person = await recordProspectOutreach(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        person
      });
    } catch (error) {
      const status = /not found|unsupported/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Partner prospect outreach could not be recorded." }, { status });
    }
  }

  if (payload?.action === "retry-partner-prospect-stage") {
    try {
      await retryProspectStage(env, payload, access.email);
      return json(await partnerProspectingPayload(env));
    } catch (error) {
      const status = /not found/i.test(error.message || "") ? 404 : 500;
      return json({ error: error.message || "Partner prospect stage could not be retried." }, { status });
    }
  }

  if (payload?.action === "convert-partner-prospect") {
    try {
      const converted = await convertProspectCompany(env, payload, access.email);
      return json({
        ...(await partnerProspectingPayload(env)),
        converted
      });
    } catch (error) {
      const status = /not found/i.test(error.message || "") ? 404 : 500;
      return json({ error: error.message || "Partner prospect could not be converted." }, { status });
    }
  }

  if (payload?.action === "generate-member-password") {
    try {
      const result = await createMemberPassword(env, payload, access.email);
      const rows = await registrants(env, "member");
      return json({
        ok: true,
        type: "member",
        label: registrantTypes.member.label,
        summary: summarize(rows),
        rows,
        password: result.password,
        record: result.record,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Member password could not be generated." }, { status: 500 });
    }
  }

  if (payload?.action === "generate-partner-password") {
    try {
      const result = await createPartnerPassword(env, payload, access.email);
      const rows = await registrants(env, "partner");
      return json({
        ok: true,
        type: "partner",
        label: registrantTypes.partner.label,
        summary: summarize(rows),
        rows,
        password: result.password,
        record: result.record,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner password could not be generated." }, { status: 500 });
    }
  }

  if (payload?.action === "create-partner-invite") {
    try {
      const sendEmail = cleanBoolean(payload.sendEmail);
      if (sendEmail && !isEmail(payload.partnerContactEmail || payload.partnerEmail || payload.invitedEmail || payload.email)) {
        throw new Error("Enter a valid partner email address before sending the invitation.");
      }
      const invite = await createPartnerInviteCode(env, payload, access.email);
      let emailSent = null;
      let emailCc = [];
      let emailMessageId = "";
      if (sendEmail) {
        const origin = new URL(request.url).origin;
        const subject = `Partner Invite: ${invite.eventName || "Mojo AI Summits"}`;
        await logGuestRegistrationEmail(env, {
          type: "partner-registration-invitation",
          status: "attempted",
          to: invite.partnerContactEmail,
          cc: partnerInviteEmailCc,
          subject,
          inviteKey: invite.key,
          inviteCode: invite.code,
          eventSlug: invite.eventSlug,
          eventName: invite.eventName,
          actor: access.email
        });
        try {
          const result = await sendPartnerInviteInvitationEmail(env, invite, origin);
          emailSent = result.sentTo;
          emailCc = result.cc || [];
          emailMessageId = result.messageId || "";
          await logGuestRegistrationEmail(env, {
            type: "partner-registration-invitation",
            status: "sent",
            to: emailSent,
            cc: emailCc,
            subject,
            inviteKey: invite.key,
            inviteCode: invite.code,
            eventSlug: invite.eventSlug,
            eventName: invite.eventName,
            actor: access.email,
            messageId: emailMessageId
          });
        } catch (error) {
          await logGuestRegistrationEmail(env, {
            type: "partner-registration-invitation",
            status: "failed",
            to: invite.partnerContactEmail,
            cc: partnerInviteEmailCc,
            subject,
            inviteKey: invite.key,
            inviteCode: invite.code,
            eventSlug: invite.eventSlug,
            eventName: invite.eventName,
            actor: access.email,
            error: error.message || "Partner invitation email failed."
          });
          throw error;
        }
      }
      return json({
        ok: true,
        invite,
        emailSent,
        emailCc,
        emailMessageId,
        partnerInviteCodes: [invite],
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Partner invite code could not be created." }, { status: 500 });
    }
  }

  if (payload?.action === "create-registration-invite") {
    try {
      const sendEmail = cleanBoolean(payload.sendEmail);
      if (sendEmail && !isEmail(payload.intendedGuestEmail || payload.invitedEmail || payload.guestEmail || payload.email)) {
        throw new Error("Enter a valid email address before sending the invitation.");
      }
      const invite = await createRegistrationInviteCode(env, payload, access.email);
      let emailSent = null;
      let emailCc = [];
      let emailMessageId = "";
      if (sendEmail) {
        const origin = new URL(request.url).origin;
        const inviteEmail = invitePersonEmail(invite);
        await logGuestRegistrationEmail(env, {
          type: "guest-registration-invitation",
          status: "attempted",
          to: inviteEmail,
          cc: guestInviteEmailCc,
          subject: `You’re Invited: ${invite.eventName || "Mojo AI Summits"}`,
          inviteKey: invite.key,
          inviteCode: invite.code,
          eventSlug: invite.eventSlug,
          eventName: invite.eventName,
          actor: access.email
        });
        try {
          const result = await sendInviteInvitationEmail(env, invite, origin);
          emailSent = result.sentTo;
          emailCc = result.cc || [];
          emailMessageId = result.messageId || "";
          await logGuestRegistrationEmail(env, {
            type: "guest-registration-invitation",
            status: "sent",
            to: emailSent,
            cc: emailCc,
            subject: `You’re Invited: ${invite.eventName || "Mojo AI Summits"}`,
            inviteKey: invite.key,
            inviteCode: invite.code,
            eventSlug: invite.eventSlug,
            eventName: invite.eventName,
            actor: access.email,
            messageId: emailMessageId
          });
        } catch (error) {
          await logGuestRegistrationEmail(env, {
            type: "guest-registration-invitation",
            status: "failed",
            to: inviteEmail,
            cc: guestInviteEmailCc,
            subject: `You’re Invited: ${invite.eventName || "Mojo AI Summits"}`,
            inviteKey: invite.key,
            inviteCode: invite.code,
            eventSlug: invite.eventSlug,
            eventName: invite.eventName,
            actor: access.email,
            error: error.message || "Guest invitation email failed."
          });
          throw error;
        }
      }
      return json({
        ok: true,
        invite,
        emailSent,
        emailCc,
        emailMessageId,
        registrationInviteCodes: [invite],
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      return json({ error: error.message || "Registration invite code could not be created." }, { status: 500 });
    }
  }

  if (payload?.action === "create-guest-matrix-prospect") {
    try {
      const prospect = await createGuestMatrixProspect(env, payload, access.email);
      return json({
        ok: true,
        prospect,
        guestMatrixProspects: [prospect],
        partnerMatrixProspects: await partnerMatrixProspects(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      const status = /select an event|name, email|name or email|LinkedIn profile/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Tracked person could not be added." }, { status });
    }
  }

  if (payload?.action === "create-partner-matrix-prospect") {
    try {
      const prospect = await createGuestMatrixProspect(env, payload, access.email, "partner");
      return json({
        ok: true,
        prospect,
        partnerMatrixProspects: [prospect],
        partnerInviteCodes: await partnerInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      const status = /select an event|name, email|name or email|LinkedIn profile/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Tracked partner could not be added." }, { status });
    }
  }

  if (payload?.action === "save-guest-matrix-statuses" || payload?.action === "save-partner-matrix-statuses") {
    try {
      const result = await saveGuestMatrixStatuses(env, payload, access.email);
      return json({
        ok: true,
        ...result,
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Matrix changes could not be saved." }, { status: 500 });
    }
  }

  if (payload?.action === "update-guest-matrix-prospect" || payload?.action === "update-partner-matrix-prospect") {
    try {
      const prospect = await updateGuestMatrixProspect(env, payload, access.email);
      const partnerProspect = prospect.type === "partner-matrix-prospect";
      return json({
        ok: true,
        prospect,
        guestMatrixProspects: partnerProspect ? await guestMatrixProspects(env) : [prospect],
        partnerMatrixProspects: partnerProspect ? [prospect] : await partnerMatrixProspects(env)
      });
    } catch (error) {
      const status = /not found/i.test(error.message || "") ? 404 : 400;
      return json({ error: error.message || "Tracked matrix record could not be updated." }, { status });
    }
  }

  if (payload?.action === "delete-guest-matrix-prospect" || payload?.action === "delete-partner-matrix-prospect") {
    try {
      const deleted = await deleteGuestMatrixProspect(env, payload);
      return json({
        ok: true,
        deleted,
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Tracked person could not be deleted." }, { status: 404 });
    }
  }

  if (payload?.action === "delete-registration-invite" || payload?.action === "delete-partner-invite") {
    try {
      await deleteInviteCode(env, payload);
      return json({
        ok: true,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Invite link could not be deleted." }, { status: 404 });
    }
  }

  if (payload?.action === "update-registration-invite-show") {
    try {
      const invite = await updateRegistrationInviteShow(env, payload, access.email);
      return json({
        ok: true,
        invite,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      const status = /already been used|valid show|featured invite/i.test(error.message || "") ? 400 : 404;
      return json({ error: error.message || "Invite show time could not be updated." }, { status });
    }
  }

  if (payload?.action === "save-partner-registration-link") {
    try {
      const key = cleanString(payload.key, 500);
      if (!key || !key.startsWith(PARTNER_INVITE_PREFIX)) throw new Error("Partner registration link was not found.");
      const existing = await readSetupJson(env, key);
      if (!existing) throw new Error("Partner registration link was not found.");
      const now = new Date().toISOString();
      const next = {
        ...existing,
        crmStatus: cleanAllowed(payload.crmStatus ?? existing.crmStatus, allowedStatuses, existing.crmStatus || "invited"),
        crmNotes: cleanString(payload.crmNotes ?? existing.crmNotes),
        crmUpdatedAt: now,
        crmUpdatedBy: access.email,
        updatedAt: now,
        updatedBy: access.email
      };
      await writeSetupJson(env, key, next);
      await upsertContactFromInviteRecord(env, normalizeInviteCode(key, next), "partner-invite", access.email);
      const rows = await partnerRegistrationLinkRows(env);
      return json({
        ok: true,
        type: "partner",
        label: registrantTypes.partner.label,
        summary: summarize(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Partner registration link could not be updated." }, { status: 500 });
    }
  }

  if (payload?.action === "send-invite-reminder") {
    try {
      const origin = new URL(request.url).origin;
      const invite = await findInviteCodeRecord(env, payload);
      const inviteEmail = invitePersonEmail(invite);
      await logGuestRegistrationEmail(env, {
        type: "guest-registration-reminder",
        status: "attempted",
        to: inviteEmail,
        cc: guestInviteEmailCc,
        subject: `Reminder: complete your registration for ${invite.eventName || "Mojo AI Summits"}`,
        inviteKey: invite.key,
        inviteCode: invite.code,
        eventSlug: invite.eventSlug,
        eventName: invite.eventName,
        actor: access.email
      });
      let result;
      try {
        result = await sendInviteReminderEmail(env, { ...payload, key: invite.key }, origin);
        await logGuestRegistrationEmail(env, {
          type: "guest-registration-reminder",
          status: "sent",
          to: result.sentTo,
          cc: result.cc || [],
          subject: `Reminder: complete your registration for ${invite.eventName || "Mojo AI Summits"}`,
          inviteKey: invite.key,
          inviteCode: invite.code,
          eventSlug: invite.eventSlug,
          eventName: invite.eventName,
          actor: access.email,
          messageId: result.messageId
        });
        const reminderSentAt = new Date().toISOString();
        const existingInvite = await readSetupJson(env, invite.key);
        if (existingInvite) {
          await writeSetupJson(env, invite.key, {
            ...existingInvite,
            registrationRequestStatus: "reminder-sent",
            reminderSentAt,
            updatedAt: reminderSentAt,
            updatedBy: access.email
          });
        }
      } catch (error) {
        await logGuestRegistrationEmail(env, {
          type: "guest-registration-reminder",
          status: "failed",
          to: inviteEmail,
          cc: guestInviteEmailCc,
          subject: `Reminder: complete your registration for ${invite.eventName || "Mojo AI Summits"}`,
          inviteKey: invite.key,
          inviteCode: invite.code,
          eventSlug: invite.eventSlug,
          eventName: invite.eventName,
          actor: access.email,
          error: error.message || "Reminder email failed."
        });
        throw error;
      }
      return json({
        ok: true,
        ...result,
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Reminder email could not be sent." }, { status: 502 });
    }
  }

  if (payload?.action === "create-manual-partner") {
    try {
      const records = await createManualPartner(env, payload, access.email);
      const rows = await registrants(env, "partner", { includeManualPartners: true });
      return json({
        ok: true,
        type: "partner",
        label: registrantTypes.partner.label,
        summary: summarize(rows),
        rows,
        record: records[0],
        records,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        partnerMatrixProspects: await partnerMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: 201 });
    } catch (error) {
      const status = /required|valid contact email|unique|At least one/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Manual partner could not be saved." }, { status });
    }
  }

  if (payload?.action === "delete-contact") {
    try {
      const deleted = await deleteContact(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        deleted,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Contact could not be deleted." }, { status: 500 });
    }
  }

  if (payload?.action === "delete-guest-registrant") {
    try {
      const key = cleanString(payload?.key, 500);
      const deleted = key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX)
        ? await deleteGuestMatrixProspect(env, payload)
        : await deleteGuestRegistrant(env, payload, access.email);
      const rows = await guestRegistrationRows(env);
      return json({
        ok: true,
        type: "guest",
        label: registrantTypes.guest.label,
        summary: summarize(rows),
        rows,
        deleted,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Guest registrant could not be deleted." }, { status: 500 });
    }
  }

  if (payload?.action === "save-contact") {
    try {
      await updateContact(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      const status = /required|already exists|valid email/i.test(error.message || "") ? 400 : 500;
      return json({ error: error.message || "Contact could not be updated." }, { status });
    }
  }

  if (payload?.action === "add-contact-activity") {
    try {
      await addContactActivity(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Contact activity could not be saved." }, { status: 500 });
    }
  }

  if (payload?.action === "update-contact-event-attendance") {
    try {
      await updateContactEventAttendance(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Attendance could not be updated." }, { status: 500 });
    }
  }

  if (payload?.action === "update-registrant-event-attendance") {
    try {
      const type = cleanType(payload.type);
      await updateRegistrantEventAttendance(env, payload, access.email);
      const rows = await registrants(env, type);
      return json({
        ok: true,
        type,
        label: registrantTypes[type].label,
        summary: summarize(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Event attendance could not be updated." }, { status: 500 });
    }
  }

  if (payload?.action === "resend-registration-confirmation") {
    try {
      const type = cleanType(payload.type);
      const key = cleanString(payload.key);
      const rows = type === "guest" ? await guestRegistrationRows(env) : await registrants(env, type);
      const row = rows.find((entry) => entry.key === key || entry.id === key);
      if (!row) return json({ error: `${registrantTypes[type].label} registrant was not found.` }, { status: 404 });

      const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
      const deliveryRow = await registrationWithVirtualEventAccess(env, crmRow);
      if (payload.requireAccess === true && !rowAccessLink(deliveryRow)) {
        return json({ error: "This registration does not have a configured event Zoom/access link yet." }, { status: 409 });
      }
      const confirmationEmail = await sendRegistrationConfirmation(env, type, deliveryRow);
      const now = new Date().toISOString();
      await writeSetupJson(env, crmKey, {
        ...deliveryRow,
        key: undefined,
        crmType: registrantTypes[type].crmType,
        confirmationEmail,
        confirmationResentAt: now,
        crmUpdatedAt: now,
        crmUpdatedBy: access.email
      });

      const nextRows = type === "guest" ? await guestRegistrationRows(env) : await registrants(env, type);
      return json({
        ok: true,
        type,
        label: registrantTypes[type].label,
        confirmationEmail,
        rows: nextRows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Registration confirmation could not be resent." }, { status: 502 });
    }
  }

  if (payload?.action === "resend-registration-confirmations") {
    try {
      const type = cleanType(payload.type);
      const rawKeys = Array.isArray(payload.keys) ? payload.keys.map(cleanString).filter(Boolean) : [];
      const keySet = new Set(rawKeys);
      const eventSlug = cleanString(payload.eventSlug, 240);
      const onlyMissingAccess = payload.onlyMissingAccess !== false;
      const registeredOnly = payload.registeredOnly !== false;
      const requireAccess = payload.requireAccess !== false;
      const limit = Math.min(Math.max(Number(payload.limit) || 50, 1), 100);
      const rows = type === "guest" ? await guestRegistrationRows(env) : await registrants(env, type);
      const candidates = rows.filter((row) => {
        if (keySet.size && !keySet.has(row.key) && !keySet.has(row.id)) return false;
        if (eventSlug && rowEventSlug(row) !== eventSlug) return false;
        if (registeredOnly && !actualRegistrationRow(row, type)) return false;
        if (onlyMissingAccess && rowAccessLink(row) && row.eventAccessHydratedFromVirtualEvent !== true) return false;
        if (requireAccess && !rowAccessLink(row)) return false;
        return cleanString(row.email);
      }).slice(0, limit);

      const results = [];
      for (const row of candidates) {
        try {
          const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
          const deliveryRow = await registrationWithVirtualEventAccess(env, crmRow);
          const confirmationEmail = await sendRegistrationConfirmation(env, type, deliveryRow);
          const now = new Date().toISOString();
          await writeSetupJson(env, crmKey, {
            ...deliveryRow,
            key: undefined,
            crmType: registrantTypes[type].crmType,
            confirmationEmail,
            confirmationResentAt: now,
            crmUpdatedAt: now,
            crmUpdatedBy: access.email
          });
          results.push({
            ok: true,
            key: crmKey,
            id: deliveryRow.id,
            name: deliveryRow.name,
            email: deliveryRow.email,
            zoomAccessAttached: confirmationEmail.zoomAccessAttached === true,
            calendarInviteAttached: confirmationEmail.calendarInviteAttached === true
          });
        } catch (error) {
          results.push({
            ok: false,
            key: row.key,
            id: row.id,
            name: row.name,
            email: row.email,
            error: error.message || "Registration confirmation could not be resent."
          });
        }
      }

      const nextRows = type === "guest" ? await guestRegistrationRows(env) : await registrants(env, type);
      return json({
        ok: results.every((entry) => entry.ok),
        type,
        label: registrantTypes[type].label,
        attempted: results.length,
        sent: results.filter((entry) => entry.ok).length,
        failed: results.filter((entry) => !entry.ok).length,
        results,
        rows: nextRows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      }, { status: results.some((entry) => !entry.ok) ? 207 : 200 });
    } catch (error) {
      return json({ error: error.message || "Registration confirmations could not be resent." }, { status: 502 });
    }
  }

  if (payload?.action === "update-contact-event-role") {
    try {
      await updateContactEventRole(env, payload, access.email);
      const rows = await contacts(env);
      return json({
        ok: true,
        type: "contacts",
        label: registrantTypes.contacts.label,
        summary: summarizeContacts(rows),
        rows,
        partnerInviteCodes: await partnerInviteCodes(env),
        registrationInviteCodes: await registrationInviteCodes(env),
        guestMatrixProspects: await guestMatrixProspects(env),
        upcomingEvents: await upcomingEvents(env)
      });
    } catch (error) {
      return json({ error: error.message || "Contact event role could not be updated." }, { status: 500 });
    }
  }

  const type = cleanType(payload?.type);
  const key = cleanString(payload?.key);
  const rows = type === "guest" ? await guestRegistrationRows(env) : await registrants(env, type);
  const row = rows.find((entry) => entry.key === key || entry.id === key);
  if (!row) return json({ error: `${registrantTypes[type].label} registrant was not found.` }, { status: 404 });

  if (type === "guest" && key.startsWith(GUEST_MATRIX_PROSPECT_PREFIX)) {
    const crmStatus = cleanGuestRegistrationLifecycleStatus(payload?.crmStatus, row.crmStatus || "pending-engagement");
    await updateGuestMatrixProspect(env, {
      key,
      field: "guestStatus",
      value: crmStatus
    }, access.email);
    if (
      Object.prototype.hasOwnProperty.call(payload || {}, "eventNotes") ||
      Object.prototype.hasOwnProperty.call(payload || {}, "registrationNotes")
    ) {
      await updateGuestMatrixProspect(env, {
        key,
        field: "eventNotes",
        value: payload?.eventNotes || payload?.registrationNotes || ""
      }, access.email);
    }
    const nextRows = await guestRegistrationRows(env);
    return json({
      ok: true,
      type,
      label: registrantTypes[type].label,
      summary: summarize(nextRows),
      rows: nextRows,
      partnerInviteCodes: await partnerInviteCodes(env),
      registrationInviteCodes: await registrationInviteCodes(env),
      guestMatrixProspects: await guestMatrixProspects(env),
      upcomingEvents: await upcomingEvents(env)
    });
  }

  const { key: crmKey, row: crmRow } = await ensureCrmRecord(env, row, type);
  const crmStatus = type === "guest"
    ? cleanGuestRegistrationLifecycleStatus(payload?.crmStatus, crmRow.crmStatus || "contacted")
    : allowedStatuses.has(payload?.crmStatus) ? payload.crmStatus : crmRow.crmStatus;
  const partnerEmail = cleanString(payload?.email, 180).toLowerCase();
  if (type === "partner" && partnerEmail && !isEmail(partnerEmail)) {
    return json({ error: "Enter a valid partner email." }, { status: 400 });
  }
  const partnerCompany = cleanString(payload?.partnerCompany || payload?.company, 240);
  const hasEventNotesPayload = Object.prototype.hasOwnProperty.call(payload || {}, "eventNotes") ||
    Object.prototype.hasOwnProperty.call(payload || {}, "registrationNotes");
  const eventNotes = hasEventNotesPayload
    ? cleanString(payload?.eventNotes || payload?.registrationNotes, 4000)
    : cleanEventNotes(crmRow);
  const next = {
    ...crmRow,
    key: undefined,
    crmType: registrantTypes[type].crmType,
    crmStatus,
    name: type === "partner" ? cleanString(payload?.name, 180) || crmRow.name : crmRow.name,
    company: type === "partner" ? partnerCompany || crmRow.company || crmRow.partnerCompany : crmRow.company,
    partnerCompany: type === "partner" ? partnerCompany || crmRow.partnerCompany || crmRow.company : crmRow.partnerCompany,
    title: type === "partner" ? cleanString(payload?.title, 180) : crmRow.title,
    email: type === "partner" ? partnerEmail || crmRow.email : crmRow.email,
    phone: type === "partner" ? cleanString(payload?.phone, 80) : crmRow.phone,
    partnerTier: type === "partner" ? cleanString(payload?.partnerTier, 120) || crmRow.partnerTier || "Partner Candidate" : crmRow.partnerTier,
    memberTier: type === "member" ? cleanString(payload?.memberTier, 120) || crmRow.memberTier || "Fellow" : crmRow.memberTier,
    crmNotes: type === "guest" ? cleanString(crmRow.crmNotes, 4000) : cleanString(payload?.crmNotes, 4000),
    eventNotes: type === "guest" ? eventNotes : cleanEventNotes(payload) || cleanEventNotes(crmRow),
    registrationNotes: type === "guest" ? eventNotes : cleanEventNotes(payload) || cleanEventNotes(crmRow),
    eventAccessLink: cleanString(payload?.eventAccessLink || payload?.accessLink || payload?.zoomJoinUrl || crmRow.eventAccessLink, 1000),
    zoomJoinUrl: cleanString(payload?.zoomJoinUrl || payload?.eventAccessLink || payload?.accessLink || crmRow.zoomJoinUrl, 1000),
    crmUpdatedAt: new Date().toISOString(),
    crmUpdatedBy: access.email
  };

  await writeSetupJson(env, crmKey, next);
  if (type === "partner") {
    const previousEmail = cleanString(crmRow.email).toLowerCase();
    const nextEmail = cleanString(next.email).toLowerCase();
    const previousCompany = cleanString(crmRow.partnerCompany || crmRow.company);
    const nextCompany = cleanString(next.partnerCompany || next.company);
    if (previousEmail && (previousEmail !== nextEmail || companySlug(previousCompany) !== companySlug(nextCompany))) {
      await removeEmailFromCompanyContacts(env, previousEmail, access.email);
      if (previousEmail !== nextEmail) await deleteSetupRecord(env, `crm:contact:${previousEmail}`);
    }
    const normalizedNext = normalizeRecord(crmKey, next);
    await upsertPartnerContactProfile(env, normalizedNext, access.email);
    if (nextEmail) {
      await grantAccessGroupEmail(env, "partners", nextEmail, access.email);
      if (next.partnerPassword) {
        const authPayload = {
          name: normalizedNext.name || nextEmail,
          email: nextEmail,
          password: next.partnerPassword,
          role: "member",
          status: "active"
        };
        if (await getUserByEmail(env, nextEmail)) await updateUser(env, nextEmail, authPayload, access.email);
        else await createUser(env, authPayload, access.email);
      }
    }
  }

  const nextRows = type === "partner" && cleanBoolean(payload?.registrationLinks)
    ? await partnerRegistrationLinkRows(env)
    : type === "guest"
      ? await guestRegistrationRows(env)
    : await registrants(env, type);
  return json({
    ok: true,
    type,
    label: registrantTypes[type].label,
    summary: summarize(nextRows),
    rows: nextRows,
    partnerInviteCodes: await partnerInviteCodes(env),
    registrationInviteCodes: await registrationInviteCodes(env),
    guestMatrixProspects: await guestMatrixProspects(env),
    upcomingEvents: await upcomingEvents(env)
  });
}

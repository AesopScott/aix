export const VIRTUAL_EVENT_TIMEZONE = "America/Chicago";
export const VIRTUAL_EVENT_LOCKOUT_MINUTES = 15;

export const VIRTUAL_EVENTS = [
  {
    slug: "ai-executive-readiness",
    title: "AI Executive Readiness",
    dateLabel: "Friday, September 4, 2026",
    startAt: "2026-09-04T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Establish the leadership baseline for adoption, value, operating ownership, and risk.",
    agenda: [
      "Executive framing keynote",
      "Readiness diagnostic discussion",
      "Invite path into the summit cohort"
    ]
  },
  {
    slug: "ai-data-readiness-and-knowledge-strategy",
    title: "AI Data Readiness and Knowledge Strategy",
    dateLabel: "Friday, September 18, 2026",
    startAt: "2026-09-18T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Clarify whether the organization has the data, knowledge, permissions, and retrieval foundations required for useful AI.",
    agenda: [
      "Data readiness diagnostic",
      "Knowledge and retrieval strategy",
      "Permission and quality gaps"
    ]
  },
  {
    slug: "ai-use-cases-that-survive-finance",
    title: "AI Use Cases That Survive Finance",
    dateLabel: "Friday, September 25, 2026",
    startAt: "2026-09-25T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Compare how teams move from promising experiments to funded, measurable work.",
    agenda: [
      "ROI and use-case scoring",
      "Budget owner questions",
      "Sponsor-fit discovery"
    ]
  },
  {
    slug: "ai-agents-automation-and-human-handoffs",
    title: "AI Agents, Automation, and Human Handoffs",
    dateLabel: "Friday, October 9, 2026",
    startAt: "2026-10-09T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Define where agentic automation is ready, where it must stop, and how human escalation should work.",
    agenda: [
      "Agent workflow briefing",
      "Automation boundary discussion",
      "Handoff and escalation design"
    ]
  },
  {
    slug: "ai-integration-and-workflow",
    title: "AI Integration and Workflow",
    dateLabel: "Friday, October 16, 2026",
    startAt: "2026-10-16T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Focus on the systems, data, automation, and vendor decisions that make AI operational.",
    agenda: [
      "Workflow case study",
      "Integration constraints",
      "Peer implementation notes"
    ]
  },
  {
    slug: "ai-vendor-strategy-and-platform-decisions",
    title: "AI Vendor Strategy and Platform Decisions",
    dateLabel: "Friday, October 30, 2026",
    startAt: "2026-10-30T13:00:00-05:00",
    durationMinutes: 90,
    summary: "Compare build, buy, partner, platform, procurement, interoperability, and lock-in decisions before AI sprawl hardens.",
    agenda: [
      "Platform decision briefing",
      "Build-buy-partner comparison",
      "Procurement and lock-in review"
    ]
  },
  {
    slug: "ai-security-governance-and-trust",
    title: "AI Security, Governance, and Trust",
    dateLabel: "Friday, November 6, 2026",
    startAt: "2026-11-06T13:00:00-06:00",
    durationMinutes: 90,
    summary: "Clarify controls, policies, and executive decision rights before AI use expands further.",
    agenda: [
      "Security leader perspective",
      "Governance operating model",
      "Risk and vendor boundaries"
    ]
  },
  {
    slug: "ai-workforce-talent-and-change-adoption",
    title: "AI Workforce, Talent, and Change Adoption",
    dateLabel: "Friday, November 20, 2026",
    startAt: "2026-11-20T13:00:00-06:00",
    durationMinutes: 90,
    summary: "Address employee adoption, role redesign, manager expectations, skills, resistance, and talent planning for AI-enabled work.",
    agenda: [
      "Workforce adoption briefing",
      "Role redesign discussion",
      "2027 talent readiness"
    ]
  },
  {
    slug: "ai-operating-model-for-2027",
    title: "AI Operating Model for 2027",
    dateLabel: "Friday, November 27, 2026",
    startAt: "2026-11-27T13:00:00-06:00",
    durationMinutes: 90,
    summary: "Translate the series into leadership priorities, summit programming, and relationship next steps.",
    agenda: [
      "2027 planning discussion",
      "Summit track preview",
      "Member and speaker nominations"
    ]
  }
];

export function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.php$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getVirtualEvent(slug) {
  const cleaned = cleanSlug(slug);
  return VIRTUAL_EVENTS.find((event) => event.slug === cleaned) || null;
}

export function zoomKey(slug) {
  return `virtual-event:${cleanSlug(slug)}:zoom`;
}

export function lockoutAt(event) {
  return new Date(new Date(event.startAt).getTime() - VIRTUAL_EVENT_LOCKOUT_MINUTES * 60 * 1000);
}

export function publicVirtualEvent(event, now = new Date()) {
  const lockAt = lockoutAt(event);
  return {
    slug: event.slug,
    title: event.title,
    dateLabel: event.dateLabel,
    startAt: event.startAt,
    timezone: VIRTUAL_EVENT_TIMEZONE,
    durationMinutes: event.durationMinutes,
    summary: event.summary,
    agenda: event.agenda,
    lockoutMinutes: VIRTUAL_EVENT_LOCKOUT_MINUTES,
    lockoutAt: lockAt.toISOString(),
    locked: now.getTime() >= lockAt.getTime()
  };
}

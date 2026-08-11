# Mojo AI Summits Taxonomy

This file defines the canonical taxonomy for Mojo AI Summits event planning, CRM qualification, and invite routing.

## Event Formats

| Slug | Label | Notes |
| --- | --- | --- |
| `virtual` | Virtual | Online Mojo AI Summits event, including moderated executive roundtables. |
| `in-person` | In person | City summit or physical executive event. |

## Fall 2026 Virtual Event Series

These event slugs are the canonical identifiers for the Fall 2026 virtual event series. CRM invite records should use the same event slug, event name, and event date when staff generate guest, member, or partner invite links.

| Event Slug | Topic Track | Label | Date | Format |
| --- | --- | --- | --- | --- |
| `ai-executive-readiness` | `executive-readiness` | AI Executive Readiness | Friday, September 4, 2026 | Virtual |
| `ai-data-readiness-and-knowledge-strategy` | `data-readiness` | AI Data Readiness and Knowledge Strategy | Friday, September 18, 2026 | Virtual |
| `ai-use-cases-that-survive-finance` | `ai-use-cases` | AI Use Cases That Survive Finance | Friday, September 25, 2026 | Virtual |
| `ai-agents-automation-and-human-handoffs` | `agents-automation` | AI Agents, Automation, and Human Handoffs | Friday, October 9, 2026 | Virtual |
| `ai-integration-and-workflow` | `workflow-integration` | AI Integration and Workflow | Friday, October 16, 2026 | Virtual |
| `ai-vendor-strategy-and-platform-decisions` | `vendor-strategy` | AI Vendor Strategy and Platform Decisions | Friday, October 30, 2026 | Virtual |
| `ai-security-governance-and-trust` | `security-governance` | AI Security, Governance, and Trust | Friday, November 6, 2026 | Virtual |
| `ai-workforce-talent-and-change-adoption` | `workforce-adoption` | AI Workforce, Talent, and Change Adoption | Friday, November 20, 2026 | Virtual |
| `ai-operating-model-for-2027` | `operating-model` | AI Operating Model for 2027 | Friday, November 27, 2026 | Virtual |

## CRM Topic Tracks

CRM contacts may carry one or more topic interests. Topic-track slugs should remain stable because they are saved on contact records.

| Topic Track | Label | Usage |
| --- | --- | --- |
| `ai-strategy` | General AI Strategy | Broad AI strategy interest retained for existing contacts and general qualification. |
| `executive-readiness` | AI Executive Readiness | Leadership readiness, decision rights, adoption baseline, and executive sponsorship. |
| `data-readiness` | AI Data Readiness and Knowledge Strategy | Data quality, enterprise knowledge, retrieval, permissions, and readiness for useful AI. |
| `ai-use-cases` | AI Use Cases | Fundable use cases, finance review, measurable value, and ROI discipline. |
| `agents-automation` | AI Agents, Automation, and Human Handoffs | Agentic workflows, automation boundaries, escalation, and human-in-the-loop design. |
| `workflow-integration` | Workflow Integration | System integration, workflow redesign, process adoption, and operational embedding. |
| `vendor-strategy` | AI Vendor Strategy and Platform Decisions | Build-buy-partner decisions, procurement, interoperability, tool sprawl, and lock-in. |
| `security-governance` | Security / Governance | Controls, policies, vendor risk, trust, compliance, and governance operating model. |
| `workforce-adoption` | AI Workforce, Talent, and Change Adoption | Role redesign, manager enablement, skills, resistance, HR planning, and adoption. |
| `operating-model` | AI Operating Model | Ownership, funding, governance, metrics, decision cadence, and 2027 planning. |

## CRM Event Registry Notes

The CRM currently combines multiple event sources:

- `functions/api/crm.js` defines `DEFAULT_UPCOMING_EVENTS` for protected CRM invite creation.
- `dist/crm/index.html` defines `fallbackMojoEvents` so the CRM can render invite options even before the API response finishes.
- `functions/_virtual-events.js` defines the runtime virtual event room registry for `/virtual/[event-slug]` and `/api/virtual-events/[event-slug]`.
- The stored `event-playbooks:index` registry may add or override upcoming CRM event records.

When adding, renaming, or retiring an event, update this taxonomy first, then update the CRM event defaults, CRM frontend fallback list, and virtual event runtime registry as needed.

## CRM Field Taxonomies

### Lifecycle Stages

`prospect`, `invited`, `registered`, `attended`, `no-show`, `member-candidate`, `member`, `partner-candidate`, `partner`, `inactive`, `do-not-contact`

### Registration Statuses

`invited`, `opened`, `started`, `confirmed`, `declined`, `canceled`, `waitlisted`

### Strategic Roles

`attendee`, `speaker`, `moderator`, `roundtable-leader`, `research-contributor`, `sponsor-representative`, `partner`

### Executive Functions

`ceo`, `finance`, `operations`, `technology`, `security`, `ai-data`, `strategy`, `marketing-sales`, `hr-people`, `legal-compliance`, `other`


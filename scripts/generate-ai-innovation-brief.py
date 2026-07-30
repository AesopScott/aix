from pathlib import Path
from textwrap import wrap
from html import escape
import shutil

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PDF_DIR = DIST / "assets" / "briefs"
OUT_DIR = ROOT / "output" / "pdf"
PDF_NAME = "ai-innovation-at-operating-scale.pdf"
PDF_PATH = PDF_DIR / PDF_NAME
OUT_PDF_PATH = OUT_DIR / PDF_NAME
SPONSOR_ASSET_DIR = DIST / "assets" / "sponsors"

NAVY = "#0A0F1E"
NAVY_2 = "#10192C"
SLATE = "#1B2333"
BLUE = "#1666FF"
CYAN = "#00E6FF"
WHITE = "#FFFFFF"
MUTED = "#AAB6CB"
DIM = "#6E7890"


contributors = [
    ("Celeste Marrow", "Executive Research Moderator", "Mojo AI Summits", "Moderator", "U.S."),
    ("Maya Serrano", "Chief Innovation Officer", "Meridian Health Collaborative", "Healthcare", "Colorado / U.S."),
    ("Darius Holt", "Chief Financial Officer", "NorthBridge Capital Services", "Finance", "U.S."),
    ("Elena Kovacs", "Chief Digital Officer", "EuroGrid Manufacturing Group", "Manufacturing", "EU"),
    ("Victor Reed", "State Chief AI Officer", "Colorado Office of Digital Innovation", "Government", "Colorado / U.S."),
    ("Priya Natarajan", "Chief Legal Officer", "Halcyon Legal Systems", "Legal", "U.K. / EU"),
    ("Name withheld", "Chief Operations Officer", "U.S. national infrastructure contractor", "Government / operations", "U.S."),
    ("Kenji Watanabe", "Chief Strategy Officer", "PacificEdge Logistics", "Logistics", "Global / APAC"),
    ("Simone Alvarez", "Chief Executive Officer", "NexusForge AI", "Vendor executive", "U.S. / global"),
    ("Rowan Blake", "Chief Technology Officer", "VantageGuard Systems", "Vendor executive", "U.S. / EU"),
]


sources = [
    ("OpenAI, The state of enterprise AI 2025 report", "https://openai.com/business/guides-and-resources/the-state-of-enterprise-ai-2025-report/"),
    ("OpenAI, Workspace agents for business", "https://openai.com/business/workspace-agents/"),
    ("Microsoft, 2026 Work Trend Index", "https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization"),
    ("Stanford HAI, 2026 AI Index Report", "https://hai.stanford.edu/ai-index/2026-ai-index-report"),
    ("McKinsey, The State of AI: Global Survey 2025", "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai"),
    ("Anthropic, Agents for financial services", "https://www.anthropic.com/news/finance-agents"),
    ("Anthropic and PwC expanded enterprise partnership", "https://www.anthropic.com/news/pwc-expanded-partnership"),
    ("NIST, Generative AI Profile for AI RMF 1.0", "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence"),
    ("European Commission, AI Act regulatory framework and application timeline", "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"),
    ("European Commission, AI-generated content transparency guidance", "https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content"),
    ("IBM, Cost of a Data Breach Report 2026", "https://www.ibm.com/reports/data-breach"),
    ("OpenAI, ChatGPT Enterprise spend controls and usage analytics", "https://openai.com/index/chatgpt-enterprise-spend-controls/"),
    ("Anthropic, Claude for Enterprise", "https://www.anthropic.com/news/claude-for-enterprise"),
    ("OpenAI, Frontier enterprise platform for AI agents", "https://openai.com/business/frontier/"),
]


sections = [
    {
        "kicker": "Question 1",
        "title": "When did AI become an output system rather than a knowledge tool?",
        "summary": "The council consensus was that AI crossed into operating relevance when teams stopped asking it for answers and started embedding it into accountable workflows. The shift is visible in weekly usage, cross-functional agent adoption, and the emergence of spend controls, permissions, and workflow ownership as executive topics. [1][2][11]",
        "prompt": "Moderator prompt: What changed inside the organization when AI began affecting measurable output instead of individual productivity?",
        "quotes": [
            ("Maya Serrano, Chief Innovation Officer, Meridian Health Collaborative", "At Meridian, the first real productivity win was discharge planning. The team connected case notes, payer rules, pharmacy instructions, and follow-up scheduling into one reviewed packet. Nurses stopped rebuilding the same story four times, and the case managers could see which discharge was stuck because of a missing authorization or home-care slot."),
            ("Darius Holt, Chief Financial Officer, NorthBridge Capital Services", "NorthBridge started with monthly variance narratives because finance already had the data and the pain was obvious. The controller's team now gets a first draft that ties ledger movements to sales pipeline, hiring, and vendor spend. Nobody books the close from an AI answer, but the review meeting starts with the exceptions instead of a blank page."),
            ("Simone Alvarez, Chief Executive Officer, NexusForge AI", "The buyers who are getting value are asking for workflow wiring, not another chat window. One insurer asked for a claims-intake agent that reads the file, checks the policy, flags missing evidence, and routes the claim to the right reviewer. The win was not that the model sounded smart. It was that supervisors could see the queue moving."),
        ],
        "use_cases": [
            "Maya Serrano: discharge packets that combine clinical notes, payer rules, pharmacy instructions, and follow-up scheduling.",
            "Darius Holt: monthly variance drafts that point reviewers to exceptions before the close meeting.",
            "Simone Alvarez: claims-intake routing that checks missing evidence and moves work to the right reviewer.",
        ],
        "what_changed": "AI work moved from personal productivity to shared accountability. That made adoption visible in operating cadence: weekly business reviews, team dashboards, model usage budgets, and process redesign.",
        "signals": ["AI usage reviewed with business metrics, not tool metrics.", "Agent work queued and reviewed like ordinary work.", "Budget owners ask for unit economics per workflow."],
        "actions": ["30 days: name the top ten workflows where AI already changes output.", "60 days: assign an executive owner and approval boundary to each workflow.", "90 days: review adoption, cycle time, quality, and risk together."],
    },
    {
        "kicker": "Question 2",
        "title": "Where should strategy leaders place AI innovation on the portfolio?",
        "summary": "The council split between leaders treating AI as a transformation portfolio and leaders treating it as a capability layer inside every portfolio. The stronger position was to do both: maintain a central AI operating portfolio while forcing each business unit to name measurable AI-enabled outcomes. [3][5]",
        "prompt": "Moderator prompt: Is AI innovation a separate strategy or the new operating layer for every strategy?",
        "quotes": [
            ("Kenji Watanabe, Chief Strategy Officer, PacificEdge Logistics", "PacificEdge moved AI out of the innovation budget after a typhoon week in Taiwan. The old process had planners copying vessel notices, customs holds, and weather updates into spreadsheets. Now the control tower drafts reroute options, shows which customer commitments are at risk, and asks a planner to approve the tradeoff. That belongs in capacity planning, not a demo day."),
            ("Victor Reed, State Chief AI Officer, Colorado Office of Digital Innovation", "Residents do not care whether the state has an AI strategy. They care whether the permit comes back in ten days instead of six weeks, whether the call center gives the same answer twice, and whether somebody can explain a denial. The useful work has been turning those service failures into a short list of AI projects the agencies can actually own."),
            ("Elena Kovacs, Chief Digital Officer, EuroGrid Manufacturing Group", "EuroGrid stopped funding pilots that could not touch a plant metric. The active work now sits around downtime notes, spare-parts forecasting, quality photo review, and supplier-risk briefs. If a plant manager cannot point to yield, safety, scrap, or engineering hours, it waits."),
        ],
        "use_cases": [
            "Kenji Watanabe: logistics control-tower rerouting that combines vessel notices, customs holds, weather, and customer commitments.",
            "Victor Reed: permit and call-center projects selected from concrete service failures, not abstract AI themes.",
            "Elena Kovacs: plant-floor AI work tied to downtime notes, spare parts, quality images, and supplier risk.",
        ],
        "what_changed": "AI strategy now requires portfolio discipline. Leaders need a short list of value-backed bets, a retirement path for weak pilots, and explicit rules for where central platforms end and business ownership begins.",
        "signals": ["AI initiatives appear in capital allocation conversations.", "Business units retire pilots publicly.", "Board materials show AI impact by operating outcome."],
        "actions": ["30 days: classify AI initiatives as productivity, risk, revenue, or capability bets.", "60 days: require each bet to name an owner, metric, budget, and risk control.", "90 days: kill or graduate pilots based on evidence."],
    },
    {
        "kicker": "Question 3",
        "title": "Which automation patterns are producing durable productivity?",
        "summary": "Durable productivity came from targeted automation where AI handled preparation, synthesis, drafting, routing, and exception triage while humans retained authority for material decisions. The council saw more value in workflow compression than in full autonomy. [2][6][14]",
        "prompt": "Moderator prompt: Which AI automation patterns are reliable enough for executive operating plans?",
        "quotes": [
            ("Name withheld, Chief Operations Officer, U.S. national infrastructure contractor", "The best automation in the contractor's field operations is boring on purpose. A crew lead uploads photos and a daily note. The system drafts the safety packet, checks the work order against the contract, opens a procurement request if a part is missing, and tells the regional manager what needs approval before 7 a.m. That saved hours because nobody had to chase five systems before the day started."),
            ("Priya Natarajan, Chief Legal Officer, Halcyon Legal Systems", "Halcyon's legal team did not start with courtroom work. It started with repeatable contract intake: pull the vendor paper, compare it to the playbook, flag indemnity and data-use language, and draft the first email back to procurement. Lawyers still make the call. The difference is that they spend their time on the odd clauses instead of hunting for them."),
            ("Rowan Blake, Chief Technology Officer, VantageGuard Systems", "VantageGuard treats agents like privileged users. In one bank deployment, the loan-file agent can read the CRM and document store, but it cannot update the core system or send a customer message. It writes a recommendation to a queue, and every action has an owner, timestamp, source link, and rollback path."),
        ],
        "use_cases": [
            "Name withheld: field safety packets and procurement requests assembled from crew notes, photos, work orders, and contract rules.",
            "Priya Natarajan: contract intake that compares vendor paper to a legal playbook and drafts procurement responses.",
            "Rowan Blake: loan-file agents with read-only access, review queues, timestamps, source links, and rollback paths.",
        ],
        "what_changed": "Automation moved closer to systems of record. That raises the reward and the governance requirement at the same time.",
        "signals": ["Agent permissions are reviewed with identity and access management.", "Legal and compliance teams pre-approve workflow patterns.", "Exception queues shrink without decision quality falling."],
        "actions": ["30 days: choose three workflows where AI prepares work but does not decide.", "60 days: connect those workflows to identity, logging, and human approval.", "90 days: measure cycle-time reduction and error recovery."],
    },
    {
        "kicker": "Question 4",
        "title": "How should adoption be governed without slowing the organization?",
        "summary": "The council rejected governance as a separate bureaucracy. The preferred model was lightweight, embedded governance based on the NIST AI RMF, EU AI Act readiness where relevant, and clear internal policy for transparency, human review, evaluation, and data handling. [8][9][10][13]",
        "prompt": "Moderator prompt: How do organizations govern AI without freezing adoption?",
        "quotes": [
            ("Victor Reed, State Chief AI Officer, Colorado Office of Digital Innovation", "Colorado's approach has been to put the notice and appeal language right inside the service flow. If an eligibility worker uses an AI summary, the resident still gets a plain-language reason for the decision and a human appeal path. The governance work is not a binder on a shelf. It is the screen the case worker sees and the letter the resident receives."),
            ("Priya Natarajan, Chief Legal Officer, Halcyon Legal Systems", "Halcyon now tags AI use cases by risk before legal reviews the tool contract. A marketing draft is one lane. Employment screening, regulated claims, and customer-impacting recommendations are another. That made the EU AI Act discussion much less abstract because the business could see which workflows would need records, testing, and human review."),
            ("Maya Serrano, Chief Innovation Officer, Meridian Health Collaborative", "Meridian stopped asking one central committee to understand every clinical edge case. The governance team writes the guardrails, but the cardiology, oncology, and revenue-cycle teams each keep their own review checklist. A discharge-summary assistant has a different risk profile than a denial-appeal draft, and the review process finally reflects that."),
        ],
        "use_cases": [
            "Victor Reed: resident-facing notices and appeal paths embedded directly into AI-assisted eligibility workflows.",
            "Priya Natarajan: risk-tier tagging before legal reviews AI tool contracts and regulated use cases.",
            "Maya Serrano: clinical and revenue-cycle review checklists tailored by workflow risk.",
        ],
        "what_changed": "Model governance became operational governance. The decision is no longer whether the model is impressive; it is whether the workflow is explainable, monitored, recoverable, and appropriate for the risk class.",
        "signals": ["AI inventories include workflow purpose and owner.", "Review policies differ by risk tier.", "Transparency language appears in customer, patient, citizen, and employee-facing experiences."],
        "actions": ["30 days: map AI use cases to a simple risk-tier model.", "60 days: align policy language to NIST RMF functions: govern, map, measure, manage.", "90 days: test audit trails and appeal paths on the highest-risk workflows."],
    },
    {
        "kicker": "Question 5",
        "title": "What is the workforce impact beyond task acceleration?",
        "summary": "The council framed workforce impact as a redesign issue rather than a headcount issue. AI changes role boundaries, managerial expectations, training needs, and the definition of productive work. Microsoft research and enterprise adoption data support the pattern that institutional design, not individual enthusiasm, is the larger determinant of AI impact. [1][3][4]",
        "prompt": "Moderator prompt: What is AI doing to roles, management, and workforce productivity?",
        "quotes": [
            ("Elena Kovacs, Chief Digital Officer, EuroGrid Manufacturing Group", "On the shop floor, adoption changed when AI showed up in the handoff notes workers already used. A night-shift mechanic records what failed, the system pulls the last three maintenance tickets and likely part numbers, and the morning supervisor gets a cleaner work plan. People did not need a speech about transformation. They needed the tool to stop making them retype the same problem."),
            ("Darius Holt, Chief Financial Officer, NorthBridge Capital Services", "NorthBridge found the biggest role change in middle management. Branch managers used to ask analysts for a weekly deposit and churn summary. Now they get the first read automatically, but they are expected to challenge it, add local context, and decide what to do by Thursday. The job did not disappear. The tempo changed."),
            ("Kenji Watanabe, Chief Strategy Officer, PacificEdge Logistics", "PacificEdge had to slow down the global rollout because the same agent behaved differently by region. Singapore had clean milestone data and English-language exception notes. Parts of Latin America had broker updates in WhatsApp screenshots. The workforce plan had to include data cleanup, translation, and local process owners, not just licenses."),
        ],
        "use_cases": [
            "Elena Kovacs: maintenance handoff notes that pull prior tickets and part numbers into the supervisor's morning plan.",
            "Darius Holt: branch-manager performance summaries that shift managers from reporting to challenge-and-action review.",
            "Kenji Watanabe: regional rollout plans that include translation, data cleanup, and local process ownership.",
        ],
        "what_changed": "AI fluency is now a management capability. Leaders must teach teams how to delegate to systems, review outputs, escalate errors, and redesign work around new capacity.",
        "signals": ["Managers are trained to redesign work, not just prompt tools.", "Role descriptions include AI delegation and review responsibilities.", "Teams track new work created, not only hours saved."],
        "actions": ["30 days: identify roles with the highest AI leverage and highest disruption risk.", "60 days: rewrite operating procedures for AI-assisted work review.", "90 days: launch manager training around delegation, verification, and escalation."],
    },
    {
        "kicker": "Question 6",
        "title": "What market signals should boards watch next?",
        "summary": "The council saw a maturing market: enterprise platforms are racing toward governed agents, services firms are packaging transformation capacity, and security risk is rising as AI expands the attack surface. Boards should watch concentration, vendor dependency, cyber exposure, and the speed at which agentic workflows become standard. [4][7][11][12][14]",
        "prompt": "Moderator prompt: Which external signals will affect executive AI decisions over the next 12 months?",
        "quotes": [
            ("Simone Alvarez, Chief Executive Officer, NexusForge AI", "NexusForge is seeing buyers ask for evidence before they expand. One healthcare client would not approve the next department until the platform showed adoption by role, cost per completed packet, escalation rate, and the number of edits reviewers made. That is where the market is going. The model demo gets the meeting, but the operating dashboard gets the renewal."),
            ("Rowan Blake, Chief Technology Officer, VantageGuard Systems", "VantageGuard's board brief now includes AI in the cyber section, not just the innovation section. The team tracks shadow tools, prompt injection tests, agent permissions, and vendor data-retention language. One client found that an internal team had pasted customer renewal data into an unsanctioned tool. That one incident changed the board conversation fast."),
            ("Name withheld, Chief Operations Officer, U.S. national infrastructure contractor", "For critical infrastructure work, the likely path is constrained autonomy for a long time. The contractor is comfortable with AI drafting a field packet, comparing a plan to code, or flagging a missing inspection photo. It is not comfortable letting an agent approve a lane closure, release a crew, or change a safety procedure without a human name on it."),
        ],
        "use_cases": [
            "Simone Alvarez: buyer dashboards showing adoption by role, packet cost, escalation rate, and reviewer edits.",
            "Rowan Blake: board cyber reporting that includes shadow AI, prompt injection tests, agent permissions, and vendor retention terms.",
            "Name withheld: critical-infrastructure agents limited to drafting, code comparison, and missing-photo checks.",
        ],
        "what_changed": "The market no longer rewards isolated AI enthusiasm. It rewards the ability to govern AI-enabled operating systems across cost, security, compliance, and measurable performance.",
        "signals": ["Enterprise vendors publish governance and spend-control features.", "Services firms build AI transformation units for specific operations.", "Boards request AI cyber exposure reports alongside productivity plans."],
        "actions": ["30 days: ask key vendors for governance, cost, and audit capabilities.", "60 days: update third-party risk reviews for AI-enabled products.", "90 days: review strategic vendor concentration and exit options."],
    },
]


SPONSORS = [
    {
        "name": "NexusForge AI",
        "logo": "nexusforge-ai.png",
        "tagline": "Enterprise AI workflow orchestration",
        "description": "NexusForge AI provides orchestration software for AI-enabled workflows across service delivery, finance operations, revenue teams, and shared-services groups. The company was invited because its executive team works with organizations converting scattered AI usage into governed, measurable operating systems.",
        "invited": "Invited for operating intelligence on moving AI from department-level experiments into owned workflows with adoption metrics, cost visibility, and human approval paths.",
        "use_cases": [
            "Claims intake orchestration: reads claim files, checks policy terms, flags missing evidence, and routes work to the right reviewer.",
            "Finance close support: drafts variance narratives from ledger movement, pipeline changes, headcount plans, and vendor spend.",
            "Service operations queues: prioritizes requests by SLA risk, customer tier, missing data, and available specialist capacity.",
            "AI operating dashboard: shows adoption by role, packet cost, escalation rate, reviewer edits, and cycle-time movement.",
        ],
    },
    {
        "name": "VantageGuard Systems",
        "logo": "vantageguard-systems.png",
        "tagline": "AI governance, evaluation, and control monitoring",
        "description": "VantageGuard Systems provides AI governance, evaluation, policy automation, and control monitoring for regulated organizations. The company was invited because it helps executives put risk controls around live AI workflows without forcing innovation teams into slow manual review.",
        "invited": "Invited for field intelligence on governing agents like privileged users, including permission boundaries, audit trails, risk tiers, and rollback paths.",
        "use_cases": [
            "Agent permission review: maps which systems an agent can read, where it can write, and which actions require human approval.",
            "Board cyber reporting: tracks shadow AI, prompt-injection tests, vendor retention terms, and agent access exceptions.",
            "Regulated workflow tiering: separates low-risk drafting from employment, eligibility, claims, and customer-impacting recommendations.",
            "Evidence logs: captures source links, timestamps, reviewer edits, owner names, and reversal paths for AI-assisted decisions.",
        ],
    },
]


def asset_path(path):
    return "/" + str(path.relative_to(DIST)).replace("\\", "/")


def make_sponsor_logos():
    SPONSOR_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    font_bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 38)
    font_regular = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    for sponsor in SPONSORS:
        path = SPONSOR_ASSET_DIR / sponsor["logo"]
        img = Image.new("RGBA", (760, 180), (10, 15, 30, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle((8, 8, 752, 172), radius=18, fill=(10, 15, 30, 255), outline=(0, 230, 255, 110), width=2)
        draw.rounded_rectangle((24, 24, 136, 136), radius=18, fill=(22, 102, 255, 50), outline=(0, 230, 255, 150), width=2)
        if sponsor["name"] == "NexusForge AI":
            draw.line((52, 96, 78, 56, 104, 96, 78, 120, 52, 96), fill=(0, 230, 255, 255), width=8, joint="curve")
            draw.ellipse((70, 48, 86, 64), fill=(255, 255, 255, 255))
            draw.ellipse((96, 88, 112, 104), fill=(255, 255, 255, 255))
            draw.ellipse((44, 88, 60, 104), fill=(255, 255, 255, 255))
        else:
            draw.rounded_rectangle((54, 44, 106, 118), radius=12, outline=(0, 230, 255, 255), width=6)
            draw.line((66, 84, 80, 100, 100, 66), fill=(255, 255, 255, 255), width=7)
            draw.arc((45, 34, 115, 130), 205, 335, fill=(22, 102, 255, 255), width=5)
        draw.text((160, 48), sponsor["name"], font=font_bold, fill=(255, 255, 255, 255))
        draw.text((162, 106), sponsor["tagline"].upper(), font=font_regular, fill=(0, 230, 255, 220))
        img.save(path)


def hex_to_rgb(color):
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) / 255 for i in (0, 2, 4))


def set_fill(c, color):
    c.setFillColorRGB(*hex_to_rgb(color))


def set_stroke(c, color):
    c.setStrokeColorRGB(*hex_to_rgb(color))


class BriefPDF:
    def __init__(self, path):
        self.c = canvas.Canvas(str(path), pagesize=letter)
        self.c.setTitle("AI Innovation at Operating Scale")
        self.c.setAuthor("Mojo AI Summits Executive Research Council")
        self.c.setSubject("Executive AI intelligence brief sample")
        self.w, self.h = letter
        self.page = 0

    def bg(self, title=None):
        self.page += 1
        set_fill(self.c, NAVY)
        self.c.rect(0, 0, self.w, self.h, fill=1, stroke=0)
        set_fill(self.c, NAVY_2)
        self.c.circle(self.w * 0.86, self.h * 0.86, 190, fill=1, stroke=0)
        set_stroke(self.c, BLUE)
        self.c.setLineWidth(0.7)
        self.c.line(54, self.h - 44, self.w - 54, self.h - 44)
        set_stroke(self.c, CYAN)
        self.c.line(54, 42, self.w - 54, 42)
        if title:
            self.text(54, self.h - 31, title.upper(), 7.5, CYAN, "Helvetica-Bold", tracking=1.7)
        if self.page > 1:
            self.text(self.w - 82, 24, f"{self.page:02d}", 8, DIM, "Helvetica-Bold")

    def text(self, x, y, txt, size=10, color=WHITE, font="Helvetica", tracking=0):
        self.c.setFont(font, size)
        set_fill(self.c, color)
        if tracking:
            current = x
            for ch in txt:
                self.c.drawString(current, y, ch)
                current += self.c.stringWidth(ch, font, size) + tracking
        else:
            self.c.drawString(x, y, txt)

    def para(self, x, y, txt, width=78, size=10, leading=14, color=MUTED, font="Helvetica"):
        for line in wrap(txt, width):
            if y < 64:
                return y, False
            self.text(x, y, line, size, color, font)
            y -= leading
        return y, True

    def heading(self, x, y, title, size=24):
        lines = wrap(title, 34)
        for line in lines:
            self.text(x, y, line, size, WHITE, "Helvetica-Bold")
            y -= size + 4
        return y

    def quote(self, x, y, name, quote, width=67):
        lines = wrap('"' + quote + '"', width)
        set_stroke(self.c, CYAN)
        self.c.setLineWidth(1.2)
        self.c.line(x, y + 8, x, y - 20 - (13 * len(lines)))
        self.text(x + 14, y, name, 9.8, CYAN, "Helvetica-Bold")
        y -= 16
        for line in lines:
            self.text(x + 14, y, line, 9.4, WHITE, "Helvetica")
            y -= 13
        return y - 8

    def use_cases_box(self, x, y, items, width=504, wrap_width=88):
        wrapped_items = [wrap("- " + item, wrap_width) for item in items]
        height = 34 + sum(len(lines) * 12 for lines in wrapped_items) + (len(items) * 5)
        set_fill(self.c, SLATE)
        self.c.roundRect(x, y - height, width, height, 5, fill=1, stroke=0)
        self.text(x + 14, y - 19, "USE CASES CALLED OUT", 8, CYAN, "Helvetica-Bold", tracking=0.6)
        yy = y - 38
        for lines in wrapped_items:
            for line in lines:
                self.text(x + 14, yy, line, 8.2, MUTED, "Helvetica")
                yy -= 12
            yy -= 5
        return y - height - 14

    def callout(self, x, y, title, items, width=240):
        set_fill(self.c, SLATE)
        self.c.roundRect(x, y - 116, width, 116, 5, fill=1, stroke=0)
        self.text(x + 14, y - 20, title.upper(), 8, CYAN, "Helvetica-Bold", tracking=0.6)
        yy = y - 40
        for item in items:
            self.text(x + 14, yy, "- " + item, 8.2, MUTED, "Helvetica")
            yy -= 18

    def footer_note(self, text):
        self.text(54, 24, text, 7, DIM, "Helvetica")

    def new_page(self, title=None):
        if self.page:
            self.c.showPage()
        self.bg(title)

    def save(self):
        self.c.save()


def create_pdf():
    make_sponsor_logos()
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf = BriefPDF(PDF_PATH)

    pdf.new_page()
    pdf.text(54, 704, "MOJO AI SUMMITS", 11, CYAN, "Helvetica-Bold", tracking=2.2)
    pdf.text(54, 678, "Executive Research Council on AI Innovation", 15, WHITE, "Helvetica-Bold")
    pdf.text(54, 606, "AI Innovation at", 38, WHITE, "Helvetica-Bold")
    pdf.text(54, 558, "Operating Scale", 38, WHITE, "Helvetica-Bold")
    y = 516
    pdf.para(54, y - 6, "How executive leaders are converting AI adoption into measurable organizational output across strategy, automation, enterprise adoption, workforce impact, and market intelligence.", 55, 14, 18, WHITE, "Helvetica")
    set_stroke(pdf.c, CYAN)
    pdf.c.setLineWidth(1.5)
    pdf.c.line(54, 386, 300, 386)
    pdf.text(54, 354, "Innovation Cohort Brief", 18, WHITE, "Helvetica-Bold")
    pdf.text(54, 330, "Publication date: August 6, 2026 | Version 1.0", 10, MUTED)
    pdf.text(54, 310, "Prepared from a two-hour moderated Executive Research Council discussion.", 10, MUTED)
    pdf.text(54, 90, "Invitation-only intelligence for the Executive AI Intelligence Network.", 10, CYAN, "Helvetica-Bold")

    pdf.new_page("Opening Page")
    y = pdf.heading(54, 704, "What the Executive Research Council is", 25)
    paras = [
        "The Mojo AI Summits Executive Research Council is an invitation-only forum where senior executives, selected vendor executives, and occasional policy leaders compare real implementation experience. The council is built for executives accountable for AI outcomes, not sales teams or general marketing audiences.",
        "The AI Innovation cohort focuses on where AI is becoming an operating capability: the places where models, agents, governance, data, and people combine to change organizational output. Members contribute observations from their own work, review market signals, and help turn private council discussion into executive intelligence briefs.",
        "Council members receive deeper access than public readers: the full discussion transcript, extended contributor remarks, working frameworks, and private peer follow-up opportunities. Public briefs summarize the major patterns without exposing proprietary operating detail.",
    ]
    for p in paras:
        y, _ = pdf.para(54, y - 5, p, 86, 10.4, 15)
        y -= 8
    pdf.text(54, 306, "Contributors to this brief", 15, WHITE, "Helvetica-Bold")
    y = 282
    for name, title, company, sector, geo in contributors:
        pdf.text(58, y, name, 8.7, WHITE, "Helvetica-Bold")
        pdf.text(186, y, f"{title}, {company}", 8.3, MUTED)
        pdf.text(472, y, geo, 8.1, CYAN)
        y -= 18
    pdf.footer_note("Names, titles, and companies in this sample are fictional; the intelligence format is representative of the intended product.")

    pdf.new_page("Executive Summary")
    y = pdf.heading(54, 704, "Council consensus", 26)
    pdf.para(54, y - 8, "AI became a real driver of organizational productivity when it entered operating systems, not when individual employees adopted better assistants. The decisive shift is from prompting to managed workflow: assigned owners, defined permissions, evaluation, cost controls, and reviewable results.", 82, 12, 16, WHITE, "Helvetica-Bold")
    left = [
        "AI productivity is increasingly institutional. Individual usage matters, but durable output comes from redesigned workflows and managerial systems. [3]",
        "Agentic automation is valuable first as workflow compression: preparation, synthesis, routing, drafting, and exception triage. [2][14]",
        "Governance is becoming an adoption accelerator when it is embedded, risk-tiered, and tied to operating evidence. [8][9]",
        "Workforce impact is a role-design issue. Managers need to know how to delegate to AI and verify AI-assisted work.",
    ]
    right = [
        "Market momentum is moving from generic model access to secure, governed enterprise platforms. [11][13][14]",
        "Boards should watch vendor dependency, cyber exposure, AI transparency obligations, and whether productivity gains survive audit.",
        "The preferred executive posture is ambitious but constrained: scale workflows with clear accountability before chasing full autonomy.",
        "Quarterly summits turn these briefs into live executive exchange, private follow-up, and partner visibility.",
    ]
    pdf.callout(54, 468, "Key findings", left[:4], 250)
    pdf.callout(316, 468, "Board takeaways", right[:4], 242)
    pdf.text(54, 304, "Decision framework", 15, WHITE, "Helvetica-Bold")
    framework = [
        ("Value", "Does the workflow move cycle time, quality, revenue, risk, or capacity?"),
        ("Authority", "Who owns the outcome and where does human approval sit?"),
        ("Evidence", "Can the organization inspect inputs, outputs, actions, and exceptions?"),
        ("Scale", "Can the pattern repeat across units without custom heroics?"),
        ("Resilience", "Can the organization reverse, pause, or audit the workflow under stress?"),
    ]
    y = 276
    for label, desc in framework:
        pdf.text(64, y, label, 9, CYAN, "Helvetica-Bold")
        pdf.text(130, y, desc, 9, MUTED)
        y -= 22

    for idx, section in enumerate(sections, start=1):
        pdf.new_page(section["kicker"])
        pdf.text(54, 704, section["kicker"].upper(), 8, CYAN, "Helvetica-Bold", tracking=1.3)
        y = pdf.heading(54, 676, section["title"], 24)
        pdf.text(54, y - 4, "Executive summary", 10, CYAN, "Helvetica-Bold")
        y, _ = pdf.para(54, y - 22, section["summary"], 82, 10, 14)
        y -= 10
        pdf.text(54, y, "Council discussion", 10, CYAN, "Helvetica-Bold")
        y, _ = pdf.para(54, y - 18, section["prompt"], 82, 9.4, 13, WHITE, "Helvetica-Bold")
        y -= 8
        for name, quote in section["quotes"]:
            if y < 170:
                pdf.new_page(f"{section['kicker']} Continued")
                y = 704
            y = pdf.quote(54, y, name, quote)
        if y < 220:
            pdf.new_page(f"{section['kicker']} Continued")
            y = 704
        y = pdf.use_cases_box(54, y, section["use_cases"])
        if y < 238:
            pdf.new_page(f"{section['kicker']} Continued")
            y = 704
        pdf.text(54, y, "Strategic implication", 10, CYAN, "Helvetica-Bold")
        y, _ = pdf.para(54, y - 18, section["what_changed"], 82, 9.5, 13)
        y -= 8
        pdf.callout(54, y, "Signals to watch", section["signals"], 245)
        pdf.callout(316, y, "Recommended actions", section["actions"], 242)

    pdf.new_page("Visual Intelligence")
    y = pdf.heading(54, 704, "Operating signals added after the council session", 24)
    pdf.para(54, y - 8, "The following visuals were added by the brief team after the discussion to organize the patterns that surfaced across contributor comments.", 82, 10.5, 15)
    pdf.text(54, 588, "Figure 1: AI operating maturity", 10, CYAN, "Helvetica-Bold")
    bars = [("Assist", 140), ("Automate", 215), ("Orchestrate", 285), ("Govern", 245), ("Scale", 305)]
    x = 70
    for label, height in bars:
        set_fill(pdf.c, BLUE if label != "Scale" else CYAN)
        pdf.c.rect(x, 420, 54, height / 3, fill=1, stroke=0)
        pdf.text(x, 400, label, 8, WHITE, "Helvetica-Bold")
        x += 84
    pdf.text(54, 342, "Figure 2: Productivity decision matrix", 10, CYAN, "Helvetica-Bold")
    set_stroke(pdf.c, DIM)
    pdf.c.rect(70, 110, 440, 200, fill=0, stroke=1)
    pdf.c.line(290, 110, 290, 310)
    pdf.c.line(70, 210, 510, 210)
    pdf.text(86, 282, "Low risk / high repeatability", 9, WHITE, "Helvetica-Bold")
    pdf.text(306, 282, "High risk / high repeatability", 9, WHITE, "Helvetica-Bold")
    pdf.text(86, 184, "Low risk / low repeatability", 9, WHITE, "Helvetica-Bold")
    pdf.text(306, 184, "High risk / low repeatability", 9, WHITE, "Helvetica-Bold")
    pdf.para(86, 260, "Scale with lightweight controls: service tickets, summaries, knowledge workflows.", 31, 8, 11)
    pdf.para(306, 260, "Scale slowly with evidence: regulated workflows, citizen-facing decisions, finance controls.", 31, 8, 11)
    pdf.para(86, 162, "Keep experimental: local analyst support, research, meeting prep.", 31, 8, 11)
    pdf.para(306, 162, "Avoid or isolate: unclear authority, sensitive data, weak reversibility.", 31, 8, 11)

    pdf.new_page("Sources Reviewed")
    y = pdf.heading(54, 704, "Sources reviewed", 25)
    pdf.para(54, y - 4, "Citations were added after the moderated council conversation to ground market references, governance frameworks, and current enterprise AI signals in public sources. No paywalled sources are required to follow the brief.", 82, 10.2, 14)
    y = 606
    for i, (name, url) in enumerate(sources, start=1):
        pdf.text(54, y, f"[{i}] {name}", 8.4, WHITE, "Helvetica-Bold")
        y, _ = pdf.para(72, y - 12, url, 92, 7.6, 10, MUTED)
        y -= 8
        if y < 76:
            pdf.new_page("Sources Reviewed")
            y = 704

    pdf.new_page("Sponsor Partners")
    y = pdf.heading(54, 704, "Sponsor partners and participation model", 24)
    pdf.para(54, y - 8, "Executive Research Council partners are invited because their executive leaders can contribute useful field intelligence to the conversation. Participation is limited to executive voices with operating knowledge. Sales and marketing teams do not sit in the council session.", 82, 10.5, 15)
    y = 514
    for sponsor in SPONSORS:
        desc_lines = wrap(sponsor["description"], 78)
        invited_lines = wrap("Why invited: " + sponsor["invited"], 78)
        use_case_lines = []
        for item in sponsor["use_cases"]:
            use_case_lines.extend(wrap("- " + item, 78))
            use_case_lines.append("")
        card_height = 122 + (len(desc_lines) * 12) + (len(invited_lines) * 12) + (len(use_case_lines) * 10)
        if y - card_height < 104:
            pdf.new_page("Sponsor Partners Continued")
            y = 704
        set_fill(pdf.c, SLATE)
        pdf.c.roundRect(54, y - card_height, 504, card_height - 10, 5, fill=1, stroke=0)
        pdf.c.drawImage(ImageReader(str(SPONSOR_ASSET_DIR / sponsor["logo"])), 72, y - 72, width=210, height=68, mask="auto")
        y -= 88
        y, _ = pdf.para(76, y, sponsor["description"], 76, 9.1, 12)
        y -= 8
        y, _ = pdf.para(76, y, "Why invited: " + sponsor["invited"], 76, 8.7, 12, CYAN, "Helvetica-Bold")
        y -= 8
        pdf.text(76, y, "Example use cases", 8.2, CYAN, "Helvetica-Bold", tracking=0.5)
        y -= 14
        for item in sponsor["use_cases"]:
            for line in wrap("- " + item, 76):
                pdf.text(88, y, line, 8, MUTED, "Helvetica")
                y -= 10
            y -= 3
        y -= 22
    if y < 200:
        pdf.new_page("Sponsor Partners Continued")
        y = 704
    pdf.text(54, y, "Call to action", 14, WHITE, "Helvetica-Bold")
    pdf.para(54, y - 22, "To become part of the Mojo AI Summits Executive AI Intelligence Network, executives must be invited by an existing member or selected for a specific council contribution. Quarterly Mojo AI Summits around the United States bring council intelligence, member discussion, and partner insight into live executive rooms.", 82, 10.5, 15, WHITE)
    pdf.text(54, 82, "Legal, privacy, and redistribution", 10, CYAN, "Helvetica-Bold")
    pdf.para(54, 66, "This sample brief is for informational purposes only and is not legal, financial, technical, security, or investment advice. Do not redistribute without written permission. Copyright 2026 Mojo AI Summits. All rights reserved.", 95, 7.8, 10, DIM)

    pdf.save()
    shutil.copyfile(PDF_PATH, OUT_PDF_PATH)


def write_html():
    make_sponsor_logos()
    brief_dir = DIST / "briefs"
    detail_dir = brief_dir / "ai-innovation-at-operating-scale"
    brief_dir.mkdir(parents=True, exist_ok=True)
    detail_dir.mkdir(parents=True, exist_ok=True)

    def h(text):
        return escape(str(text), quote=True)

    def list_items(items):
        return "".join(f"<li>{h(item)}</li>" for item in items)

    contributor_rows = "\n".join(
        f"""<tr><td><strong>{h(name)}</strong></td><td>{h(title)}</td><td>{h(company)}</td><td>{h(sector)}</td><td>{h(geo)}</td></tr>"""
        for name, title, company, sector, geo in contributors
    )

    toc_items = "\n".join(
        f"""<a href="#page-{idx + 4}"><span>{idx + 4:02d}</span>{h(section["title"])}</a>"""
        for idx, section in enumerate(sections)
    )

    section_pages = []
    for idx, section in enumerate(sections, start=4):
        quotes = "\n".join(
            f"""<blockquote><cite>{h(name)}</cite><p>&quot;{h(quote)}&quot;</p></blockquote>"""
            for name, quote in section["quotes"]
        )
        use_cases = list_items(section["use_cases"])
        section_pages.append(
            f"""<section class="report-page question-page" id="page-{idx}">
  <div class="page-kicker">{h(section["kicker"])} <span>Page {idx:02d}</span></div>
  <h2>{h(section["title"])}</h2>
  <div class="summary-band"><strong>Executive summary</strong><p>{h(section["summary"])}</p></div>
  <p class="moderator">{h(section["prompt"])}</p>
  <div class="quote-stack">{quotes}</div>
  <div class="use-case-panel"><h3>Use Cases Called Out</h3><ul>{use_cases}</ul></div>
  <div class="two-col">
    <div><h3>Strategic Implication</h3><p>{h(section["what_changed"])}</p></div>
    <div><h3>Signals To Watch</h3><ul>{list_items(section["signals"])}</ul></div>
  </div>
  <div class="action-strip"><h3>Recommended 30 / 60 / 90 Day Actions</h3><ul>{list_items(section["actions"])}</ul></div>
</section>"""
        )
    section_pages_html = "\n".join(section_pages)

    source_items = "\n".join(
        f"""<li><strong>[{idx}] {h(name)}</strong><a href="{h(url)}">{h(url)}</a></li>"""
        for idx, (name, url) in enumerate(sources, start=1)
    )

    sponsor_html = "\n".join(
        f"""<article class="sponsor"><div class="sponsor-head"><img src="{h(asset_path(SPONSOR_ASSET_DIR / sponsor["logo"]))}" alt="{h(sponsor["name"])} logo"><div><h3>{h(sponsor["name"])}</h3><p>{h(sponsor["tagline"])}</p></div></div><p>{h(sponsor["description"])}</p><p class="sponsor-invited"><strong>Why invited:</strong> {h(sponsor["invited"])}</p><div class="sponsor-use-cases"><h3>Example Use Cases For This Topic</h3><ul>{list_items(sponsor["use_cases"])}</ul></div></article>"""
        for sponsor in SPONSORS
    )

    shared_css = """
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
    :root{--navy:#0A0F1E;--slate:#1B2333;--blue:#1666FF;--cyan:#00E6FF;--white:#FFFFFF;--muted:#aab6cb;--dim:#6e7890;--border:rgba(0,230,255,.18)}
    *{box-sizing:border-box} body{margin:0;background:var(--navy);color:var(--white);font-family:Inter,system-ui,sans-serif} a{color:inherit;text-decoration:none}
    .shell{min-height:100vh;background:radial-gradient(circle at 80% 10%,rgba(22,102,255,.24),transparent 34%),linear-gradient(180deg,#0A0F1E,#10192c 52%,#0A0F1E)}
    .wrap{width:min(1120px,calc(100% - 48px));margin:0 auto}.top{display:flex;align-items:center;justify-content:space-between;padding:26px 0}.brand-lockup{display:inline-flex;align-items:center;gap:14px}.brand-mark{height:56px;width:auto;display:block;filter:drop-shadow(0 0 22px rgba(0,230,255,.18))}.brand-divider{width:1px;height:48px;background:linear-gradient(to bottom,transparent,rgba(0,230,255,.9),transparent);box-shadow:0 0 14px rgba(0,230,255,.24)}.brand-name{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1;text-transform:uppercase}.brand-primary{font-family:Inter,sans-serif;font-weight:700;font-size:30px;letter-spacing:.08em;white-space:nowrap;background:linear-gradient(90deg,#1175d8 0%,#00e6ff 82%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 18px rgba(0,230,255,.16)}.brand-secondary{font-family:Inter,sans-serif;font-weight:600;font-size:13px;letter-spacing:.38em;color:rgba(222,235,255,.78);padding-left:.38em;text-align:center;white-space:nowrap}.nav{display:flex;gap:20px;flex-wrap:wrap;font:700 11px/1 Space Grotesk;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
    .hero{padding:78px 0 46px}.eyebrow{font:700 10px/1 Space Grotesk;letter-spacing:.34em;text-transform:uppercase;color:var(--cyan)}h1{font-family:Fraunces,serif;font-size:clamp(42px,7vw,86px);line-height:.98;margin:22px 0 20px;max-width:970px}p{color:var(--muted);line-height:1.7}.lead{font-size:19px;max-width:720px}.actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:34px}.btn{border:1px solid var(--cyan);padding:14px 19px;font:700 11px/1 Space Grotesk;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan)}.btn.primary{background:var(--cyan);color:#04101b}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin:54px 0;background:rgba(255,255,255,.09)}.meta div{background:rgba(10,15,30,.76);padding:22px}.meta span{display:block;font:700 10px/1 Space Grotesk;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}.meta strong{font-size:18px}
    .grid{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;padding:24px 0 80px}.panel{border:1px solid var(--border);background:rgba(27,35,51,.58);padding:28px;border-radius:6px}.panel h2,.panel h3{font-family:Fraunces,serif;margin:0 0 16px}.panel li{color:var(--muted);line-height:1.6;margin:10px 0}.brief-card{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:center;border-top:1px solid var(--border);padding:28px 0}.brief-card h2{font-family:Fraunces,serif;margin:0 0 10px}
    .download-dock{position:sticky;top:0;z-index:20;border-block:1px solid rgba(0,230,255,.16);background:rgba(10,15,30,.92);backdrop-filter:blur(14px)}.download-dock .wrap{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-block:13px}.download-dock p{font:700 11px/1.3 Space Grotesk;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}.download-dock .actions{margin:0}
    .report-pages{width:min(1480px,calc(100% - 32px));padding:14px 0 64px}.report-page{position:relative;min-height:680px;margin:0 auto 22px;padding:40px;border:1px solid rgba(0,230,255,.16);background:linear-gradient(145deg,rgba(10,15,30,.96),rgba(16,25,44,.94));box-shadow:0 28px 90px rgba(0,0,0,.28);overflow:hidden}.report-page.question-page{border:1px solid rgba(0,230,255,.34);box-shadow:0 28px 90px rgba(0,0,0,.28),0 0 0 1px rgba(22,102,255,.14) inset,0 0 34px rgba(0,230,255,.08)}.report-page.question-page::before{content:"";position:absolute;inset:12px;border:1px solid rgba(22,102,255,.22);pointer-events:none;z-index:1}.report-page::after{content:"";position:absolute;right:-120px;top:-130px;width:340px;height:340px;border-radius:50%;background:rgba(27,35,51,.72);z-index:0}.report-page>*{position:relative;z-index:2}.report-page.cover{display:flex;flex-direction:column;justify-content:center}.page-kicker{display:flex;justify-content:space-between;gap:24px;margin-bottom:22px;padding-bottom:12px;border-bottom:1px solid rgba(0,230,255,.28);font:700 10px/1 Space Grotesk;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan)}.report-page h2{font-family:Fraunces,serif;font-size:clamp(30px,4.2vw,52px);line-height:1.02;margin:0 0 18px}.report-page h3{font:700 12px/1.2 Space Grotesk;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan);margin:0 0 10px}.summary-band{border-left:2px solid var(--cyan);padding:12px 0 12px 18px;margin:16px 0 20px}.summary-band strong{display:block;margin-bottom:7px;color:var(--white)}.moderator{font-weight:700;color:var(--white)}.quote-stack{display:grid;gap:12px;margin:18px 0}.quote-stack blockquote{margin:0;padding:18px;border:1px solid rgba(255,255,255,.08);background:rgba(27,35,51,.54)}.quote-stack blockquote p{color:var(--white);font-size:16px}.quote-stack cite{display:block;margin-bottom:12px;color:var(--cyan);font:700 13.2px/1.4 Space Grotesk;text-transform:uppercase;letter-spacing:.08em}.use-case-panel{margin:18px 0;padding:18px 20px;border:1px solid rgba(0,230,255,.22);background:rgba(0,230,255,.06)}.use-case-panel h3{margin-bottom:12px}.use-case-panel li{color:rgba(222,235,255,.82)}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.action-strip{margin-top:18px;padding:18px;background:rgba(0,230,255,.07);border:1px solid rgba(0,230,255,.18)}ul{margin:0;padding-left:18px;color:var(--muted)}li{line-height:1.55;margin:6px 0}.contributor-table{width:100%;border-collapse:collapse;margin-top:18px}.contributor-table th,.contributor-table td{padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;color:var(--muted);font-size:13px;vertical-align:top}.contributor-table th{color:var(--cyan);font:700 10px/1 Space Grotesk;letter-spacing:.16em;text-transform:uppercase}.toc{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:22px}.toc a{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:12px;border:1px solid rgba(255,255,255,.08);color:var(--muted)}.toc span{color:var(--cyan);font-weight:700}.framework{display:grid;gap:10px}.framework div{display:grid;grid-template-columns:110px 1fr;gap:16px;padding:12px;border-bottom:1px solid rgba(255,255,255,.08)}.framework strong{color:var(--cyan)}.visual-bars{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:end;height:220px;margin:24px 0}.visual-bars div{display:flex;align-items:end;justify-content:center;background:linear-gradient(180deg,var(--cyan),var(--blue));color:#06101c;font-weight:800;padding:10px;min-height:70px}.visual-bars div:nth-child(1){height:34%}.visual-bars div:nth-child(2){height:52%}.visual-bars div:nth-child(3){height:68%}.visual-bars div:nth-child(4){height:58%}.visual-bars div:nth-child(5){height:82%}.matrix{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid rgba(255,255,255,.14)}.matrix div{min-height:96px;padding:16px;border:1px solid rgba(255,255,255,.08)}.sources-list{padding:0;list-style:none}.sources-list li{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)}.sources-list a{display:block;color:var(--cyan);font-size:12px;word-break:break-word}.sponsor{padding:20px;margin:14px 0;background:rgba(27,35,51,.72);border:1px solid rgba(0,230,255,.16)}.sponsor-head{display:flex;align-items:center;gap:18px;margin-bottom:16px}.sponsor-head img{width:220px;max-width:42%;height:auto;display:block}.sponsor-head h3{margin:0 0 6px}.sponsor-head p{margin:0;color:var(--cyan);font:700 11px/1.35 Space Grotesk;text-transform:uppercase;letter-spacing:.14em}.sponsor-invited{border-left:2px solid rgba(0,230,255,.45);padding-left:14px}.sponsor-use-cases{margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,.08);background:rgba(10,15,30,.42)}.sponsor-use-cases li{color:rgba(222,235,255,.82)}.legal{font-size:13px;color:var(--dim)}footer{padding:42px 0;color:var(--dim);text-align:center;border-top:1px solid rgba(255,255,255,.08)}footer a{color:var(--cyan)}
    @media(max-width:780px){.grid,.meta,.brief-card,.two-col,.toc,.matrix{grid-template-columns:1fr}.top{align-items:flex-start;gap:22px;flex-direction:column}.nav{display:none}.brand-lockup{gap:10px}.brand-mark{height:42px}.brand-divider{height:36px}.brand-primary{font-size:23px;letter-spacing:.05em}.brand-secondary{font-size:10px;letter-spacing:.32em;padding-left:.32em}.download-dock .wrap{align-items:flex-start;flex-direction:column}.report-page{min-height:auto;padding:30px}.contributor-table{display:block;overflow-x:auto}.framework div{grid-template-columns:1fr}.visual-bars{height:190px}.sponsor-head{align-items:flex-start;flex-direction:column}.sponsor-head img{max-width:100%;width:240px}}
    """

    archive = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Executive AI Intelligence Briefs | MOJO AI Summits</title>
<meta name="description" content="Sample Executive AI Intelligence Briefs from Mojo AI Summits Executive Research Councils.">
<link rel="icon" type="image/png" href="/assets/logo-badge.png">
<style>{shared_css}</style>
</head>
<body><main class="shell"><div class="wrap">
<header class="top"><a class="brand-lockup" href="/" aria-label="MOJO AI Summits home"><img class="brand-mark" src="/assets/logo-mark.png" alt=""><span class="brand-divider" aria-hidden="true"></span><span class="brand-name" aria-hidden="true"><span class="brand-primary">MOJO AI</span><span class="brand-secondary">Summits</span></span></a><nav class="nav"><a href="/">Home</a><a href="/membership/">Membership</a><a href="/partners/">Partners</a></nav></header>
<section class="hero"><span class="eyebrow">Executive AI Intelligence Briefs</span><h1>Signal from the rooms where AI strategy becomes operating reality.</h1><p class="lead">Each brief is synthesized from an invitation-only Executive Research Council conversation and augmented with public sources, frameworks, visuals, and practical actions for senior leaders.</p></section>
<section class="brief-card"><div><span class="eyebrow">Sample brief | Innovation cohort</span><h2>AI Innovation at Operating Scale</h2><p>How executive leaders are converting AI adoption into measurable organizational output across strategy, automation, enterprise adoption, workforce impact, and market intelligence.</p></div><div class="actions"><a class="btn primary" href="/briefs/ai-innovation-at-operating-scale/">Read HTML Brief</a><a class="btn" href="/assets/briefs/{PDF_NAME}" download>Download PDF</a></div></section>
</div><footer><div class="wrap">&copy; 2026 MOJO AI Summits. <a href="/briefs/">Executive AI Intelligence Briefs</a></div></footer></main></body></html>"""

    detail = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Innovation at Operating Scale | MOJO AI Summits</title>
<meta name="description" content="A sample Mojo AI Summits Executive Research Council intelligence brief on AI innovation and organizational productivity.">
<link rel="icon" type="image/png" href="/assets/logo-badge.png">
<style>{shared_css}</style>
</head>
<body><main class="shell"><div class="wrap">
<header class="top"><a class="brand-lockup" href="/" aria-label="MOJO AI Summits home"><img class="brand-mark" src="/assets/logo-mark.png" alt=""><span class="brand-divider" aria-hidden="true"></span><span class="brand-name" aria-hidden="true"><span class="brand-primary">MOJO AI</span><span class="brand-secondary">Summits</span></span></a><nav class="nav"><a href="/briefs/">Briefs</a><a href="/membership/">Membership</a><a href="/partners/">Partners</a></nav></header>
<section class="hero"><span class="eyebrow">Mojo AI Summits Executive Research Council on AI Innovation</span><h1>AI Innovation at Operating Scale</h1><p class="lead">A sample 10- to 15-minute executive intelligence brief from the Innovation cohort, prepared from a moderated council conversation and augmented with research citations, visuals, recommendations, and sponsor context.</p><div class="actions"><a class="btn primary" href="#page-1">Read HTML Brief</a><a class="btn" href="/assets/briefs/{PDF_NAME}" download>Download PDF</a><a class="btn" href="/briefs/">Back to Briefs</a></div></section>
<section class="meta"><div><span>Published</span><strong>August 6, 2026</strong></div><div><span>Version</span><strong>1.0</strong></div><div><span>Council</span><strong>AI Innovation</strong></div><div><span>Format</span><strong>HTML + PDF</strong></div></section>
</div>
<div class="download-dock"><div class="wrap"><p>Full HTML intelligence brief</p><div class="actions"><a class="btn primary" href="/assets/briefs/{PDF_NAME}" download>Download PDF</a><a class="btn" href="/assets/briefs/{PDF_NAME}">Open PDF</a></div></div></div>
<section class="report-pages wrap" aria-label="AI Innovation at Operating Scale full brief">
  <section class="report-page cover" id="page-1">
    <div class="page-kicker">Mojo AI Summits <span>Page 01</span></div>
    <span class="eyebrow">Executive Research Council on AI Innovation</span>
    <h2>AI Innovation at Operating Scale</h2>
    <p class="lead">How executive leaders are converting AI adoption into measurable organizational output across strategy, automation, enterprise adoption, workforce impact, and market intelligence.</p>
    <div class="summary-band"><strong>Innovation Cohort Brief</strong><p>Publication date: August 6, 2026 | Version 1.0. Prepared from a two-hour moderated Executive Research Council discussion.</p></div>
    <div class="toc"><a href="#page-2"><span>02</span>Executive Research Council</a><a href="#page-3"><span>03</span>Executive Summary</a>{toc_items}<a href="#page-10"><span>10</span>Visual Intelligence</a><a href="#page-11"><span>11</span>Sources Reviewed</a><a href="#page-12"><span>12</span>Sponsor Partners</a></div>
  </section>
  <section class="report-page" id="page-2">
    <div class="page-kicker">Opening Page <span>Page 02</span></div>
    <h2>What the Executive Research Council is</h2>
    <p>The Mojo AI Summits Executive Research Council is an invitation-only forum where senior executives, selected vendor executives, and occasional policy leaders compare real implementation experience. The council is built for executives accountable for AI outcomes, not sales teams or general marketing audiences.</p>
    <p>The AI Innovation cohort focuses on where AI is becoming an operating capability: the places where models, agents, governance, data, and people combine to change organizational output. Members contribute observations from their own work, review market signals, and help turn private council discussion into executive intelligence briefs.</p>
    <p>Council members receive deeper access than public readers: the full discussion transcript, extended contributor remarks, working frameworks, and private peer follow-up opportunities. Public briefs summarize the major patterns without exposing proprietary operating detail.</p>
    <table class="contributor-table"><thead><tr><th>Name</th><th>Title</th><th>Organization</th><th>Role</th><th>Lens</th></tr></thead><tbody>{contributor_rows}</tbody></table>
  </section>
  <section class="report-page" id="page-3">
    <div class="page-kicker">Executive Summary <span>Page 03</span></div>
    <h2>Council Consensus</h2>
    <div class="summary-band"><strong>Core finding</strong><p>AI became a real driver of organizational productivity when it entered operating systems, not when individual employees adopted better assistants. The decisive shift is from prompting to managed workflow: assigned owners, defined permissions, evaluation, cost controls, and reviewable results.</p></div>
    <div class="two-col"><div><h3>Key Findings</h3><ul><li>AI productivity is increasingly institutional.</li><li>Agentic automation is valuable first as workflow compression.</li><li>Governance accelerates adoption when it is embedded and risk-tiered.</li><li>Workforce impact is a role-design and management issue.</li></ul></div><div><h3>Board Takeaways</h3><ul><li>Watch vendor dependency, cyber exposure, and transparency obligations.</li><li>Scale workflows with clear accountability before chasing full autonomy.</li><li>Require productivity evidence that survives audit and operational stress.</li><li>Use quarterly summits to convert brief intelligence into peer exchange.</li></ul></div></div>
    <h3>Decision Framework</h3><div class="framework"><div><strong>Value</strong><span>Does the workflow move cycle time, quality, revenue, risk, or capacity?</span></div><div><strong>Authority</strong><span>Who owns the outcome and where does human approval sit?</span></div><div><strong>Evidence</strong><span>Can the organization inspect inputs, outputs, actions, and exceptions?</span></div><div><strong>Scale</strong><span>Can the pattern repeat across units without custom heroics?</span></div><div><strong>Resilience</strong><span>Can the organization reverse, pause, or audit the workflow under stress?</span></div></div>
  </section>
  {section_pages_html}
  <section class="report-page" id="page-10">
    <div class="page-kicker">Visual Intelligence <span>Page 10</span></div>
    <h2>Operating signals added after the council session</h2>
    <p>The following visuals were added by the brief team after the discussion to organize the patterns that surfaced across contributor comments.</p>
    <h3>Figure 1: AI Operating Maturity</h3><div class="visual-bars"><div>Assist</div><div>Automate</div><div>Orchestrate</div><div>Govern</div><div>Scale</div></div>
    <h3>Figure 2: Productivity Decision Matrix</h3><div class="matrix"><div><h3>Low risk / high repeatability</h3><p>Scale with lightweight controls: service tickets, summaries, knowledge workflows.</p></div><div><h3>High risk / high repeatability</h3><p>Scale slowly with evidence: regulated workflows, citizen-facing decisions, finance controls.</p></div><div><h3>Low risk / low repeatability</h3><p>Keep experimental: local analyst support, research, meeting prep.</p></div><div><h3>High risk / low repeatability</h3><p>Avoid or isolate: unclear authority, sensitive data, weak reversibility.</p></div></div>
  </section>
  <section class="report-page" id="page-11">
    <div class="page-kicker">Sources Reviewed <span>Page 11</span></div>
    <h2>Sources reviewed</h2>
    <p>Citations were added after the moderated council conversation to ground market references, governance frameworks, and current enterprise AI signals in public sources. No paywalled sources are required to follow the brief.</p>
    <ol class="sources-list">{source_items}</ol>
  </section>
  <section class="report-page" id="page-12">
    <div class="page-kicker">Sponsor Partners <span>Page 12</span></div>
    <h2>Sponsor partners and participation model</h2>
    <p>Executive Research Council partners are invited because their executive leaders can contribute useful field intelligence to the conversation. Participation is limited to executive voices with operating knowledge. Sales and marketing teams do not sit in the council session.</p>
    {sponsor_html}
    <div class="summary-band"><strong>Call to action</strong><p>To become part of the Mojo AI Summits Executive AI Intelligence Network, executives must be invited by an existing member or selected for a specific council contribution. Quarterly Mojo AI Summits around the United States bring council intelligence, member discussion, and partner insight into live executive rooms.</p></div>
    <p class="legal">This sample brief is for informational purposes only and is not legal, financial, technical, security, or investment advice. Do not redistribute without written permission. Copyright 2026 Mojo AI Summits. All rights reserved.</p>
  </section>
</section>
</main><footer><div class="wrap">&copy; 2026 MOJO AI Summits. <a href="/briefs/">Executive AI Intelligence Briefs</a></div></footer></body></html>"""

    (brief_dir / "index.html").write_text(archive, encoding="utf-8")
    (detail_dir / "index.html").write_text(detail, encoding="utf-8")


if __name__ == "__main__":
    create_pdf()
    write_html()
    print(f"Wrote {PDF_PATH}")
    print(f"Wrote {OUT_PDF_PATH}")
    print("Wrote /briefs/ and /briefs/ai-innovation-at-operating-scale/")

#!/usr/bin/env python3
"""
Create a daily Mojo AI Summits LinkedIn image and post package.

The script:
- selects the next upcoming Mojo AI Summits virtual event,
- finds a recent AI news article from the last 24 hours related to that event,
- creates editorial LinkedIn post copy,
- generates a cinematic background image,
- composites Scott, the official Mojo logo, and exact readable text,
- writes the finished image and post package under C:/Users/scott/Code/linkedin/DAILY/YYYY-MM-DD.

Required for live generation:
- OPENAI_API_KEY in the process environment or C:/Users/scott/Code/mojo/.env

Optional environment variables:
- OPENAI_TEXT_MODEL, default gpt-5-mini
- OPENAI_IMAGE_MODEL, default gpt-image-2
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import email.utils
import json
import math
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus
from xml.etree import ElementTree

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MOJO_ENV = Path(r"C:\Users\scott\Code\mojo\.env")
EVENT_REGISTRY = ROOT / "functions" / "_virtual-events.js"
DEFAULT_OUTPUT_ROOT = Path(r"C:\Users\scott\Code\linkedin\DAILY")
DEFAULT_LOGO = ROOT / "output" / "linkedin-image-series" / "logo-dark-circular-transparent.png"
FALLBACK_LOGO = ROOT / "assets" / "images" / "logo dark.png"
DEFAULT_SCOTT_REFERENCES = [
    Path(r"C:\Users\scott\AppData\Local\Temp\codex-clipboard-4ae58049-8b0b-486c-b45c-46983cb8a363.png"),
]

PALETTE = {
    "deep_navy": "#0A0F1E",
    "electric_blue": "#1666FF",
    "cyan": "#00E6FF",
    "slate": "#1B2333",
    "white": "#FFFFFF",
}

POSES = [
    "standing three-quarter profile, looking toward a city window",
    "leaning forward at an executive table, hands lightly clasped",
    "standing at a glass wall, one hand near the chin in a thinking pose",
    "seated in a dark boardroom, shoulders turned slightly away from camera",
    "walking through an executive corridor, head turned toward the viewer",
    "standing beside a briefing page, arms relaxed, calm and direct",
    "seated near a window, half profile, attentive and skeptical",
]

SUITS = [
    "charcoal suit with a black open-collar shirt",
    "deep navy suit with a crisp white shirt and no tie",
    "black suit with a slate shirt",
    "midnight blue suit with a subtle textured tie",
    "dark gray blazer with a black crew-neck shirt",
    "navy blazer with a pale blue dress shirt",
    "matte black suit with a white pocket square",
]

@dataclass
class Event:
    slug: str
    title: str
    date_label: str
    start_at: str
    summary: str
    agenda: list[str]


@dataclass
class Article:
    title: str
    url: str
    source: str
    published_at: str
    snippet: str


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$", raw)
        if not match:
            continue
        name, value = match.group(1), match.group(2).strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ.setdefault(name, value)


def clean_string(value: Any) -> str:
    return str(value or "").strip()


def parse_virtual_events(path: Path) -> list[Event]:
    text = path.read_text(encoding="utf-8")
    object_blocks = re.findall(r"\{\s*slug:\s*\"(.*?)\".*?\n\s*\}", text, flags=re.S)
    events: list[Event] = []
    for block in object_blocks:
        full_match = re.search(r"\{\s*slug:\s*\"" + re.escape(block) + r"\".*?\n\s*\}", text, flags=re.S)
        if not full_match:
            continue
        body = full_match.group(0)
        def field(name: str) -> str:
            found = re.search(rf"{name}:\s*\"(.*?)\"", body, flags=re.S)
            return found.group(1).strip() if found else ""
        agenda_match = re.search(r"agenda:\s*\[(.*?)\]", body, flags=re.S)
        agenda = re.findall(r"\"(.*?)\"", agenda_match.group(1), flags=re.S) if agenda_match else []
        events.append(Event(
            slug=field("slug"),
            title=field("title"),
            date_label=field("dateLabel"),
            start_at=field("startAt"),
            summary=field("summary"),
            agenda=agenda,
        ))
    return events


def parse_start(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def select_event(events: list[Event], now: dt.datetime, slug: str | None) -> Event:
    if slug:
        for event in events:
            if event.slug == slug:
                return event
        raise SystemExit(f"Unknown event slug: {slug}")
    upcoming = [event for event in events if parse_start(event.start_at) > now.astimezone(parse_start(event.start_at).tzinfo)]
    if not upcoming:
        raise SystemExit("No upcoming Mojo AI Summits virtual event found.")
    return sorted(upcoming, key=lambda event: parse_start(event.start_at))[0]


def topic_terms(event: Event) -> list[str]:
    source = " ".join([event.title, event.summary, " ".join(event.agenda)]).lower()
    terms = ["artificial intelligence", "AI"]
    mapping = [
        ("readiness", ["AI adoption", "AI strategy", "AI governance", "enterprise AI"]),
        ("data", ["AI data readiness", "retrieval augmented generation", "enterprise data", "knowledge strategy"]),
        ("finance", ["AI ROI", "AI investment", "AI budget", "AI use cases"]),
        ("agent", ["AI agents", "agentic AI", "automation", "human handoffs"]),
        ("workflow", ["AI workflow", "AI integration", "enterprise automation"]),
        ("vendor", ["AI vendors", "model strategy", "AI procurement", "platform lock-in"]),
        ("security", ["AI security", "AI governance", "AI risk", "AI trust"]),
        ("workforce", ["AI workforce", "AI adoption", "change management", "AI talent"]),
        ("budget", ["AI budget", "AI investment", "AI spending", "AI ROI"]),
        ("operating", ["AI operating model", "AI governance", "AI leadership"]),
    ]
    for needle, additions in mapping:
        if needle in source:
            terms.extend(additions)
    return list(dict.fromkeys(terms))


def weak_article_signal(title: str, source: str) -> bool:
    haystack = f"{title} {source}".lower()
    weak_patterns = [
        "press release",
        "newswire",
        "marquis who's who",
        "honors",
        "appoints",
        "advances",
        "growing consulting portfolio",
        "announces",
        "recognized for",
        "leadership and innovation",
        "profiled by",
    ]
    return any(pattern in haystack for pattern in weak_patterns)


def has_ai_signal(text: str) -> bool:
    return "artificial intelligence" in text.lower() or re.search(r"\bAI\b", text) is not None


def gdelt_date(value: str) -> dt.datetime | None:
    value = clean_string(value)
    for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
        try:
            return dt.datetime.strptime(value, fmt).replace(tzinfo=dt.timezone.utc)
        except ValueError:
            pass
    return None


def fetch_recent_article(event: Event, now: dt.datetime) -> Article:
    terms = topic_terms(event)
    query_terms = [term for term in terms if term.lower() not in {"ai", "artificial intelligence"}]
    query_terms = ["artificial intelligence", *query_terms[:7]]
    query = "(" + " OR ".join(f'"{term}"' if " " in term else term for term in query_terms) + ")"
    url = (
        "https://api.gdeltproject.org/api/v2/doc/doc"
        f"?query={quote_plus(query)}"
        "&mode=ArtList"
        "&format=json"
        "&maxrecords=50"
        "&sort=DateDesc"
        "&timespan=24h"
    )
    try:
        response = requests.get(url, timeout=30, headers={"User-Agent": "MojoAISummitsDailyPost/1.0"})
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        return fetch_recent_article_from_google_news(event, now)
    articles = payload.get("articles") or []
    cutoff = now.astimezone(dt.timezone.utc) - dt.timedelta(hours=24)
    scored: list[tuple[int, Article]] = []
    topic_words = [word.lower() for term in terms for word in re.findall(r"[A-Za-z]{4,}", term)]
    for item in articles:
        title = clean_string(item.get("title"))
        article_url = clean_string(item.get("url"))
        if not title or not article_url:
            continue
        seen = gdelt_date(clean_string(item.get("seendate") or item.get("publishedAt")))
        if not seen or seen < cutoff:
            continue
        source = clean_string(item.get("domain"))
        if weak_article_signal(title, source):
            continue
        haystack = " ".join([
            title,
            clean_string(item.get("sourceCountry")),
            source,
            clean_string(item.get("socialimage")),
        ])
        if not has_ai_signal(haystack):
            continue
        haystack = haystack.lower()
        score = 0
        if has_ai_signal(title) or "artificial intelligence" in haystack:
            score += 10
        score += sum(2 for word in topic_words if word in haystack)
        if any(word in haystack for word in ["executive", "enterprise", "business", "governance", "risk", "model"]):
            score += 4
        if any(word in haystack for word in ["stock", "shares", "earnings", "price target", "nasdaq", "nyse"]):
            score -= 12
        if weak_article_signal(title, source):
            score -= 14
        if score <= 0:
            continue
        scored.append((score, Article(
            title=title,
            url=article_url,
            source=source,
            published_at=seen.isoformat(),
            snippet=clean_string(item.get("snippet")),
        )))
    if not scored:
        return fetch_recent_article_from_google_news(event, now)
    scored.sort(key=lambda row: row[0], reverse=True)
    return scored[0][1]


def fetch_recent_article_from_google_news(event: Event, now: dt.datetime) -> Article:
    terms = topic_terms(event)
    query_terms = [term for term in terms if term.lower() not in {"ai", "artificial intelligence"}]
    query_terms = ["artificial intelligence", *query_terms[:6]]
    query = " OR ".join(f'"{term}"' if " " in term else term for term in query_terms)
    rss_url = (
        "https://news.google.com/rss/search"
        f"?q={quote_plus('(' + query + ') when:1d')}"
        "&hl=en-US&gl=US&ceid=US:en"
    )
    response = requests.get(rss_url, timeout=30, headers={"User-Agent": "MojoAISummitsDailyPost/1.0"})
    response.raise_for_status()
    root = ElementTree.fromstring(response.content)
    cutoff = now.astimezone(dt.timezone.utc) - dt.timedelta(hours=24)
    topic_words = [word.lower() for term in terms for word in re.findall(r"[A-Za-z]{4,}", term)]
    scored: list[tuple[int, Article]] = []
    for item in root.findall("./channel/item"):
        title = clean_string(item.findtext("title"))
        link = clean_string(item.findtext("link"))
        source_node = item.find("source")
        source = clean_string(source_node.text if source_node is not None else "")
        pub_raw = clean_string(item.findtext("pubDate"))
        try:
            published = email.utils.parsedate_to_datetime(pub_raw)
            if published.tzinfo is None:
                published = published.replace(tzinfo=dt.timezone.utc)
            published = published.astimezone(dt.timezone.utc)
        except (TypeError, ValueError):
            continue
        if published < cutoff or not title or not link:
            continue
        if weak_article_signal(title, source):
            continue
        haystack_raw = f"{title} {source}"
        if not has_ai_signal(haystack_raw):
            continue
        haystack = haystack_raw.lower()
        score = 0
        if has_ai_signal(title) or "artificial intelligence" in haystack:
            score += 10
        score += sum(2 for word in topic_words if word in haystack)
        if any(word in haystack for word in ["executive", "enterprise", "business", "governance", "risk", "model"]):
            score += 4
        if any(word in haystack for word in ["stock", "shares", "earnings", "price target", "nasdaq", "nyse"]):
            score -= 12
        if weak_article_signal(title, source):
            score -= 14
        if score <= 0:
            continue
        link = resolve_google_news_link(link)
        scored.append((score, Article(
            title=title,
            url=link,
            source=source,
            published_at=published.isoformat(),
            snippet="",
        )))
    if not scored:
        raise SystemExit("No event-relevant AI article from the last 24 hours was found in GDELT or Google News RSS.")
    scored.sort(key=lambda row: row[0], reverse=True)
    return scored[0][1]


def resolve_google_news_link(link: str) -> str:
    if "news.google.com" not in link:
        return link
    try:
        response = requests.get(link, timeout=12, allow_redirects=True, headers={"User-Agent": "MojoAISummitsDailyPost/1.0"})
        if response.url and "news.google.com" not in response.url:
            return response.url
    except requests.RequestException:
        pass
    return link


def openai_response(api_key: str, model: str, instructions: str, user_input: str) -> dict[str, Any]:
    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "instructions": instructions,
            "input": user_input,
            "text": {"format": {"type": "json_object"}},
        },
        timeout=90,
    )
    response.raise_for_status()
    payload = response.json()
    chunks: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                chunks.append(content.get("text", ""))
    text = "\n".join(chunks).strip()
    return json.loads(text)


def create_copy(api_key: str, model: str, event: Event, article: Article, pose: str) -> dict[str, Any]:
    instructions = (
        "You write concise executive thought leadership for Mojo AI Summits. "
        "Return only valid JSON. Do not use em dashes. Do not invent facts beyond the supplied article and event context. "
        "Make the event tie-in subtle, premium, and editorial. Use AI uppercase. "
        "Write like a sharp human operator, not a press release, analyst note, or marketing brochure. "
        "Take a side. The post must say something pointed and potentially controversial. "
        "Use first person when it adds conviction. Use short punchy sentences. "
        "Avoid formulaic phrases including near-term task, leadership baseline, focused cohort, diagnostic discussion, frame these questions, and join us. "
        "Avoid polished filler like landscape, pivotal, transformative, robust, unlock, navigate, leverage, underscores, and highlights. "
        "For image direction, Scott Schindler is always the only human subject. "
        "Never depict, name, or describe a person from the article as the image subject. "
        "Every image must have a current news signal and a strong point of view. "
        "The headline must be an editorial claim, not a topic label or event label."
    )
    user_input = json.dumps({
        "task": "Create a LinkedIn image headline, compact news callout, image prompt, alt text, and LinkedIn post.",
        "event": event.__dict__,
        "article": article.__dict__,
        "pose": pose,
        "brand": {
            "palette": PALETTE,
            "style": "Fast Company, Wired, Bloomberg Businessweek editorial cover energy. Cinematic, premium, restrained.",
            "rules": [
                "small exact Mojo lockup top left",
                "one cinematic executive scene",
                "one strong thought-leadership line",
                "lots of negative space",
                "cyan used sparingly",
                "no fake dashboards",
                "no icon rows",
                "no boxed sections",
                "no giant CTA bar",
                "no fake speakers",
                "no em dashes"
            ],
        },
        "requiredCta": "Do you agree? Disagree? Is this real?",
        "eventUrl": f"https://mojoaisummits.com/virtual/{event.slug}",
        "jsonSchema": {
            "headline": "max 8 words, uppercase, must be a point-of-view claim with a verb, no generic topic labels",
            "subhead": "max 16 words, sentence case, connects the news hook to executive consequence",
            "callout": "short upper-right news signal, max 5 words, preferably starts with NEW TODAY",
            "image_prompt": "mood and scene cue for Scott's editorial portrait, no article-subject names, no logo, no text, leave top-left and lower-right clean",
            "linkedin_post": "human LinkedIn post with a pointed position, current news hook, executive consequence, subtle event tie-in, required CTA, and event URL. 120 to 190 words. No bullet list.",
            "alt_text": "one sentence naming Scott as the subject",
        },
    }, indent=2)
    data = openai_response(api_key, model, instructions, user_input)
    for key in ["headline", "subhead", "callout", "image_prompt", "linkedin_post", "alt_text"]:
        if key not in data or not clean_string(data[key]):
            raise SystemExit(f"Text model response missing required key: {key}")
    data = enforce_news_and_pov(data, event, article)
    data["linkedin_post"] = humanize_positioned_post(clean_string(data["linkedin_post"]), event, article)
    return data


def humanize_positioned_post(post: str, event: Event, article: Article) -> str:
    blocked = [
        "near-term task",
        "leadership baseline",
        "focused cohort",
        "diagnostic discussion",
        "frame these leadership questions",
        "join us",
        "landscape",
        "pivotal",
        "transformative",
        "robust",
        "unlock",
        "navigate",
        "leveraging",
        "underscores",
        "highlights",
    ]
    generic = any(term in post.lower() for term in blocked)
    has_first_person = re.search(r"\b(I|I'm|I’m|we|We)\b", post) is not None
    has_position = any(phrase in post.lower() for phrase in [
        "here is the uncomfortable part",
        "my take",
        "i think",
        "i don't think",
        "the mistake",
        "the uncomfortable",
        "stop treating",
        "not just",
        "that is the point",
    ])
    if not generic and has_first_person and has_position:
        return post

    title = article.title
    source = article.source or "a current news source"
    event_url = f"https://mojoaisummits.com/virtual/{event.slug}"
    lowered = f"{title} {event.title}".lower()
    if "china" in lowered and "weather" in lowered:
        return (
            f"{source} is reporting that China is investing in AI models that generate weather forecasts.\n\n"
            "Here is the uncomfortable part: weather AI is not really about weather. It is about who owns prediction.\n\n"
            "The companies and countries that get better at predictive models will not stop at storms. They will move into logistics, agriculture, insurance, infrastructure, supply chains, and national planning.\n\n"
            "My take: executives are underestimating this because it sounds too scientific. That is a mistake. Predictive AI is going to become a boardroom issue faster than most teams are ready for.\n\n"
            f"This is exactly the kind of readiness question we should be arguing about at Mojo AI Summits: {event.title} on {event.date_label}.\n\n"
            "Do you agree? Disagree? Is this real?\n\n"
            f"{event_url}\n\n"
            f"Source: {title}\n{article.url}"
        )
    if "governance" in lowered or "security" in lowered or "risk" in lowered:
        return (
            f"{source} has a fresh AI governance story out today.\n\n"
            "My take: most companies are still treating AI governance like documentation. That is the wrong mental model.\n\n"
            "Governance is who gets blamed when the model touches money, customers, employees, or regulated decisions. If that answer is fuzzy, the AI program is not mature. It is just busy.\n\n"
            f"That is the tension behind Mojo AI Summits: {event.title} on {event.date_label}. Readiness is not a checklist. It is whether leadership can make decisions before the system makes them by default.\n\n"
            "Do you agree? Disagree? Is this real?\n\n"
            f"{event_url}\n\n"
            f"Source: {title}\n{article.url}"
        )
    return (
        f"{source} has a new AI story worth paying attention to.\n\n"
        "My take: the headline matters less than the pattern. AI keeps moving from tools into operating infrastructure, and a lot of executive teams are still talking about it like software procurement.\n\n"
        "That gap is where bad decisions happen. Vendor choices become strategy. Data choices become risk. Pilot projects become operating models before anyone admits it.\n\n"
        f"That is why {event.title} matters. At Mojo AI Summits on {event.date_label}, the real question is not whether AI is useful. It is whether leadership is ready to own what happens next.\n\n"
        "Do you agree? Disagree? Is this real?\n\n"
        f"{event_url}\n\n"
        f"Source: {title}\n{article.url}"
    )


def enforce_news_and_pov(copy: dict[str, Any], event: Event, article: Article) -> dict[str, Any]:
    headline = clean_string(copy.get("headline")).upper()
    generic_headlines = {
        "AI GOVERNANCE FOR EXECUTIVES",
        "AI EXECUTIVE READINESS",
        "EXECUTIVE AI READINESS",
        "AI READINESS",
        "AI GOVERNANCE",
        event.title.upper(),
    }
    weak = headline in generic_headlines or not any(token in headline for token in [" IS ", " NEEDS ", " REQUIRES ", " STARTS ", " FAILS ", " MOVES ", " BELONGS ", " DEMANDS "])
    if weak:
        title = f"{article.title} {event.title}".lower()
        if "agent" in title:
            headline = "AGENTS NEED OWNERS"
            subhead = "The news keeps proving autonomy is an operating decision."
        elif "security" in title or "governance" in title or "risk" in title:
            headline = "AI RISK NEEDS OWNERS"
            subhead = "New AI governance signals point to leadership, accountability, and control."
        elif "data" in title:
            headline = "DATA READINESS IS STRATEGY"
            subhead = "The news keeps exposing the gap between AI ambition and data reality."
        elif "budget" in title or "investment" in title or "spending" in title:
            headline = "AI SPEND NEEDS PROOF"
            subhead = "The next AI budget fight will reward measurable operating value."
        else:
            headline = "AI READINESS IS LEADERSHIP"
            subhead = "New AI signals keep turning strategy into executive accountability."
        copy["headline"] = headline
        copy["subhead"] = subhead
    if "new" not in clean_string(copy.get("callout")).lower() and "news" not in clean_string(copy.get("callout")).lower():
        copy["callout"] = "NEW TODAY"
    return copy


def image_b64_from_response(response: Any) -> str:
    data = getattr(response, "data", None) or []
    if not data:
        return ""
    first = data[0]
    return getattr(first, "b64_json", "") or ""


def generate_background(api_key: str, model: str, prompt: str, out_path: Path) -> None:
    response = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "prompt": prompt,
            "size": "1024x1024",
            "quality": "high",
        },
        timeout=180,
    )
    response.raise_for_status()
    payload = response.json()
    b64 = payload.get("data", [{}])[0].get("b64_json")
    if not b64:
        raise SystemExit("Image API response did not include b64_json.")
    out_path.write_bytes(base64.b64decode(b64))


def generate_portrait_scene(api_key: str, model: str, prompt: str, reference_path: Path, out_path: Path) -> None:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    with reference_path.open("rb") as image_file:
        response = client.images.edit(
            model=model,
            image=image_file,
            prompt=prompt,
            size="1024x1024",
            quality="high",
        )
    b64 = image_b64_from_response(response)
    if not b64:
        raise SystemExit("Image edit response did not include b64_json.")
    out_path.write_bytes(base64.b64decode(b64))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf") if bold else Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf") if bold else Path(r"C:\Windows\Fonts\segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf") if bold else Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGBA"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def circular_logo(path: Path, size: int) -> Image.Image:
    logo = Image.open(path).convert("RGBA")
    logo = ImageOps.fit(logo, (size, size), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    logo.putalpha(Image.composite(logo.getchannel("A"), mask, logo.getchannel("A")))
    return logo


def remove_flat_background(image: Image.Image) -> Image.Image:
    img = image.convert("RGBA")
    px = img.load()
    width, height = img.size
    corners = [
        px[0, 0],
        px[width - 1, 0],
        px[width // 4, 0],
        px[(width * 3) // 4, 0],
        px[0, height // 4],
        px[width - 1, height // 4],
    ]
    key = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))
    threshold = 105
    visited: set[tuple[int, int]] = set()
    stack: list[tuple[int, int]] = []
    for x in range(width):
        stack.append((x, 0))
        stack.append((x, height - 1))
    for y in range(height):
        stack.append((0, y))
        stack.append((width - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, a = px[x, y]
        distance = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
        blue_or_cyan_backdrop = b > 135 and g > 115 and r < 215 and (b - r) > 25 and (g - r) > 15
        key_is_blue_or_cyan = key[2] > 135 and key[1] > 115 and key[0] < 215
        if blue_or_cyan_backdrop or (key_is_blue_or_cyan and distance < threshold and b > 120 and g > 100):
            px[x, y] = (r, g, b, 0)
            stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return img


def choose_scott_reference(paths: list[Path], seed_date: dt.date) -> Path | None:
    existing = [path for path in paths if path.exists()]
    if not existing:
        return None
    index = seed_date.toordinal() % len(existing)
    return existing[index]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), trial, font=font_obj)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_multiline(draw: ImageDraw.ImageDraw, xy: tuple[int, int], lines: list[str], font_obj: ImageFont.ImageFont, fill: str, spacing: int) -> int:
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=font_obj, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font_obj)
        y = bbox[3] + spacing
    return y


def composite_image(
    background_path: Path,
    logo_path: Path,
    headline: str,
    subhead: str,
    callout: str,
    event: Event,
    out_path: Path,
) -> None:
    canvas = cover_resize(Image.open(background_path), (1080, 1080))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(1080):
        alpha = int(170 * (y / 1080) ** 1.4)
        draw.line([(0, y), (1080, y)], fill=(10, 15, 30, alpha))
    for x in range(1080):
        alpha = int(120 * max(0, 1 - x / 720))
        draw.line([(x, 0), (x, 1080)], fill=(10, 15, 30, alpha))
    canvas = Image.alpha_composite(canvas, overlay)

    draw = ImageDraw.Draw(canvas)
    logo_file = logo_path if logo_path.exists() else FALLBACK_LOGO
    if logo_file.exists():
        logo = circular_logo(logo_file, 108)
        canvas.alpha_composite(logo, (38, 34))

    headline_font = font(70, bold=True)
    subhead_font = font(31, bold=False)
    small_font = font(23, bold=True)
    tiny_font = font(19, bold=False)

    headline_lines = wrap_text(draw, headline.upper(), headline_font, 520)
    y = draw_multiline(draw, (506, 548), headline_lines, headline_font, PALETTE["white"], 6)
    subhead_lines = wrap_text(draw, subhead, subhead_font, 500)
    draw_multiline(draw, (510, y + 18), subhead_lines, subhead_font, "#d7eef5", 8)

    draw.rounded_rectangle((754, 52, 1032, 176), radius=4, outline=PALETTE["cyan"], width=2, fill=(10, 15, 30, 180))
    callout_lines: list[str] = []
    for part in callout.upper().splitlines():
        callout_lines.extend(wrap_text(draw, part, small_font, 232))
    draw_multiline(draw, (778, 76), callout_lines[:3], small_font, PALETTE["white"], 6)

    footer = f"MOJO AI SUMMITS | {event.title.upper()} | {event.date_label.upper()}"
    footer_lines = wrap_text(draw, footer, tiny_font, 820)
    draw_multiline(draw, (38, 1016), footer_lines[:2], tiny_font, "#ffffff", 4)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, quality=95)


def dry_background(path: Path) -> None:
    img = Image.new("RGB", (1024, 1024), PALETTE["deep_navy"])
    draw = ImageDraw.Draw(img)
    for i in range(0, 1024, 24):
        color = (0, 55 + i % 90, 85 + i % 70)
        draw.line((i, 0, 1024 - i // 2, 1024), fill=color, width=1)
    draw.rectangle((500, 160, 940, 730), outline=PALETTE["cyan"], width=3)
    draw.text((540, 430), "DRY RUN BACKGROUND", fill="white", font=font(42, bold=True))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def safe_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "daily-post"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a daily Mojo AI Summits LinkedIn image and post package.")
    parser.add_argument("--event-slug", help="Override the automatically selected next upcoming event.")
    parser.add_argument("--date", help="Run date in YYYY-MM-DD. Defaults to today.")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--env-file", default=str(MOJO_ENV))
    parser.add_argument("--logo", default=str(DEFAULT_LOGO))
    parser.add_argument("--scott", action="append", help="Add a Scott reference image path. Can be repeated.")
    parser.add_argument("--dry-run", action="store_true", help="Skip OpenAI calls and make a deterministic proof package.")
    args = parser.parse_args()

    load_env_file(Path(args.env_file))
    run_date = dt.date.fromisoformat(args.date) if args.date else dt.datetime.now().date()
    now = dt.datetime.combine(run_date, dt.datetime.now().time(), tzinfo=dt.datetime.now().astimezone().tzinfo)
    events = parse_virtual_events(EVENT_REGISTRY)
    event = select_event(events, now, args.event_slug)
    pose = POSES[run_date.toordinal() % len(POSES)]
    suit = SUITS[run_date.toordinal() % len(SUITS)]
    article = fetch_recent_article(event, now)
    scott_paths = [Path(value) for value in args.scott] if args.scott else DEFAULT_SCOTT_REFERENCES
    scott_path = choose_scott_reference(scott_paths, run_date)

    out_dir = Path(args.output_root) / run_date.isoformat()
    out_dir.mkdir(parents=True, exist_ok=True)
    suffix = "-dry-run" if args.dry_run else ""
    background_path = out_dir / f"generated-background{suffix}.png"
    final_path = out_dir / f"{safe_slug(event.slug)}-{run_date.isoformat()}-linkedin{suffix}.png"
    post_path = out_dir / f"post{suffix}.md"
    metadata_path = out_dir / f"metadata{suffix}.json"
    article_path = out_dir / f"article{suffix}.json"
    script_archive_path = out_dir / f"daily-linkedin-ai-post-{run_date.isoformat()}{suffix}.py"

    api_key = os.environ.get("OPENAI_API_KEY", "")
    text_model = os.environ.get("OPENAI_TEXT_MODEL", "gpt-5-mini")
    image_model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2")

    if args.dry_run:
        copy = {
            "headline": "AI READINESS JUST GOT REAL",
            "subhead": f"{event.title} now has a live market signal to discuss.",
            "callout": "24-hour AI signal",
            "image_prompt": "Dry-run placeholder. No API call made.",
            "linkedin_post": (
                f"AI readiness is no longer theoretical.\n\n"
                f"A recent article from {article.source or 'a current news source'} raises a practical executive question: "
                f"how quickly should leaders adjust AI plans when the market changes this fast?\n\n"
                f"At Mojo AI Summits, we are bringing executives together for **{event.title}** on **{event.date_label}** "
                f"to compare what is actually working, what is not ready yet, and what leaders need to decide next.\n\n"
                f"Article: {article.title}\n{article.url}\n\n"
                f"**Do you agree? Disagree? Is this real?**\n\n"
                f"https://mojoaisummits.com/virtual/{event.slug}"
            ),
            "alt_text": f"Mojo AI Summits editorial image for {event.title} tied to a current AI news article.",
        }
        dry_background(background_path)
    else:
        if not api_key:
            raise SystemExit("OPENAI_API_KEY is required for live generation. Use --dry-run to test without API calls.")
        copy = create_copy(api_key, text_model, event, article, pose)
        image_prompt = (
            "Use the provided live reference image to preserve Scott Schindler's real likeness: white hair, white beard, friendly executive presence, realistic facial proportions. "
            "Scott is the only human subject in the image. Do not depict or reference any person named in the news article. "
            f"Change Scott's wardrobe to a {suit}. Pose: {pose}. "
            f"Create a full premium editorial portrait scene for this Mojo AI Summits topic: {event.title}. "
            f"Use this news hook only as visual mood context, not as a person to depict: {article.title}. "
            f"Scene cue: {copy['image_prompt']} "
            "Do not render any text, logo, watermark, badge, icon row, dashboard, boxed section, or CTA bar. "
            "Keep top-left clean for the official Mojo logo and keep the lower-right clean for exact typography. "
            "Use deep navy, slate, white, restrained cyan, and electric blue. Keep it premium, cinematic, realistic, and not cartoonish."
        )
        copy["image_prompt"] = image_prompt
        if "scott" not in clean_string(copy.get("alt_text")).lower():
            copy["alt_text"] = f"Scott Schindler in a realistic editorial portrait for {event.title}, with cinematic lighting and restrained Mojo AI Summits branding."
        if scott_path and scott_path.exists():
            generate_portrait_scene(api_key, image_model, image_prompt, scott_path, background_path)
        else:
            generate_background(api_key, image_model, image_prompt, background_path)

    composite_image(
        background_path=background_path,
        logo_path=Path(args.logo),
        headline=copy["headline"],
        subhead=copy["subhead"],
        callout=copy["callout"],
        event=event,
        out_path=final_path,
    )

    article_path.write_text(json.dumps(article.__dict__, indent=2) + "\n", encoding="utf-8")
    shutil.copy2(Path(__file__).resolve(), script_archive_path)
    metadata = {
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "runDate": run_date.isoformat(),
        "event": event.__dict__,
        "article": article.__dict__,
        "pose": pose,
        "suit": suit,
        "scottReference": str(scott_path) if scott_path else "",
        "logo": str(Path(args.logo)),
        "background": str(background_path),
        "image": str(final_path),
        "scriptArchive": str(script_archive_path),
        "dryRun": args.dry_run,
        "textModel": "" if args.dry_run else text_model,
        "imageModel": "" if args.dry_run else image_model,
        "copy": copy,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    post_md = f"""# Daily LinkedIn AI Post

Date: {run_date.isoformat()}

Event: {event.title}

Event URL: https://mojoaisummits.com/virtual/{event.slug}

Article: [{article.title}]({article.url})

Source: {article.source}

Published or seen: {article.published_at}

Image: `{final_path}`

Alt text: {copy["alt_text"]}

## Post Copy

{copy["linkedin_post"]}

## Image Prompt

{copy["image_prompt"]}
"""
    post_path.write_text(post_md, encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "dryRun": args.dry_run,
        "event": event.title,
        "article": article.title,
        "image": str(final_path),
        "post": str(post_path),
        "metadata": str(metadata_path),
        "script": str(script_archive_path),
    }, indent=2))


if __name__ == "__main__":
    main()

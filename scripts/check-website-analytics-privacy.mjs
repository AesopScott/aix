import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const distDir = join(root, "dist");
const standardPath = join(root, "docs", "processes", "website-analytics-privacy-conversion-standards.md");
const privacyPath = join(distDir, "privacy", "index.html");

const prohibitedPatterns = [
  { name: "Google Analytics / gtag", pattern: /gtag\s*\(|googletagmanager\.com\/gtag\/js|google-analytics\.com/i },
  { name: "Google Tag Manager", pattern: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i },
  { name: "Meta Pixel", pattern: /connect\.facebook\.net|fbq\s*\(/i },
  { name: "LinkedIn Insight Tag", pattern: /snap\.licdn\.com|lintrk\s*\(/i },
  { name: "Microsoft Clarity", pattern: /clarity\.ms|clarity\s*\(/i },
  { name: "Hotjar", pattern: /hotjar\.com|hj\s*\(/i },
  { name: "PostHog", pattern: /posthog\.com|posthog\.init/i },
  { name: "Plausible", pattern: /plausible\.io\/js\/script/i },
  { name: "TikTok Pixel", pattern: /analytics\.tiktok\.com|ttq\.load/i },
  { name: "Microsoft Ads UET", pattern: /bat\.bing\.com|uetq/i },
  { name: "Session replay", pattern: /fullstory\.com|logrocket\.com|mouseflow\.com|smartlook\.com/i }
];

const requiredPrivacyText = [
  "Website Analytics and Cookies",
  "Conversion Measurement",
  "advertising pixels",
  "non-essential analytics cookies",
  "campaign URL parameters"
];

const failures = [];

function walkHtml(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkHtml(fullPath));
    } else if (entry.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function read(path) {
  return readFileSync(path, "utf8");
}

try {
  read(standardPath);
} catch {
  failures.push(`Missing analytics standard: ${relative(root, standardPath)}`);
}

let privacyHtml = "";
try {
  privacyHtml = read(privacyPath);
} catch {
  failures.push(`Missing privacy page: ${relative(root, privacyPath)}`);
}

for (const text of requiredPrivacyText) {
  if (privacyHtml && !privacyHtml.includes(text)) {
    failures.push(`Privacy page missing required notice text: ${text}`);
  }
}

for (const file of walkHtml(distDir)) {
  const html = read(file);
  for (const { name, pattern } of prohibitedPatterns) {
    if (pattern.test(html)) {
      failures.push(`${relative(root, file)} contains prohibited tracker pattern: ${name}`);
    }
  }
}

if (failures.length) {
  console.error("Website analytics/privacy launch gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Website analytics/privacy launch gate passed.");

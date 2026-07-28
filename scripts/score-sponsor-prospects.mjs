import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = arg("--in") || arg("-i") || path.join(root, "docs/processes/sponsor-curation-tracker-template.csv");
const outputPath = arg("--out") || arg("-o") || path.join(root, "output/sponsor-curation-score-report.json");

const scoreFields = [
  ["ai_relevance_score", 20],
  ["event_sponsorship_behavior_score", 20],
  ["executive_audience_fit_score", 20],
  ["mojo_model_fit_score", 20],
  ["commercial_readiness_score", 10],
  ["contactability_score", 10]
];

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === "\"" && next === "\"") {
      value += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((entry) => entry.trim())) rows.push(row);
  return rows;
}

function cleanHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRows(rows) {
  const [headers, ...records] = rows;
  const keys = headers.map(cleanHeader);
  return records.map((record, index) => {
    const row = { row_number: index + 2 };
    keys.forEach((key, fieldIndex) => {
      if (key) row[key] = String(record[fieldIndex] || "").trim();
    });
    return row;
  });
}

function numberInRange(value, max) {
  const parsed = Number(String(value || "").trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
}

function hasEvidence(row, field) {
  return Boolean(String(row[field] || "").trim());
}

function recommendedStage(row, totalScore) {
  if (hasEvidence(row, "disqualification_reason")) return "disqualified";

  const hasAiEvidence = hasEvidence(row, "ai_relevance_note") && numberInRange(row.ai_relevance_score, 20) > 0;
  const hasEventEvidence = hasEvidence(row, "event_behavior_note") && numberInRange(row.event_sponsorship_behavior_score, 20) > 0;

  if (!hasAiEvidence || !hasEventEvidence) return "researching";
  if (totalScore >= 75) return "priority";
  if (totalScore >= 55) return "qualified";
  return "research_queue";
}

function missingGates(row) {
  const missing = [];
  if (!hasEvidence(row, "ai_relevance_note")) missing.push("ai_relevance_note");
  if (!hasEvidence(row, "event_behavior_note")) missing.push("event_behavior_note");
  if (!hasEvidence(row, "evidence_urls")) missing.push("evidence_urls");
  if (!hasEvidence(row, "primary_contact_email") && !hasEvidence(row, "warm_path")) {
    missing.push("primary_contact_email_or_warm_path");
  }
  return missing;
}

function scoreProspect(row) {
  const components = Object.fromEntries(
    scoreFields.map(([field, max]) => [field, numberInRange(row[field], max)])
  );
  const totalScore = Object.values(components).reduce((sum, value) => sum + value, 0);
  return {
    ...row,
    score_components: components,
    total_score: totalScore,
    recommended_stage: recommendedStage(row, totalScore),
    missing_gates: missingGates(row)
  };
}

function summarize(prospects) {
  const byStage = prospects.reduce((acc, prospect) => {
    acc[prospect.recommended_stage] = (acc[prospect.recommended_stage] || 0) + 1;
    return acc;
  }, {});

  return {
    total: prospects.length,
    priorityCount: prospects.filter((prospect) => prospect.recommended_stage === "priority").length,
    qualifiedCount: prospects.filter((prospect) => prospect.recommended_stage === "qualified").length,
    missingEvidenceCount: prospects.filter((prospect) => prospect.missing_gates.length > 0).length,
    byStage
  };
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input CSV not found: ${inputPath}`);
  }

  const parsed = parseCsv(fs.readFileSync(inputPath, "utf8"));
  const prospects = normalizeRows(parsed)
    .filter((row) => row.company_name || row.domain)
    .map(scoreProspect)
    .sort((a, b) => b.total_score - a.total_score || String(a.company_name).localeCompare(String(b.company_name)));

  const report = {
    createdAt: new Date().toISOString(),
    inputPath,
    scoreMax: 100,
    summary: summarize(prospects),
    prospects
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Scored ${prospects.length} sponsor prospect(s). Wrote ${outputPath}.`);
}

main();

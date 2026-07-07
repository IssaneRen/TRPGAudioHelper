#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function usage() {
  console.error("Usage: node scripts/export-pdf-transcript.mjs <input.json> --format <md|text> --out <path>");
  process.exit(1);
}

const [input, ...args] = process.argv.slice(2);
const formatIndex = args.indexOf("--format");
const outIndex = args.indexOf("--out");
if (!input || formatIndex === -1 || outIndex === -1) usage();

const format = args[formatIndex + 1];
const outPath = args[outIndex + 1];
if (!outPath || (format !== "md" && format !== "text")) usage();

const transcript = JSON.parse(readFileSync(input, "utf8"));
const pages = Array.isArray(transcript.pages) ? transcript.pages : [];

if (format === "md") {
  const lines = [
    `# ${transcript.title ?? "PDF transcript"}`,
    "",
    `- Source PDF: \`${transcript.sourcePdf ?? ""}\``,
    `- Page range: ${transcript.pageStart ?? ""}-${transcript.pageEnd ?? ""}`,
    "",
  ];
  for (const page of pages) {
    lines.push(`## Page ${page.page}`, "", "```text", page.text ?? "", "```", "");
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  process.exit(0);
}

mkdirSync(outPath, { recursive: true });
for (const page of pages) {
  const pageNumber = String(page.page).padStart(3, "0");
  writeFileSync(join(outPath, `page-${pageNumber}.txt`), `${page.text ?? ""}\n`, "utf8");
}

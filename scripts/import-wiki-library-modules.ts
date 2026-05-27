import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { WikiEntryRecord, WikiModule } from "../src/types/wiki";
import {
  WIKI_ENTRIES_DIR,
  WIKI_MODULES_FILE,
  readJsonFile,
  writeJsonFile,
  writeWikiEntryRecord,
} from "./wiki-data";

const IMPORT_PREFIX = "module.library.";
const IMPORT_DATE = "2026-05-28T00:00:00+08:00";
const CLASSIC_MODULE_LIMIT = 12;
const CLASSIC_SAMPLE_SEED = 20260528;

interface LibraryRow {
  originalName: string;
  chineseName: string;
  era: string;
}

const ERA_TAGS: Record<string, string> = {
  Classic: "1920 年代",
  Modern: "现代",
  Gaslight: "煤气灯时代",
  "Classic (Scotland)": "1920 年代 / 苏格兰",
  "Near Future": "近未来",
  Future: "未来",
  Colonial: "殖民时期",
  "Modern (San Francisco)": "现代 / 旧金山",
  "16th Century Spain": "16 世纪 / 西班牙",
  Invictus: "古罗马",
  "1970s": "1970 年代",
  "Classical China": "古代中国",
  "World War II": "二战时期",
  "1950": "1950 年代",
  "Stalin's Russia": "斯大林时期俄罗斯",
  "Classic (Solo)": "1920 年代 / 单人",
  "1750s England": "1750 年代 / 英格兰",
  "Gaslight Paris": "煤气灯时代 / 巴黎",
};

const CHINESE_NAME_OVERRIDES: Record<string, string> = {
  "Dead On Arrival 2": "死亡到访 2",
};

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSummary(tag: string): string {
  return `以${tag}为背景的《克苏鲁的呼唤》调查模组。`;
}

function buildDisplayName(chineseName: string, originalName: string): string {
  const compactName = chineseName.replace(/\s+/g, "");
  return Array.from(compactName).length <= 4
    ? `《${chineseName}-${originalName}》`
    : chineseName;
}

function seededScore(value: string): number {
  let score = CLASSIC_SAMPLE_SEED;
  for (const character of value) {
    score = Math.imul(score ^ character.charCodeAt(0), 16777619);
  }
  return score >>> 0;
}

function extractRows(html: string): LibraryRow[] {
  const tables = html.match(/<table class="bbc_table">[\s\S]*?<\/table>/gi) || [];
  const rowsByName = new Map<string, LibraryRow>();

  for (const table of tables) {
    if (!table.includes("下载链接") || !table.includes("名字")) continue;

    const rows = table.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows.slice(1)) {
      const rawCells = Array.from(row.matchAll(/<td>([\s\S]*?)<\/td>/gi), (match) => match[1]);
      if (rawCells.length !== 8 || !/<a\s+href=/i.test(rawCells[7])) continue;

      const originalName = decodeHtml(rawCells[1]);
      const chineseName = CHINESE_NAME_OVERRIDES[originalName] || decodeHtml(rawCells[5]);
      const era = decodeHtml(rawCells[4]);
      if (!originalName || !chineseName || rowsByName.has(originalName.toLowerCase())) continue;
      rowsByName.set(originalName.toLowerCase(), { originalName, chineseName, era });
    }
  }

  return Array.from(rowsByName.values());
}

function removePreviousImports() {
  if (!existsSync(WIKI_ENTRIES_DIR)) return;

  for (const fileName of readdirSync(WIKI_ENTRIES_DIR)) {
    if (fileName.startsWith(IMPORT_PREFIX) && fileName.endsWith(".json")) {
      unlinkSync(join(WIKI_ENTRIES_DIR, fileName));
    }
  }
}

const sourceFile = process.argv[2];
if (!sourceFile) {
  throw new Error("请提供奥恩图书馆资源索引 HTML 文件路径。");
}

const rows = extractRows(readFileSync(sourceFile, "utf-8"));
if (rows.length === 0) {
  throw new Error("未找到下载链接不为空的模组行。");
}

const existingModules = readJsonFile<WikiModule[]>(WIKI_MODULES_FILE).filter(
  (module) => !module.id.startsWith(IMPORT_PREFIX)
);
const importedModules: WikiModule[] = rows
  .filter(({ era }) => era === "Classic")
  .map(({ originalName, chineseName, era }) => {
    const tag = ERA_TAGS[era] || era || "未分类";
    const slug = slugify(originalName);
    if (!slug) {
      throw new Error(`无法为模组生成唯一键：${originalName}`);
    }
    return {
      id: `${IMPORT_PREFIX}${slug}`,
      displayName: buildDisplayName(chineseName, originalName),
      summary: buildSummary(tag),
      tags: [tag],
    };
  })
  .sort((left, right) => seededScore(left.id) - seededScore(right.id))
  .slice(0, CLASSIC_MODULE_LIMIT);
const importedIds = new Set(importedModules.map((module) => module.id));
if (importedIds.size !== importedModules.length) {
  throw new Error("导入模组生成了重复唯一键，请检查名称冲突。");
}

removePreviousImports();
for (const module of importedModules) {
  const entry: WikiEntryRecord = {
    id: module.id,
    category: "module",
    displayName: module.displayName,
    summary: module.summary || "",
    tags: module.tags,
    moduleIds: [module.id],
    content: [
      {
        type: "paragraph",
        tokens: [{ type: "text", text: module.summary || "" }],
      },
    ],
    createdAt: IMPORT_DATE,
    updatedAt: IMPORT_DATE,
  };
  writeWikiEntryRecord(entry);
}

writeJsonFile(WIKI_MODULES_FILE, [...existingModules, ...importedModules]);
console.log(`已导入 ${importedModules.length} 个带下载资源的模组初始条目。`);

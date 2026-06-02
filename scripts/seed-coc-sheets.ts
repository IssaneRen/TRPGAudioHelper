import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WikiBlock, WikiEntryRecord } from "../src/types/wiki";
import { generateCocSheetData } from "../src/utils/coc-sheet";

const ENTRIES_DIR = "public/wiki/entities/entries";
const CHARACTER_IDS = [
  "char.adam",
  "char.allen",
  "char.gan",
  "char.kiven",
  "char.leina",
  "char.leo",
] as const;

const GROWTH_BY_CHARACTER: Record<
  string,
  { skillName: string; growth: number; changes: { delta: number; reason: string; at?: string; reportId?: string }[] }
> = {
  "char.allen": {
    skillName: "急救",
    growth: 8,
    changes: [
      {
        delta: 5,
        reason: "金斯波特模组：医院急救实践",
        at: "1928-11-06",
        reportId: "report.mist-city-record-20260524",
      },
      {
        delta: 3,
        reason: "噩梦事件后创伤护理复盘",
        at: "1928-11-09",
        reportId: "report.mist-city-record-20260524",
      },
    ],
  },
  "char.leina": {
    skillName: "侦查",
    growth: 6,
    changes: [
      {
        delta: 6,
        reason: "雾城档案：街头与医院外围调查",
        at: "1928-11-08",
        reportId: "report.mist-city-record-20260524",
      },
    ],
  },
  "char.gan": {
    skillName: "图书馆",
    growth: 5,
    changes: [
      {
        delta: 5,
        reason: "查阅金斯波特地方志与病历",
        at: "1928-11-07",
      },
    ],
  },
};

function hasCocSheet(content: WikiBlock[]): boolean {
  return content.some((block) => block.type === "coc-sheet");
}

function buildCocBlock(entryId: string): WikiBlock {
  const growthDemo = GROWTH_BY_CHARACTER[entryId]
    ? [GROWTH_BY_CHARACTER[entryId]]
    : undefined;
  const cocData = generateCocSheetData(entryId, { growthDemo });
  return { type: "coc-sheet", cocData };
}

function seedEntry(entryId: string, force = false) {
  const filePath = join(ENTRIES_DIR, `${entryId}.json`);
  const entry = JSON.parse(readFileSync(filePath, "utf-8")) as WikiEntryRecord;

  if (hasCocSheet(entry.content) && !force) {
    console.log(`跳过 ${entryId}：已存在 coc-sheet`);
    return;
  }

  const cocBlock = buildCocBlock(entryId);
  entry.content = [cocBlock, ...entry.content.filter((block) => block.type !== "coc-sheet")];
  writeFileSync(filePath, JSON.stringify(entry, null, 2) + "\n");
  console.log(`已写入 ${entryId} 的 coc-sheet`);
}

function main() {
  const files = readdirSync(ENTRIES_DIR).filter((name) => name.startsWith("char.") && name.endsWith(".json"));
  const targets = CHARACTER_IDS.filter((id) => files.includes(`${id}.json`));

  const force = process.argv.includes("--force");
  for (const entryId of targets) {
    seedEntry(entryId, force);
  }

  console.log(`完成：处理 ${targets.length} 张人物卡`);
}

main();

import { splitLegacyWikiEntriesFile } from "./wiki-data";

const result = splitLegacyWikiEntriesFile();

if (result.skipped) {
  console.log("ℹ️ 未发现旧版 public/wiki/entities/entries.json，跳过拆分。");
} else {
  console.log(`✅ 已拆分 wiki 词条为单文件，共 ${result.created} 条。`);
}

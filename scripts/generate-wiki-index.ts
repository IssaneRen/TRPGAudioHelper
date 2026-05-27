import { WIKI_INDEX_OUTPUT_FILE, generateWikiIndex } from "./wiki-data";

const { entriesCount } = generateWikiIndex();
console.log(`✅ 生成 ${WIKI_INDEX_OUTPUT_FILE}，共 ${entriesCount} 条 wiki 词条`);

#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const DEFAULT_MD_DIR = "public/wiki/entities/md";
const DEFAULT_JSON_DIR = "public/wiki/entities/entries";
const STATUS_DONE = "已转换为json";
const STATUS_PENDING = "待转换json";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) throw new Error(`未知参数：${item}`);
    const key = item.slice(2);
    if (key === "no-status-update") {
      args[key] = true;
      continue;
    }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`缺少 --${key} 参数值`);
    args[key] = value;
    index += 1;
  }
  return args;
}

function splitFrontmatter(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: {}, body: raw, frontmatterLines: [] };
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return { frontmatter: {}, body: raw, frontmatterLines: [] };
  const frontmatterLines = lines.slice(1, end);
  return {
    frontmatter: parseFrontmatter(frontmatterLines),
    body: lines.slice(end + 1).join("\n"),
    frontmatterLines,
  };
}

function parseFrontmatter(lines) {
  const result = {};
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = parseValue(match[2]);
  }
  return result;
}

function parseValue(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value.includes(",")) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value;
}

function formatValue(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return String(value ?? "");
}

function upsertFrontmatter(raw, patch) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") {
    const frontmatter = Object.entries(patch).map(([key, value]) => `${key}: ${formatValue(value)}`);
    return ["---", ...frontmatter, "---", raw].join("\n");
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return raw;
  const seen = new Set();
  const next = lines.slice(1, end).map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (!match || !(match[1] in patch)) return line;
    seen.add(match[1]);
    return `${match[1]}: ${formatValue(patch[match[1]])}`;
  });
  for (const [key, value] of Object.entries(patch)) {
    if (!seen.has(key)) next.push(`${key}: ${formatValue(value)}`);
  }
  return ["---", ...next, "---", ...lines.slice(end + 1)].join("\n");
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function makeParserContext(frontmatter) {
  return {
    secretPlayerIds: toArray(frontmatter.secretPlayerIds ?? frontmatter.playerIds),
    secretTitle: frontmatter.secretTitle || "已授权档案",
    secretHiddenMode: frontmatter.secretHiddenMode || "mask",
  };
}

function isBlockBoundary(line) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("- ") ||
    trimmed.startsWith(">") ||
    trimmed.startsWith("![") ||
    trimmed === "【加密块】" ||
    trimmed === "【/加密块】" ||
    trimmed.startsWith("```wiki-coc-sheet")
  );
}

function parseBlocks(body, context) {
  return parseBlockLines(body.replace(/\r\n/g, "\n").split("\n"), context).blocks;
}

function parseBlockLines(lines, context, startIndex = 0, stopAtSecretEnd = false) {
  const blocks = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === "【/加密块】") {
      if (!stopAtSecretEnd) throw new Error("遇到未配对的 【/加密块】");
      return { blocks, index: index + 1 };
    }

    if (trimmed === "【加密块】") {
      const parsed = parseBlockLines(lines, context, index + 1, true);
      blocks.push({
        type: "secret-panel",
        title: context.secretTitle,
        hiddenMode: context.secretHiddenMode,
        playerIds: context.secretPlayerIds,
        blocks: parsed.blocks,
      });
      index = parsed.index;
      continue;
    }

    if (trimmed.startsWith("```wiki-coc-sheet")) {
      const jsonLines = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "```") {
        jsonLines.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new Error("wiki-coc-sheet 代码块缺少结束 ```");
      blocks.push({ type: "coc-sheet", cocData: JSON.parse(jsonLines.join("\n")) });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", text: heading[2].trim() });
      index += 1;
      continue;
    }

    const image = trimmed.match(/^!\[(.*)]\((.+)\)$/);
    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", tokens: parseInline(quoteLines.join("\n"), context) });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(parseInline(lines[index].trim().slice(2), context));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockBoundary(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", tokens: parseInline(paragraphLines.join("\n"), context) });
  }

  if (stopAtSecretEnd) throw new Error("【加密块】 缺少 【/加密块】");
  return { blocks, index };
}

function parseInline(text, context) {
  const tokens = [];
  let index = 0;

  function pushText(value) {
    if (!value) return;
    tokens.push({ type: "text", text: value });
  }

  while (index < text.length) {
    const secretIndex = text.indexOf("【加密字】", index);
    const refIndex = text.indexOf("[[", index);
    const candidates = [secretIndex, refIndex].filter((item) => item >= 0);
    const next = candidates.length ? Math.min(...candidates) : -1;

    if (next < 0) {
      pushText(text.slice(index));
      break;
    }

    pushText(text.slice(index, next));

    if (next === secretIndex) {
      const contentStart = next + "【加密字】".length;
      const end = text.indexOf("【/加密字】", contentStart);
      if (end < 0) throw new Error("【加密字】 缺少 【/加密字】");
      tokens.push({
        type: "secret-inline",
        text: text.slice(contentStart, end),
        playerIds: context.secretPlayerIds,
      });
      index = end + "【/加密字】".length;
      continue;
    }

    const end = text.indexOf("]]", next + 2);
    if (end < 0) {
      pushText(text.slice(next));
      break;
    }
    const raw = text.slice(next + 2, end);
    const [label, entryId] = raw.split("|");
    if (label && entryId) {
      tokens.push({ type: "ref", label: label.trim(), entryId: entryId.trim() });
    } else {
      pushText(text.slice(next, end + 2));
    }
    index = end + 2;
  }

  return tokens;
}

function buildEntry(mdPath, outPath) {
  const raw = readFileSync(mdPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const existing = outPath && existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};
  const id = frontmatter.id || existing.id || basename(mdPath, ".md");
  const createdAt = frontmatter.createdAt || existing.createdAt || today();

  return {
    id,
    category: frontmatter.category || existing.category || "character",
    displayName: frontmatter.displayName || existing.displayName || id,
    summary: frontmatter.summary || existing.summary || "",
    ...(frontmatter.avatar || existing.avatar ? { avatar: frontmatter.avatar || existing.avatar } : {}),
    ...(frontmatter.aliasNames || existing.aliasNames ? { aliasNames: toArray(frontmatter.aliasNames || existing.aliasNames) } : {}),
    ...(frontmatter.playerIds || existing.playerIds ? { playerIds: toArray(frontmatter.playerIds || existing.playerIds) } : {}),
    ...(frontmatter.moduleIds || existing.moduleIds ? { moduleIds: toArray(frontmatter.moduleIds || existing.moduleIds) } : {}),
    ...(frontmatter.relatedEntryIds || existing.relatedEntryIds ? { relatedEntryIds: toArray(frontmatter.relatedEntryIds || existing.relatedEntryIds) } : {}),
    ...(frontmatter.relatedEntryAccess || existing.relatedEntryAccess ? { relatedEntryAccess: frontmatter.relatedEntryAccess || existing.relatedEntryAccess } : {}),
    ...(frontmatter.facts || existing.facts ? { facts: frontmatter.facts || existing.facts } : {}),
    ...(frontmatter.tags || existing.tags ? { tags: toArray(frontmatter.tags || existing.tags) } : {}),
    content: parseBlocks(body, makeParserContext(frontmatter)),
    createdAt,
    updatedAt: today(),
  };
}

function mdToJson(args) {
  const mdPath = args.in;
  if (!mdPath) throw new Error("md-to-json 需要 --in <md>");
  const raw = readFileSync(mdPath, "utf-8");
  const { frontmatter } = splitFrontmatter(raw);
  const id = frontmatter.id || basename(mdPath, ".md");
  const outPath = args.out || frontmatter.jsonPath || join(DEFAULT_JSON_DIR, `${id}.json`);
  const entry = buildEntry(mdPath, outPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(entry, null, 2) + "\n");
  if (!args["no-status-update"]) {
    writeFileSync(mdPath, upsertFrontmatter(raw, { wikiStatus: STATUS_DONE, convertedAt: today() }));
  }
  console.log(`已转换 ${mdPath} -> ${outPath}`);
}

function scanMd(args) {
  const dir = args.dir || DEFAULT_MD_DIR;
  if (!existsSync(dir)) throw new Error(`目录不存在：${dir}`);
  const files = readdirSync(dir).filter((fileName) => fileName.endsWith(".md")).sort();
  for (const fileName of files) {
    const mdPath = join(dir, fileName);
    const raw = readFileSync(mdPath, "utf-8");
    const { frontmatter } = splitFrontmatter(raw);
    if (frontmatter.wikiStatus === STATUS_DONE) continue;
    mdToJson({ ...args, in: mdPath, out: undefined });
  }
}

function jsonToMd(args) {
  const jsonPath = args.in;
  if (!jsonPath) throw new Error("json-to-md 需要 --in <json>");
  const entry = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const outPath = args.out || join(DEFAULT_MD_DIR, `${entry.id}.md`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, entryToMarkdown(entry, jsonPath));
  console.log(`已转换 ${jsonPath} -> ${outPath}`);
}

function entryToMarkdown(entry, jsonPath) {
  const frontmatter = {
    id: entry.id,
    category: entry.category,
    displayName: entry.displayName,
    summary: entry.summary || "",
    ...(entry.avatar ? { avatar: entry.avatar } : {}),
    ...(entry.aliasNames ? { aliasNames: entry.aliasNames } : {}),
    ...(entry.playerIds ? { playerIds: entry.playerIds } : {}),
    ...(entry.moduleIds ? { moduleIds: entry.moduleIds } : {}),
    ...(entry.relatedEntryIds ? { relatedEntryIds: entry.relatedEntryIds } : {}),
    ...(entry.relatedEntryAccess ? { relatedEntryAccess: entry.relatedEntryAccess } : {}),
    ...(entry.facts ? { facts: entry.facts } : {}),
    ...(entry.tags ? { tags: entry.tags } : {}),
    secretPlayerIds: entry.playerIds || [],
    wikiStatus: STATUS_PENDING,
    jsonPath,
  };
  const frontmatterText = Object.entries(frontmatter).map(([key, value]) => `${key}: ${formatValue(value)}`);
  return ["---", ...frontmatterText, "---", "", ...blocksToMarkdown(entry.content || [])].join("\n") + "\n";
}

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === "heading") lines.push(`## ${block.text || ""}`, "");
    if (block.type === "paragraph") lines.push(tokensToMarkdown(block.tokens || []), "");
    if (block.type === "quote") lines.push(`> ${tokensToMarkdown(block.tokens || [])}`, "");
    if (block.type === "image") lines.push(`![${block.alt || ""}](${block.src || ""})`, "");
    if (block.type === "list") {
      for (const item of block.items || []) lines.push(`- ${tokensToMarkdown(item)}`);
      lines.push("");
    }
    if (block.type === "coc-sheet") {
      lines.push("```wiki-coc-sheet", JSON.stringify(block.cocData || {}, null, 2), "```", "");
    }
    if (block.type === "secret-panel") {
      lines.push("【加密块】", ...blocksToMarkdown(block.blocks || []), "【/加密块】", "");
    }
  }
  while (lines.at(-1) === "") lines.pop();
  return lines;
}

function tokensToMarkdown(tokens) {
  return tokens.map((token) => {
    if (token.type === "ref") return `[[${token.label || token.entryId}|${token.entryId}]]`;
    if (token.type === "secret-inline") return `【加密字】${token.text || ""}【/加密字】`;
    let text = token.text || "";
    if (token.bold) text = `**${text}**`;
    if (token.strikethrough) text = `~~${text}~~`;
    return text;
  }).join("");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "md-to-json") return mdToJson(args);
  if (args.command === "scan-md") return scanMd(args);
  if (args.command === "json-to-md") return jsonToMd(args);
  throw new Error("用法：node scripts/wiki-md-convert.mjs <md-to-json|scan-md|json-to-md> --in <path>");
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}

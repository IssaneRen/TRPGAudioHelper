import { readFileSync, writeFileSync } from "node:fs";

const PLAYERS_FILE = "public/wiki/entities/players.json";
const MODULES_FILE = "public/wiki/entities/modules.json";
const ENTRIES_FILE = "public/wiki/entities/entries.json";
const OUTPUT_FILE = "public/wiki/index.json";

type WikiCategory = "character" | "location" | "event" | "module";

interface WikiPlayer {
  id: string;
  displayName: string;
  aliases?: string[];
}

interface WikiModule {
  id: string;
  displayName: string;
  aliases?: string[];
}

interface WikiFact {
  label: string;
  value: string;
}

interface WikiInlineToken {
  type: "text" | "ref" | "secret-inline";
  text?: string;
  entryId?: string;
  label?: string;
  playerIds?: string[];
}

interface WikiBlock {
  type: "heading" | "paragraph" | "list" | "quote" | "secret-panel";
  text?: string;
  tokens?: WikiInlineToken[];
  items?: WikiInlineToken[][];
  playerIds?: string[];
  title?: string;
  blocks?: WikiBlock[];
}

interface WikiEntryRecord {
  id: string;
  category: WikiCategory;
  displayName: string;
  summary: string;
  aliasNames?: string[];
  playerIds?: string[];
  moduleIds?: string[];
  relatedEntryIds?: string[];
  facts?: WikiFact[];
  content: WikiBlock[];
  createdAt: string;
  updatedAt: string;
}

interface WikiIndexEntry {
  id: string;
  category: WikiCategory;
  displayName: string;
  summary: string;
  aliasNames?: string[];
  playerIds?: string[];
  moduleIds?: string[];
  relatedEntryIds?: string[];
  facts?: WikiFact[];
  createdAt: string;
  updatedAt: string;
}

interface WikiIndexPayload {
  players: WikiPlayer[];
  modules: WikiModule[];
  entries: WikiIndexEntry[];
  lookup: {
    entryIdByName: Record<string, string>;
    playerIdByName: Record<string, string>;
    moduleIdByName: Record<string, string>;
  };
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function registerLookup(
  lookup: Record<string, string>,
  names: string[],
  id: string
) {
  for (const name of names) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) continue;
    lookup[normalized] = id;
  }
}

function validateToken(
  token: WikiInlineToken,
  entryIds: Set<string>,
  playerIds: Set<string>,
  entryId: string
) {
  if (token.type === "ref") {
    if (!token.entryId || !entryIds.has(token.entryId)) {
      throw new Error(`词条 ${entryId} 的 ref token 引用了不存在的 entryId: ${token.entryId}`);
    }
  }

  if (token.type === "secret-inline") {
    if (!token.text) {
      throw new Error(`词条 ${entryId} 的 secret-inline 缺少 text`);
    }
    for (const playerId of token.playerIds || []) {
      if (!playerIds.has(playerId)) {
        throw new Error(`词条 ${entryId} 的 secret-inline 引用了不存在的 playerId: ${playerId}`);
      }
    }
  }
}

function validateBlock(
  block: WikiBlock,
  entryIds: Set<string>,
  playerIds: Set<string>,
  entryId: string
) {
  if (block.tokens) {
    for (const token of block.tokens) {
      validateToken(token, entryIds, playerIds, entryId);
    }
  }

  if (block.items) {
    for (const item of block.items) {
      for (const token of item) {
        validateToken(token, entryIds, playerIds, entryId);
      }
    }
  }

  if (block.type === "secret-panel") {
    for (const playerId of block.playerIds || []) {
      if (!playerIds.has(playerId)) {
        throw new Error(`词条 ${entryId} 的 secret-panel 引用了不存在的 playerId: ${playerId}`);
      }
    }
    for (const child of block.blocks || []) {
      validateBlock(child, entryIds, playerIds, entryId);
    }
  }
}

const players = readJsonFile<WikiPlayer[]>(PLAYERS_FILE);
const modules = readJsonFile<WikiModule[]>(MODULES_FILE);
const entries = readJsonFile<WikiEntryRecord[]>(ENTRIES_FILE);

const playerIds = new Set(players.map((player) => player.id));
const moduleIds = new Set(modules.map((module) => module.id));
const entryIds = new Set(entries.map((entry) => entry.id));

for (const entry of entries) {
  for (const playerId of entry.playerIds || []) {
    if (!playerIds.has(playerId)) {
      throw new Error(`词条 ${entry.id} 引用了不存在的 playerId: ${playerId}`);
    }
  }

  for (const moduleId of entry.moduleIds || []) {
    if (!moduleIds.has(moduleId)) {
      throw new Error(`词条 ${entry.id} 引用了不存在的 moduleId: ${moduleId}`);
    }
  }

  for (const relatedId of entry.relatedEntryIds || []) {
    if (!entryIds.has(relatedId)) {
      throw new Error(`词条 ${entry.id} 引用了不存在的 relatedEntryId: ${relatedId}`);
    }
  }

  for (const block of entry.content) {
    validateBlock(block, entryIds, playerIds, entry.id);
  }
}

const payload: WikiIndexPayload = {
  players,
  modules,
  entries: entries.map((entry) => ({
    id: entry.id,
    category: entry.category,
    displayName: entry.displayName,
    summary: entry.summary,
    aliasNames: entry.aliasNames,
    playerIds: entry.playerIds,
    moduleIds: entry.moduleIds,
    relatedEntryIds: entry.relatedEntryIds,
    facts: entry.facts,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  })),
  lookup: {
    entryIdByName: {},
    playerIdByName: {},
    moduleIdByName: {},
  },
};

for (const player of players) {
  registerLookup(
    payload.lookup.playerIdByName,
    [player.displayName, ...(player.aliases || [])],
    player.id
  );
}

for (const module of modules) {
  registerLookup(
    payload.lookup.moduleIdByName,
    [module.displayName, ...(module.aliases || [])],
    module.id
  );
}

for (const entry of entries) {
  registerLookup(
    payload.lookup.entryIdByName,
    [entry.displayName, ...(entry.aliasNames || [])],
    entry.id
  );
}

writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n");
console.log(`✅ 生成 ${OUTPUT_FILE}，共 ${entries.length} 条 wiki 词条`);

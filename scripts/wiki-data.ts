import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import type {
  WikiBlock,
  WikiEntryRecord,
  WikiIndexPayload,
  WikiInlineToken,
  WikiModule,
  WikiPlayer,
} from "../src/types/wiki";

export const WIKI_PLAYERS_FILE = "public/wiki/entities/players.json";
export const WIKI_MODULES_FILE = "public/wiki/entities/modules.json";
export const WIKI_LEGACY_ENTRIES_FILE = "public/wiki/entities/entries.json";
export const WIKI_ENTRIES_DIR = "public/wiki/entities/entries";
export const WIKI_INDEX_OUTPUT_FILE = "public/wiki/index.json";

interface WikiEntities {
  players: WikiPlayer[];
  modules: WikiModule[];
  entries: WikiEntryRecord[];
}

export function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function writeJsonFile(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function registerLookup(lookup: Record<string, string>, names: string[], id: string) {
  for (const name of names) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) continue;
    const existing = lookup[normalized];
    if (existing && existing !== id) {
      throw new Error(`lookup 冲突：名称/别名 "${name}" 同时指向 ${existing} 与 ${id}`);
    }
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
  if (block.type === "image") {
    if (!block.src) {
      throw new Error(`词条 ${entryId} 的 image block 缺少 src`);
    }
  }

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

function hasCocSheetBlock(blocks: WikiBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type === "coc-sheet" && block.cocData) return true;
    if (block.type === "secret-panel" && block.blocks) return hasCocSheetBlock(block.blocks);
    return false;
  });
}

export function loadWikiEntries(): WikiEntryRecord[] {
  if (existsSync(WIKI_ENTRIES_DIR) && statSync(WIKI_ENTRIES_DIR).isDirectory()) {
    const fileNames = readdirSync(WIKI_ENTRIES_DIR)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    return fileNames.map((fileName) => {
      const path = join(WIKI_ENTRIES_DIR, fileName);
      const entry = readJsonFile<WikiEntryRecord>(path);
      const expectedId = basename(fileName, ".json");
      if (entry.id !== expectedId) {
        throw new Error(`词条文件 ${fileName} 的 id 与文件名不一致：${entry.id}`);
      }
      return entry;
    });
  }

  return readJsonFile<WikiEntryRecord[]>(WIKI_LEGACY_ENTRIES_FILE);
}

export function loadWikiEntities(): WikiEntities {
  return {
    players: readJsonFile<WikiPlayer[]>(WIKI_PLAYERS_FILE),
    modules: readJsonFile<WikiModule[]>(WIKI_MODULES_FILE),
    entries: loadWikiEntries(),
  };
}

export function validateWikiEntities({ players, modules, entries }: WikiEntities) {
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

    const relatedEntryIds = new Set(entry.relatedEntryIds || []);
    const accessEntryIds = new Set<string>();
    for (const access of entry.relatedEntryAccess || []) {
      if (!relatedEntryIds.has(access.entryId)) {
        throw new Error(`词条 ${entry.id} 为非关联词条配置了二级隐藏: ${access.entryId}`);
      }
      if (accessEntryIds.has(access.entryId)) {
        throw new Error(`词条 ${entry.id} 对关联词条重复配置了二级隐藏: ${access.entryId}`);
      }
      accessEntryIds.add(access.entryId);
      for (const playerId of access.playerIds || []) {
        if (!playerIds.has(playerId)) {
          throw new Error(`词条 ${entry.id} 的关联词条二级隐藏引用了不存在的 playerId: ${playerId}`);
        }
      }
    }

    for (const block of entry.content) {
      validateBlock(block, entryIds, playerIds, entry.id);
    }
  }
}

export function buildWikiIndexPayload({
  players,
  modules,
  entries,
}: WikiEntities): WikiIndexPayload {
  const payload: WikiIndexPayload = {
    players,
    modules,
    entries: entries.map((entry) => ({
      id: entry.id,
      category: entry.category,
      displayName: entry.displayName,
      summary: entry.summary,
      avatar: entry.avatar,
      aliasNames: entry.aliasNames,
      playerIds: entry.playerIds,
      moduleIds: entry.moduleIds,
      relatedEntryIds: entry.relatedEntryIds,
      relatedEntryAccess: entry.relatedEntryAccess,
      facts: entry.facts,
      tags: entry.tags,
      hasCocSheet: hasCocSheetBlock(entry.content),
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
      [player.id, player.displayName, ...(player.aliases || [])],
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

  return payload;
}

export function generateWikiIndex() {
  const entities = loadWikiEntities();
  validateWikiEntities(entities);
  const payload = buildWikiIndexPayload(entities);
  writeJsonFile(WIKI_INDEX_OUTPUT_FILE, payload);
  return { payload, entriesCount: entities.entries.length };
}

export function ensureWikiEntriesDir() {
  mkdirSync(WIKI_ENTRIES_DIR, { recursive: true });
}

export function writeWikiEntryRecord(entry: WikiEntryRecord) {
  ensureWikiEntriesDir();
  writeJsonFile(join(WIKI_ENTRIES_DIR, `${entry.id}.json`), entry);
}

export function splitLegacyWikiEntriesFile() {
  if (!existsSync(WIKI_LEGACY_ENTRIES_FILE)) return { created: 0, skipped: true };

  const entries = readJsonFile<WikiEntryRecord[]>(WIKI_LEGACY_ENTRIES_FILE);
  ensureWikiEntriesDir();
  for (const entry of entries) {
    writeWikiEntryRecord(entry);
  }
  rmSync(WIKI_LEGACY_ENTRIES_FILE);
  return { created: entries.length, skipped: false };
}

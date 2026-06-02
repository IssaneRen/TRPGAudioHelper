import type { WikiEntryRecord } from "@/types/wiki";

const entryCache: Record<string, WikiEntryRecord> = {};

export function getCachedWikiEntry(entryId: string): WikiEntryRecord | undefined {
  return entryCache[entryId];
}

export function setCachedWikiEntry(entry: WikiEntryRecord) {
  entryCache[entry.id] = entry;
}

export function getWikiEntryCacheSnapshot(): Record<string, WikiEntryRecord> {
  return { ...entryCache };
}

export async function fetchWikiEntry(entryId: string): Promise<WikiEntryRecord> {
  const cached = entryCache[entryId];
  if (cached) return cached;

  const response = await fetch(`/wiki/entities/entries/${entryId}.json`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load wiki entry detail: ${response.status}`);
  }
  const data = (await response.json()) as WikiEntryRecord;
  entryCache[data.id] = data;
  return data;
}

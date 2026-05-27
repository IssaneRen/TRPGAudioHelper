export type WikiCategory = "character" | "location" | "event" | "module";

export interface WikiPlayer {
  id: string;
  displayName: string;
  aliases?: string[];
}

export interface WikiModule {
  id: string;
  displayName: string;
  aliases?: string[];
}

export interface WikiFact {
  label: string;
  value: string;
}

export interface WikiInlineToken {
  type: "text" | "ref" | "secret-inline";
  text?: string;
  entryId?: string;
  label?: string;
  playerIds?: string[];
}

export interface WikiBlock {
  type: "heading" | "paragraph" | "list" | "quote" | "secret-panel";
  text?: string;
  tokens?: WikiInlineToken[];
  items?: WikiInlineToken[][];
  playerIds?: string[];
  title?: string;
  blocks?: WikiBlock[];
}

export interface WikiIndexEntry {
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

export interface WikiEntryRecord extends WikiIndexEntry {
  content: WikiBlock[];
}

export interface WikiIndexPayload {
  players: WikiPlayer[];
  modules: WikiModule[];
  entries: WikiIndexEntry[];
  lookup: {
    entryIdByName: Record<string, string>;
    playerIdByName: Record<string, string>;
    moduleIdByName: Record<string, string>;
  };
}

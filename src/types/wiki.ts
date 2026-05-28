export type WikiCategory = "character" | "location" | "event" | "module" | "magic-book" | "magic-item";

export interface WikiPlayer {
  id: string;
  displayName: string;
  aliases?: string[];
}

export interface WikiModule {
  id: string;
  displayName: string;
  aliases?: string[];
  summary?: string;
  tags?: string[];
  ruleSystem?: string;
  playerCount?: string;
  duration?: string;
  campaign?: string;
  collection?: string;
  description?: string;
}

export interface WikiFact {
  label: string;
  value: string;
}

export interface WikiRelatedEntryAccess {
  entryId: string;
  playerIds: string[];
}

export interface WikiInlineToken {
  type: "text" | "ref" | "secret-inline";
  text?: string;
  bold?: boolean;
  strikethrough?: boolean;
  color?: string;
  entryId?: string;
  label?: string;
  playerIds?: string[];
}


export interface CocSheetData {
  status?: Record<string, number>;
  skill?: Record<string, number>;
  avatar?: string;
}

export interface WikiBlock {
  type: "heading" | "paragraph" | "list" | "quote" | "secret-panel" | "coc-sheet";
  text?: string;
  tokens?: WikiInlineToken[];
  items?: WikiInlineToken[][];
  playerIds?: string[];
  title?: string;
  blocks?: WikiBlock[];
  hiddenMode?: "mask" | "collapse";
  cocData?: CocSheetData;
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
  relatedEntryAccess?: WikiRelatedEntryAccess[];
  facts?: WikiFact[];
  tags?: string[];
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

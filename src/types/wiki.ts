export type WikiCategory =
  | "character"
  | "location"
  | "event"
  | "module"
  | "report"
  | "magic-book"
  | "magic-item";

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


export interface CocSkillChange {
  delta: number;
  reason: string;
  at?: string;
  reportId?: string;
}

export interface CocSkillValue {
  base: number;
  growth?: number;
  changes?: CocSkillChange[];
}

export interface CocAttributes {
  str: number;
  con: number;
  siz: number;
  dex: number;
  int: number;
  pow: number;
  app: number;
  edu: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  san: number;
  maxSan: number;
  luck?: number;
  mov?: number;
  /** 体格（BUILD 数值） */
  physique?: number;
  /** 闪避（属性栏展示值） */
  dodge?: number;
  /** 伤害加值（如 +1D4） */
  damageBonus?: string;
  /** @deprecated 请用 damageBonus */
  build?: string;
}

export interface CocSheetData {
  avatar?: string;
  attributes?: CocAttributes;
  skills?: Record<string, CocSkillValue | number>;
  /** @deprecated 使用 attributes */
  status?: Record<string, number>;
  /** @deprecated 使用 skills */
  skill?: Record<string, number>;
}

export interface NormalizedCocSkill {
  name: string;
  base: number;
  growth: number;
  final: number;
  changes: CocSkillChange[];
}

export interface NormalizedCocSheet {
  avatar?: string;
  attributes: CocAttributes;
  skills: NormalizedCocSkill[];
}

export interface WikiBlock {
  type: "heading" | "paragraph" | "list" | "quote" | "image" | "secret-panel" | "coc-sheet";
  text?: string;
  tokens?: WikiInlineToken[];
  items?: WikiInlineToken[][];
  src?: string;
  alt?: string;
  caption?: string;
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
  hasCocSheet?: boolean;
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

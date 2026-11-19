// 写作·笔 数据模型。导出 JSON 即按此 schema（meta.schema = 1）。

export type EntityKind = 'person' | 'place' | 'faction' | 'item' | 'clue'

export type ClueStatus = 'planted' | 'echoed' | 'revealed'

export type EventStatus = 'planned' | 'written' | 'tothink'

export type OutlineLinkType = 'cause' | 'echo'

export interface Annotation {
  id: string
  quote: string
  note: string
}

export interface Chapter {
  id: string
  title: string
  summary?: string
  content: string
  targetWords?: number
  annotations?: Annotation[]
}

export interface Volume {
  id: string
  title: string
  chapters: Chapter[]
}

export interface OutlineLink {
  id: string
  from: string // eventId
  to: string // eventId
  type: OutlineLinkType
  note?: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface OutlineEvent {
  id: string
  threadId: string
  stageId?: string
  title: string
  summary?: string
  chapterRange?: string
  status: EventStatus
  checklist?: ChecklistItem[]
  hook?: string
  thought?: string
  cast?: string[] // entityId[]
  links: OutlineLink[]
}

export interface Stage {
  id: string
  name: string
  chapterRange?: string
}

export interface OutlineThread {
  id: string
  name: string
  color?: string
}

export interface Outline {
  concept?: string
  stages: Stage[]
  threads: OutlineThread[]
  events: OutlineEvent[]
}

export interface ClueInfo {
  status: ClueStatus
  plantedIn?: string // chapterId
  resolvedIn?: string // chapterId
  traces: string[]
}

export interface Entity {
  id: string
  kind: EntityKind
  name: string
  role?: string
  summary?: string
  aliases?: string[]
  color?: string
  presence?: string[] // 出场的 chapterId
  clue?: ClueInfo
  graph?: { x: number; y: number }
}

export interface EntityLink {
  id: string
  from: string // entityId
  to: string // entityId
  type: string // 关系词：亲属/对立/师徒/同伴/伏笔→揭晓…（可自定义）
  note?: string
  directed?: boolean
}

export interface Idea {
  id: string
  text: string
  createdAt: string
  used?: boolean
}

export interface Book {
  id: string
  title: string
  author?: string
  subtitle?: string
  idea?: string
  volumes: Volume[]
  outline: Outline
  entities: Entity[]
  entityLinks: EntityLink[]
  ideas: Idea[]
  stats: { history: Record<string, number> }
  dailyGoal?: number
  createdAt: string
  updatedAt: string
}

export interface BookIndexItem {
  id: string
  title: string
  author?: string
  updatedAt: string
}

export interface ExportPayload {
  meta: { app: 'writing-pen'; schema: 1; exportedAt: string }
  book: Book
}

export const KIND_LABEL: Record<EntityKind, string> = {
  person: '人物',
  place: '地点',
  faction: '势力',
  item: '物件',
  clue: '线索',
}

export const KIND_COLOR: Record<EntityKind, string> = {
  person: '#e05d44',
  place: '#5e81ac',
  faction: '#c9a227',
  item: '#8f6fc9',
  clue: '#5e9c76',
}

export const CLUE_STATUS_LABEL: Record<ClueStatus, string> = {
  planted: '埋下',
  echoed: '已呼应',
  revealed: '已揭晓',
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  planned: '待撰写',
  written: '已写',
  tothink: '待想',
}

export const OUTLINE_LINK_LABEL: Record<OutlineLinkType, string> = {
  cause: '因果',
  echo: '呼应',
}

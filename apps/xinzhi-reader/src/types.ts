export type SourceKind = 'newsletter' | 'web' | 'book' | 'note' | 'voice' | 'pdf'

export interface Source {
  name: string
  kind: SourceKind
  url?: string
}

export type BlockType = 'p' | 'h2' | 'h3' | 'quote' | 'list' | 'figure' | 'divider' | 'link'

export interface Block {
  id: string
  type: BlockType
  text?: string
  items?: string[]
  caption?: string
  /** decorative, locally drawn figure */
  figure?: 'curve' | 'specimen' | 'rings'
  /** external link card */
  href?: string
}

export type HighlightColor = 'yellow' | 'coral' | 'blue' | 'green'

export interface Highlight {
  id: string
  articleId: string
  blockId: string
  start: number
  end: number
  text: string
  color: HighlightColor
  note?: string
  createdAt: string
  updatedAt?: string
}

export interface Article {
  id: string
  title: string
  subtitle?: string
  author?: string
  source: Source
  feedId?: string
  publishedAt: string
  savedAt: string
  blocks: Block[]
  tags: string[]
  status: 'inbox' | 'archived'
  progress: number
  lastReadAt?: string
  readAt?: string
  featured?: boolean
}

export interface Feed {
  id: string
  name: string
  description: string
  kind: SourceKind
  author?: string
  accent: 'sage' | 'clay' | 'sand' | 'mist' | 'rose'
}

export type Appearance = 'paper' | 'white' | 'night'

export interface ReaderSettings {
  font: 'serif' | 'sans'
  fontSize: number
  lineHeight: number
  measure: 'narrow' | 'medium' | 'wide'
}

export interface Settings {
  appearance: Appearance
  reader: ReaderSettings
}

export interface AppData {
  articles: Article[]
  highlights: Highlight[]
  feeds: Feed[]
  settings: Settings
}

/**
 * 供「合并导入」用的轻量文章格式。
 * agent / 脚本抓取网页后按这个格式产出 JSON，即可追加进收藏，
 * 不需要自己生成 id 和 block id。
 */
export interface SlimArticle {
  id?: string
  title: string
  author?: string
  source?: string
  url?: string
  kind?: SourceKind
  tags?: string[]
  /** 纯文本或 Markdown，会自动分块；提供了 blocks 时优先使用 blocks */
  text?: string
  blocks?: Block[]
  savedAt?: string
}

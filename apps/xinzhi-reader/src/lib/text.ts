import type { Article, Block } from '@/types'

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}

export function countChars(article: Article): number {
  return article.blocks.reduce((total, block) => {
    if (block.text) return total + block.text.replace(/\s/g, '').length
    if (block.items) return total + block.items.join('').replace(/\s/g, '').length
    return total
  }, 0)
}

export function countWords(text: string): number {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (text.match(/[A-Za-z0-9]+/g) || []).length
  return cjk + latin
}

export function readingMinutes(article: Article): number {
  const chars = countChars(article)
  return Math.max(1, Math.round(chars / 380))
}

export function articlePlainText(article: Article): string {
  return article.blocks
    .map((block) => [block.text, ...(block.items || []), block.caption].filter(Boolean).join(' '))
    .join('\n')
}

export function excerptOf(article: Article, length = 80): string {
  const first = article.blocks.find((block) => block.type === 'p' && block.text)
  const text = first?.text || article.subtitle || ''
  if (text.length <= length) return text
  return `${text.slice(0, length).trimEnd()}…`
}

export function relativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  const diff = Date.now() - then
  if (!Number.isFinite(diff)) return ''
  if (diff < 45 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)} 小时前`
  if (diff < 48 * 60 * 60 * 1000) return '昨天'
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.round(diff / 86400000)} 天前`
  const date = new Date(isoDate)
  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function fullDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (date.getFullYear() !== now.getFullYear()) {
    return `${date.getFullYear()} 年 ${month} 月 ${day} 日`
  }
  return `${month} 月 ${day} 日`
}

export function todayLabel(): string {
  const now = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${weekdays[now.getDay()]}`
}

export function ageLabel(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return relativeTime(isoDate)
  if (days < 365) return `${days} 天前`
  return fullDate(isoDate)
}

export function noteDate(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜还很长'
  if (hour < 11) return '早安'
  if (hour < 14) return '午安'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** turn pasted markdown-ish text into reader blocks */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

export function parseBlocks(text: string, idPrefix = 'nb'): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let seq = 0

  const nextId = () => {
    seq += 1
    return `${idPrefix}-${seq}`
  }

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.reduce((acc, line) => {
      if (!acc) return line
      const joiner = /[A-Za-z0-9,.]$/.test(acc) && /^[A-Za-z0-9(]/.test(line) ? ' ' : ''
      return acc + joiner + line
    }, '')
    blocks.push({ id: nextId(), type: 'p', text: stripInlineMarkdown(text) })
    paragraph = []
  }

  const flushList = () => {
    if (!list.length) return
    blocks.push({ id: nextId(), type: 'list', items: list.map(stripInlineMarkdown) })
    list = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }
    if (/^---+\s*$/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ id: nextId(), type: 'divider' })
      continue
    }
    if (/^###\s+/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ id: nextId(), type: 'h3', text: line.replace(/^###\s+/, '') })
      continue
    }
    if (/^##\s+/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ id: nextId(), type: 'h2', text: line.replace(/^##\s+/, '') })
      continue
    }
    if (/^#\s+/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ id: nextId(), type: 'h2', text: line.replace(/^#\s+/, '') })
      continue
    }
    if (/^>\s?/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({
        id: nextId(),
        type: 'quote',
        text: stripInlineMarkdown(line.replace(/^>\s?/, '')),
      })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      list.push(line.replace(/^[-*]\s+/, ''))
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph()
      list.push(line.replace(/^\d+\.\s+/, ''))
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()

  if (!blocks.length) {
    blocks.push({ id: nextId(), type: 'p', text: '（空白的一页）' })
  }
  return blocks
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** the slice of a block's text covered by a highlight, split into runs */
export interface TextRun {
  text: string
  highlightId?: string
  color?: string
  start: number
  end: number
}

export function splitByHighlights(
  text: string,
  highlights: { id: string; start: number; end: number; color: string }[],
): TextRun[] {
  if (!highlights.length) return [{ text, start: 0, end: text.length }]
  const sorted = [...highlights].sort((a, b) => a.start - b.start)
  const runs: TextRun[] = []
  let cursor = 0
  for (const h of sorted) {
    const start = Math.max(cursor, Math.min(h.start, text.length))
    const end = Math.max(start, Math.min(h.end, text.length))
    if (start > cursor) {
      runs.push({ text: text.slice(cursor, start), start: cursor, end: start })
    }
    if (end > start) {
      runs.push({
        text: text.slice(start, end),
        highlightId: h.id,
        color: h.color,
        start,
        end,
      })
    }
    cursor = Math.max(cursor, end)
  }
  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), start: cursor, end: text.length })
  }
  return runs.filter((run) => run.text.length > 0)
}

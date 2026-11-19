// 字数统计与出场推断辅助
import type { Book, Entity, EntityKind } from '../types'

export function countWords(text: string): number {
  // 中文字符数 + 非中文单词数（近似）
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length
  const words = (text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\s]/g, ' ').match(/\S+/g) ?? []).length
  return cjk + words
}

export function bookWords(book: Book): number {
  return book.volumes.reduce(
    (sum, v) => sum + v.chapters.reduce((s, c) => s + countWords(c.content), 0),
    0,
  )
}

export function todayWords(book: Book): number {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return book.stats.history[key] ?? 0
}

export function streakDays(book: Book): number {
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const words = book.stats.history[key] ?? 0
    if (words > 0) streak++
    else if (streak > 0 || key !== todayKeyOf()) break
    d.setDate(d.getDate() - 1)
    if (streak > 3650) break
  }
  return streak
}

function todayKeyOf(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function recordDailyWords(book: Book, previousTotal: number, newTotal: number): void {
  const delta = newTotal - previousTotal
  if (delta <= 0) return
  const key = todayKeyOf()
  book.stats.history[key] = (book.stats.history[key] ?? 0) + delta
}

/** 正文里出现的实体（按名称与别名匹配） */
export function findMentions(book: Book, content: string): Entity[] {
  return book.entities.filter((e) => {
    const names = [e.name, ...(e.aliases ?? [])].filter((n) => n && n.length >= 2)
    return names.some((n) => content.includes(n))
  })
}

export function kindOf(book: Book, entityId: string): EntityKind | null {
  return book.entities.find((e) => e.id === entityId)?.kind ?? null
}

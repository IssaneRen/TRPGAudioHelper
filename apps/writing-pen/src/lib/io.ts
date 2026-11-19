// 导入 / 导出：整书 JSON 与正文 Markdown
import type { Book, ExportPayload } from '../types'

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'untitled'
}

export function exportBookJSON(book: Book) {
  const payload: ExportPayload = {
    meta: { app: 'writing-pen', schema: 1, exportedAt: new Date().toISOString() },
    book,
  }
  download(`${safeName(book.title)}.writing-pen.json`, 'application/json', JSON.stringify(payload, null, 2))
}

export function exportBookMarkdown(book: Book) {
  const lines: string[] = [`# ${book.title}`, '']
  if (book.author) lines.push(`作者：${book.author}`, '')
  if (book.idea) lines.push('> 总体构想：' + book.idea, '')

  for (const vol of book.volumes) {
    lines.push(`## ${vol.title}`, '')
    for (const ch of vol.chapters) {
      lines.push(`### ${ch.title}`, '')
      if (ch.content.trim()) lines.push(ch.content.trim(), '')
      if (ch.annotations?.length) {
        for (const a of ch.annotations) lines.push(`> 批注〔${a.quote}〕：${a.note}`, '')
      }
    }
  }

  const byKind: Record<string, string[]> = {}
  for (const e of book.entities) {
    const label = e.kind
    const desc = [e.role, e.summary].filter(Boolean).join(' —— ')
    ;(byKind[label] ??= []).push(`- ${e.name}${desc ? '：' + desc : ''}`)
  }
  if (Object.keys(byKind).length) {
    lines.push('## 设定档案', '')
    for (const [kind, rows] of Object.entries(byKind)) {
      lines.push(`### ${kindLabel(kind)}`, ...rows, '')
    }
  }

  lines.push('## 大纲', '')
  if (book.outline.concept) lines.push('> ' + book.outline.concept, '')
  for (const st of book.outline.stages) {
    lines.push(`### ${st.name}${st.chapterRange ? '（' + st.chapterRange + '）' : ''}`, '')
    for (const ev of book.outline.events.filter((e) => e.stageId === st.id)) {
      const thread = book.outline.threads.find((t) => t.id === ev.threadId)?.name ?? ''
      lines.push(`- **${ev.title}**〔${thread}${ev.chapterRange ? ' · ' + ev.chapterRange : ''}〕${ev.summary ?? ''}`)
    }
    lines.push('')
  }

  download(`${safeName(book.title)}.md`, 'text/markdown;charset=utf-8', lines.join('\n'))
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    person: '人物',
    place: '地点',
    faction: '势力',
    item: '物件',
    clue: '线索',
  }
  return map[kind] ?? kind
}

export async function parseImportFile(file: File): Promise<ExportPayload> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('不是有效的 JSON 文件')
  }
  const payload = parsed as ExportPayload
  if (!payload || typeof payload !== 'object') throw new Error('文件格式不正确')
  if (payload.meta?.app !== 'writing-pen') throw new Error('不是写作·笔的导出文件（缺少 meta.app 标识）')
  if (payload.meta.schema !== 1) throw new Error('schema 版本不兼容（期望 1）')
  if (!payload.book?.id || !Array.isArray(payload.book.volumes)) throw new Error('缺少书籍数据')
  return payload
}

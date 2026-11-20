import { importFromFile } from './importers'
import type { Article } from '@/types'

interface BookRecord {
  title: string
  source: string
  extension: string
  sha256: string
  bytes: number
  publishedAt: string
}

const catalog = new Map<string, BookRecord>()
let activeToken = ''
const endpoint = 'https://ai.issane.cn/api/admin/reader-books'

export function lockCatalog() {
  activeToken = ''
  catalog.clear()
}

export async function unlockCatalog(token: string, signal: AbortSignal) {
  const response = await fetch(endpoint, { signal, headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? '需要有效的 KP 凭据' : '私人书库暂不可用')
  const records: BookRecord[] = await response.json()
  if (signal.aborted) return
  lockCatalog()
  records.forEach(record => catalog.set('server-' + record.sha256, record))
  activeToken = token
}

export function reconcileBooks(articles: Article[], hidden: string[]): Article[] {
  const personal = articles.filter(article => !article.serverBook)
  const previous = new Map(articles.filter(article => article.serverBook).map(article => [article.id, article]))
  const shared: Article[] = []
  for (const [id, record] of catalog) {
    if (hidden.includes(id)) continue
    const old = previous.get(id)
    shared.push({
      id, serverBook: true, title: old?.title || record.title,
      source: { name: new URL(record.source).hostname, kind: 'book', url: record.source },
      savedAt: record.publishedAt, publishedAt: record.publishedAt, blocks: [], tags: [],
      status: old?.status || 'inbox', progress: old?.progress || 0,
      readAt: old?.readAt, lastReadAt: old?.lastReadAt,
    })
  }
  return [...personal, ...shared]
}

export async function readServerBook(id: string, signal: AbortSignal) {
  const book = catalog.get(id)
  if (!book || !activeToken) throw new Error('请先登录私人书库')
  const response = await fetch(endpoint + '/' + book.sha256, { signal, headers: { Authorization: 'Bearer ' + activeToken }, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('服务器正文下载失败')
  const bytes = await response.arrayBuffer()
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('')
  if (bytes.byteLength !== book.bytes || digest !== book.sha256) throw new Error('服务器正文校验失败')
  const doc = await importFromFile(new File([bytes], book.title + book.extension))
  if (!doc.blocks.some(block => block.text?.trim() || block.items?.some(item => item.trim()))) {
    throw new Error('文件中没有可阅读的正文')
  }
  return doc.blocks.map((block, index) => ({ ...block, id: id + '-' + index }))
}

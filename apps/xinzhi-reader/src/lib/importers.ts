import { parseBlocks, uid } from '@/lib/text'
import type { Block, SourceKind } from '@/types'

export interface ImportedDoc {
  title: string
  author?: string
  sourceName: string
  kind: SourceKind
  meta: string
  blocks: Block[]
}

interface RawBlock {
  type: 'h2' | 'h3' | 'p' | 'quote' | 'li'
  text: string
}

const MAX_FILE_BYTES = 80 * 1024 * 1024
const MAX_CHARS = 600_000

function minutesFor(chars: number): number {
  return Math.max(1, Math.round(chars / 380))
}

function countCharsOf(blocks: { text?: string; items?: string[] }[]): number {
  return blocks.reduce(
    (total, block) => total + (block.text || (block.items || []).join('') || '').replace(/\s/g, '').length,
    0,
  )
}

function assertSize(chars: number, label: string) {
  if (chars > MAX_CHARS) {
    throw new Error(
      `${label}约 ${Math.round(chars / 10000)} 万字，超出了本地存储上限（约 60 万字）。长书建议分卷导入，或等接入后端后再收。`,
    )
  }
}

/** UTF-8 优先，失败则按 GBK 解码（很多中文 txt 是 GBK） */
async function decodeBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    try {
      return new TextDecoder('gbk').decode(buffer)
    } catch {
      return new TextDecoder('utf-8').decode(buffer)
    }
  }
}

/* ---------------- 行 → 段落（PDF / 硬换行 txt 共用） ---------------- */

interface LineAccumulator {
  paragraphs: string[]
  current: string
  maxWidth: number
  lastLineLength: number
}

function flushLine(acc: LineAccumulator) {
  const text = acc.current.trim()
  if (text) acc.paragraphs.push(text)
  acc.current = ''
  acc.lastLineLength = 0
}

function pushLine(raw: string, acc: LineAccumulator) {
  const line = raw.replace(/\s+$/, '')
  const content = line.trim()
  if (!content) {
    flushLine(acc)
    return
  }
  acc.maxWidth = Math.max(acc.maxWidth, content.length)
  const indented = /^[ \t\u3000]/.test(line)
  if (!acc.current) {
    acc.current = content
    acc.lastLineLength = content.length
    return
  }
  // 段落结尾的特征：上一行明显短于版心宽度（段落最后一行通常不满行）
  const endsSentence = /[。！？…；：”』」!?;:.]$/.test(acc.current)
  const prevLineShort = acc.lastLineLength > 0 && acc.lastLineLength <= acc.maxWidth * 0.72
  if (indented || (endsSentence && prevLineShort)) {
    flushLine(acc)
    acc.current = content
  } else {
    const joiner =
      /[A-Za-z0-9,.]$/.test(acc.current) && /^[A-Za-z0-9(]/.test(content) ? ' ' : ''
    acc.current += joiner + content
  }
  acc.lastLineLength = content.length
}

function paragraphsToBlocks(paragraphs: string[]): Block[] {
  return paragraphs.map((text) => ({ id: uid('b'), type: 'p' as const, text }))
}

/* ---------------- HTML / EPUB 结构提取 ---------------- */

const SKIP_TAGS = /^(script|style|noscript|svg|head|title|meta|link|form|iframe)$/
const CONTAINER_TAGS = /^(p|h[1-6]|blockquote|ul|ol|li|pre|div|section|article|main|table|tr|td|aside|nav|figure|dd|dt)$/

function extractHtmlBlocks(root: Element, out: RawBlock[] = []): RawBlock[] {
  const tag = root.tagName.toLowerCase()
  if (SKIP_TAGS.test(tag)) return out
  const children = Array.from(root.children)
  const hasContainerChild = children.some((child) =>
    CONTAINER_TAGS.test(child.tagName.toLowerCase()),
  )
  if (hasContainerChild) {
    for (const child of children) extractHtmlBlocks(child, out)
    return out
  }
  const text = (root.textContent || '').replace(/\s+/g, ' ').trim()
  if (!text) return out
  if (/^h[1-6]$/.test(tag)) {
    out.push({ type: tag === 'h1' || tag === 'h2' ? 'h2' : 'h3', text })
  } else if (tag === 'blockquote') {
    out.push({ type: 'quote', text })
  } else if (tag === 'li') {
    out.push({ type: 'li', text })
  } else {
    out.push({ type: 'p', text })
  }
  return out
}

function groupRawBlocks(raw: RawBlock[]): Block[] {
  const blocks: Block[] = []
  let list: string[] | null = null
  const flushList = () => {
    if (list && list.length) blocks.push({ id: uid('b'), type: 'list', items: list })
    list = null
  }
  for (const item of raw) {
    if (item.type === 'li') {
      list = list || []
      list.push(item.text)
      continue
    }
    flushList()
    blocks.push({ id: uid('b'), type: item.type, text: item.text })
  }
  flushList()
  return blocks
}

function resolveZipPath(path: string): string {
  const clean = path.split('#')[0]
  const parts: string[] = []
  for (const segment of clean.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      parts.pop()
      continue
    }
    try {
      parts.push(decodeURIComponent(segment))
    } catch {
      parts.push(segment)
    }
  }
  return parts.join('/')
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/* ---------------- 各格式解析 ---------------- */

async function parseTxt(file: File): Promise<ImportedDoc> {
  const text = await decodeBuffer(await file.arrayBuffer())
  const acc: LineAccumulator = { paragraphs: [], current: '', maxWidth: 0, lastLineLength: 0 }
  for (const line of text.split(/\r\n|\n|\r/)) pushLine(line, acc)
  flushLine(acc)
  if (!acc.paragraphs.length) throw new Error('文件里没有找到文字')
  const blocks = paragraphsToBlocks(acc.paragraphs)
  const chars = countCharsOf(blocks)
  assertSize(chars, '这个文件')
  return {
    title: stripExtension(file.name),
    sourceName: '我的收藏',
    kind: 'note',
    meta: `${acc.paragraphs.length} 段 · 约 ${minutesFor(chars)} 分钟`,
    blocks,
  }
}

async function parseMarkdown(file: File): Promise<ImportedDoc> {
  const text = await decodeBuffer(await file.arrayBuffer())
  const blocks = parseBlocks(text, uid('p'))
  if (!blocks.length) throw new Error('文件里没有找到文字')
  let title = stripExtension(file.name)
  const first = blocks[0]
  if ((first.type === 'h2' || first.type === 'h3') && first.text && first.text.length <= 40) {
    title = first.text
    blocks.shift()
  }
  const chars = countCharsOf(blocks)
  assertSize(chars, '这个文件')
  return {
    title,
    sourceName: '我的收藏',
    kind: 'note',
    meta: `${blocks.length} 块 · 约 ${minutesFor(chars)} 分钟`,
    blocks,
  }
}

async function parseHtmlFile(file: File): Promise<ImportedDoc> {
  const html = await decodeBuffer(await file.arrayBuffer())
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.body || doc.documentElement
  const raw = extractHtmlBlocks(root)
  if (!raw.length) throw new Error('这个网页里没有可提取的正文')
  const blocks = groupRawBlocks(raw)
  const chars = countCharsOf(blocks)
  assertSize(chars, '这个网页')
  return {
    title: (doc.title || '').trim() || stripExtension(file.name),
    sourceName: '网页存档',
    kind: 'web',
    meta: `${blocks.length} 块 · 约 ${minutesFor(chars)} 分钟`,
    blocks,
  }
}

async function parsePdf(file: File): Promise<ImportedDoc> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdfjs/pdf.worker.min.js`
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({
    data,
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
  }).promise
  try {
    const meta = (await doc.getMetadata().catch(() => null)) as
      | { info?: { Title?: string; Author?: string } }
      | null
    const title =
      (meta?.info?.Title || '').trim() || stripExtension(file.name)
    const author = (meta?.info?.Author || '').trim() || undefined
    const acc: LineAccumulator = { paragraphs: [], current: '', maxWidth: 0, lastLineLength: 0 }
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const items = content.items as unknown as Array<{
        str?: string
        transform?: number[]
      }>
      const lines: { y: number; text: string }[] = []
      for (const item of items) {
        if (!item.str || !item.transform) continue
        const y = Math.round(item.transform[5])
        const last = lines[lines.length - 1]
        if (last && last.y === y) last.text += item.str
        else lines.push({ y, text: item.str })
      }
      for (const line of lines) pushLine(line.text, acc)
    }
    flushLine(acc)
    const chars = acc.paragraphs.join('').replace(/\s/g, '').length
    if (chars < 20) {
      throw new Error('这个 PDF 里没有可提取的文字（可能是扫描件或纯图片书）')
    }
    assertSize(chars, '这份 PDF')
    const blocks = paragraphsToBlocks(acc.paragraphs)
    return {
      title,
      author,
      sourceName: author || 'PDF 导入',
      kind: 'pdf',
      meta: `${doc.numPages} 页 · 约 ${minutesFor(chars)} 分钟`,
      blocks,
    }
  } finally {
    await doc.cleanup().catch(() => undefined)
  }
}

async function parseEpub(file: File): Promise<ImportedDoc> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(file)
  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) throw new Error('这不是有效的 EPUB 文件')
  const containerDoc = new DOMParser().parseFromString(
    await containerFile.async('string'),
    'application/xml',
  )
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path')
  if (!opfPath) throw new Error('EPUB 结构不完整（找不到 OPF）')
  const opfFile = zip.file(opfPath)
  if (!opfFile) throw new Error('EPUB 结构不完整（OPF 缺失）')
  const opfDoc = new DOMParser().parseFromString(await opfFile.async('string'), 'application/xml')
  const byLocalName = (name: string) =>
    Array.from(opfDoc.getElementsByTagName('*')).find((el) => el.localName === name)
  const title = (byLocalName('title')?.textContent || '').trim() || stripExtension(file.name)
  const author = (byLocalName('creator')?.textContent || '').trim() || undefined
  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  const manifest = new Map<string, { href: string; type: string; properties?: string }>()
  for (const el of Array.from(opfDoc.getElementsByTagName('*'))) {
    if (el.localName !== 'item') continue
    const id = el.getAttribute('id')
    const href = el.getAttribute('href')
    if (!id || !href) continue
    manifest.set(id, {
      href,
      type: el.getAttribute('media-type') || '',
      properties: el.getAttribute('properties') || undefined,
    })
  }
  const spineIds = Array.from(opfDoc.getElementsByTagName('*'))
    .filter((el) => el.localName === 'itemref')
    .map((el) => el.getAttribute('idref'))
    .filter((id): id is string => Boolean(id))

  const raw: RawBlock[] = []
  let chapters = 0
  for (const id of spineIds) {
    const item = manifest.get(id)
    if (!item || !/xhtml|html/.test(item.type)) continue
    if (item.properties?.includes('nav')) continue
    const entry = zip.file(resolveZipPath(baseDir + item.href))
    if (!entry) continue
    const html = await entry.async('string')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const found = extractHtmlBlocks(doc.body || doc.documentElement)
    if (found.length) {
      chapters += 1
      raw.push(...found)
    }
  }
  if (!raw.length) throw new Error('这本 EPUB 没有可提取的文字（可能是图片书）')
  const blocks = groupRawBlocks(raw)
  const chars = countCharsOf(blocks)
  assertSize(chars, '这本书')
  return {
    title,
    author,
    sourceName: author || 'EPUB 导入',
    kind: 'book',
    meta: `${chapters} 章 · 约 ${minutesFor(chars)} 分钟`,
    blocks,
  }
}

export async function importFromFile(file: File): Promise<ImportedDoc> {
  if (file.size > MAX_FILE_BYTES) throw new Error('文件太大（超过 80MB）')
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return parsePdf(file)
  if (name.endsWith('.epub')) return parseEpub(file)
  if (name.endsWith('.md') || name.endsWith('.markdown')) return parseMarkdown(file)
  if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.xhtml')) {
    return parseHtmlFile(file)
  }
  if (name.endsWith('.txt') || name.endsWith('.text')) return parseTxt(file)
  throw new Error('暂不支持这个格式（支持 txt / md / html / pdf / epub）')
}

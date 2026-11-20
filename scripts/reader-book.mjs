import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { homedir } from 'node:os'

const [action, file, source, title, confirmation, ...extra] = process.argv.slice(2)
if (!['review', 'stage'].includes(action) || !file || !source || !title?.trim() || extra.length ||
    (action === 'review' ? confirmation !== undefined : !confirmation)) {
  throw new Error('用法：node scripts/reader-book.mjs review 文件 原文件HTTPS链接 书名；用户批准后用 stage 加审核码。')
}
const url = new URL(source)
if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('需要可公开分享的 HTTPS 原文件直链')
const extension = extname(file).toLowerCase()
if (!['.txt', '.md', '.epub', '.pdf', '.xhtml'].includes(extension)) throw new Error('服务器书库支持 TXT、Markdown、EPUB、PDF 和 XHTML 正文文件')
const content = await readFile(file)
if (!content.length || content.length > 80 * 1024 * 1024) throw new Error('文件为空或超过 80 MiB')
if (extension === '.xhtml' && !/<p[\s>]/i.test(new TextDecoder('utf-8', { fatal: true }).decode(content))) throw new Error('XHTML 中没有正文段落')
if (extension === '.pdf' && !content.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('文件不是 PDF')
if (extension === '.epub' && !content.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))) throw new Error('文件不是 EPUB 压缩包')
if (extension === '.txt' || extension === '.md') {
  const body = new TextDecoder('utf-8', { fatal: true }).decode(content).trim()
  if (!body || /^(?:<!doctype html|<html[\s>])/i.test(body) || /^https?:\/\/\S+$/i.test(body)) throw new Error('请提供正文，不是网页或链接')
  if (body.replace(/\s/g, '').length > 600000) throw new Error('超过阅读器单卷 60 万字限制，请分卷后重新审核')
}
const hash = value => createHash('sha256').update(value).digest('hex')
const record = { title: title.trim(), source: url.href, extension, bytes: content.length, sha256: hash(content) }
const approval = hash(JSON.stringify(record))
console.log(JSON.stringify({ ...record, filename: basename(file), approval }, null, 2))
if (action === 'stage') {
  if (confirmation !== approval) throw new Error('审核码不匹配，请重新给用户核对原链接、文件大小和指纹')
  const root = join(homedir(), '.local', 'share', 'xinzhi-private-books')
  await mkdir(root, { recursive: true, mode: 0o700 })
  const temp = await mkdtemp(join(root, '.staging-'))
  try {
    await writeFile(join(temp, 'body.bin'), content)
    await writeFile(join(temp, 'book.json'), JSON.stringify({ ...record, publishedAt: new Date().toISOString() }, null, 2) + '\n')
    await rename(temp, join(root, record.sha256))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
  console.log('已生成仓外私人上传包：' + join(root, record.sha256) + '；未上传。')
}

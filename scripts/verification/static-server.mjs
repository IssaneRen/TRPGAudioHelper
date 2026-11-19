// 自测用静态文件服务：dist 目录 + 正确 MIME + 404 处理
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const ROOT = process.argv[2] || '.'
const PORT = Number(process.argv[3] || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
}

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (urlPath.endsWith('/')) urlPath += 'index.html'
    // 模拟线上 nginx：/apps 与 /apps/ 由主站 SPA 处理（stub 仅用于静态托管兜底）
    const spaRoute = urlPath === '/apps' || urlPath === '/apps/index.html'
    if (spaRoute) urlPath = '/index.html'
    const filePath = normalize(join(ROOT, urlPath))
    if (!filePath.startsWith(normalize(join(ROOT)))) {
      res.writeHead(403).end()
      return
    }
    const st = await stat(filePath).catch(() => null)
    if (!st || st.isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found: ' + urlPath)
      return
    }
    // SPA fallback：无扩展名的路由 404 时回主站 index.html（模拟 nginx try_files）
    let target = filePath
    if (!extname(target)) {
      const data0 = await readFile(target).catch(() => null)
      if (data0 == null) target = normalize(join(ROOT, 'index.html'))
    }
    const data = await readFile(target)
    res.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream' })
    res.end(data)
  } catch (err) {
    res.writeHead(500).end(String(err))
  }
}).listen(PORT, () => console.log(`static server on :${PORT} root=${ROOT}`))

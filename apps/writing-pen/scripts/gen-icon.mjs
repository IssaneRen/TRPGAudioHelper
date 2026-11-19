// 生成 192x192 应用图标：墨底 + 朱砂笔尖（纯 node，无依赖）
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const S = 192
const px = Buffer.alloc(S * S * 4)

function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= S || y >= S) return
  const i = (y * S + x) * 4
  // 简单 alpha 混合
  const na = a / 255
  px[i] = Math.round(r * na + px[i] * (1 - na))
  px[i + 1] = Math.round(g * na + px[i + 1] * (1 - na))
  px[i + 2] = Math.round(b * na + px[i + 2] * (1 - na))
  px[i + 3] = Math.max(px[i + 3], a)
}

// 背景：圆角矩形 22px 半径，夜色底
const R = 36
function inRounded(x, y, r = R) {
  const cx = Math.min(Math.max(x, r), S - 1 - r)
  const cy = Math.min(Math.max(y, r), S - 1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (inRounded(x, y)) setPx(x, y, 0x16, 0x15, 0x1a, 255)
  }
}

// 笔：从左下到右上的斜杆（宽 18px）+ 笔尖三角
const w = 17
const dx = 1, dy = -1
function distToLine(x, y) {
  // 直线过 (52,140) 方向 (dx,dy)
  const px0 = 56, py0 = 138
  const t = (x - px0) * dx + (y - py0) * dy
  const projX = px0 + dx * t, projY = py0 + dy * t
  return Math.hypot(x - projX, y - projY)
}
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const t = (x - 56) * dx + (y - 138) * dy
    if (t >= -20 && t <= 92 && distToLine(x, y) <= w / 2) {
      setPx(x, y, 0xe8, 0xe6, 0xe0, 255)
    }
  }
}
// 笔尖：三角 (56,138) -> (92,176) -> (88,140)
function inTri(x, y, ax, ay, bx, by, cx, cy) {
  const s = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
  const t = (cx - bx) * (y - by) - (cy - by) * (x - bx)
  const u = (ax - cx) * (y - cy) - (ay - cy) * (x - cx)
  return (s >= 0 && t >= 0 && u >= 0) || (s <= 0 && t <= 0 && u <= 0)
}
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (inTri(x, y, 62, 132, 96, 170, 94, 128)) setPx(x, y, 0xe0, 0x5d, 0x44, 255)
  }
}
// 墨点：笔尖下方
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - 112, y - 160)
    if (d <= 9) setPx(x, y, 0xe0, 0x5d, 0x44, 255)
  }
}

// PNG 编码
function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc((S * 4 + 1) * S)
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0 // filter none
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('../public/pen-icon-192.png', import.meta.url), png)
console.log('[gen-icon] pen-icon-192.png written,', png.length, 'bytes')

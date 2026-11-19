// 写作·笔 端到端自测（CDP 驱动无头 Edge，零依赖，Node 22+ 原生 WebSocket）。
// 用法：
//   1. 本地：先 node scripts/verification/static-server.mjs dist 4173
//      再 node scripts/verification/cdp-writing-pen-selftest.mjs            （默认 127.0.0.1:4173）
//   2. 线上：node scripts/verification/cdp-writing-pen-selftest.mjs https://www.issane.cn
// 截图输出到 artifacts/selftest/out/。
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmdirSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const PORT = 9223
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1').replace(/\//g, '\\')
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launch() {
  const profile = OUT + 'profile'
  const proc = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' })
  // 等 CDP 端口就绪
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return proc
    } catch { /* not ready */ }
    await sleep(250)
  }
  throw new Error('CDP 端口未就绪')
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      } else if (msg.method) {
        this.events.push(msg)
      }
    })
  }
  static async connect() {
    for (let i = 0; i < 30; i++) {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
        return new CDP(ws)
      }
      await sleep(250)
    }
    throw new Error('找不到页面 target')
  }
  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)) } }, 20000)
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error('页面脚本异常: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text))
    return r.result?.value
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(OUT + name + '.png', Buffer.from(r.data, 'base64'))
    console.log('[shot]', name)
  }
}

const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ` (${extra})` : ''))
}

const proc = await launch()
try {
  const cdp = await CDP.connect()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  // 1. /apps/ 目录页
  await cdp.send('Page.navigate', { url: BASE + '/apps/' })
  await sleep(2500)
  const dirText = await cdp.eval('document.body.innerText')
  check('目录页含「写作·笔」', dirText.includes('写作·笔'))
  const writingHref = await cdp.eval(`document.querySelector('a[href*="writing-pen"]')?.getAttribute('href') ?? ''`)
  check('写作·笔卡带链接', writingHref.includes('/apps/writing-pen/'), writingHref)
  await cdp.shot('01-apps-dir')

  // 2. 子应用书架
  await cdp.send('Page.navigate', { url: BASE + '/apps/writing-pen/' })
  await sleep(1800)
  const shelfText = await cdp.eval('document.body.innerText')
  check('书架渲染（写作·笔标题）', shelfText.includes('写作·笔'))
  check('书架含新建作品', shelfText.includes('新建作品'))
  await cdp.shot('02-shelf')

  // 3. 载入示例书（点击）
  await cdp.eval(`[...document.querySelectorAll('.book-card')].find(c => c.textContent.includes('载入示例书'))?.click()`)
  await sleep(800)
  // 首次载入后书架会显示卡片，再点开
  const afterSeed = await cdp.eval('document.body.innerText')
  if (afterSeed.includes('山海遗事')) {
    await cdp.eval(`[...document.querySelectorAll('.book-card')].find(c => c.textContent.includes('山海遗事'))?.click()`)
    await sleep(900)
  }
  const writeText = await cdp.eval('document.body.innerText')
  check('进入写作视图（章节树）', writeText.includes('章节目录') && writeText.includes('第一章 雾港'))
  await cdp.shot('03-write')

  // 4. 正文编辑 + 字数（React 受控组件需走原生 value setter）
  const words0 = await cdp.eval(`document.querySelector('.editor')?.value.length ?? 0`)
  await cdp.eval(`(() => {
    const ed = document.querySelector('.editor')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(ed, ed.value + '\\n夜潮又涨了一寸。')
    ed.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await sleep(1500) // 防抖保存
  const savedText = await cdp.eval('document.body.innerText')
  check('编辑后自动保存提示', savedText.includes('已保存'))

  // 5. 大纲视图 + 连线
  await cdp.eval(`[...document.querySelectorAll('.viewtabs button')].find(b => b.textContent === '大纲').click()`)
  await sleep(1200)
  const outlineText = await cdp.eval('document.body.innerText')
  check('大纲含阶段列头', outlineText.includes('第一幕 · 归潮'))
  check('大纲含剧情线', outlineText.includes('泊舟调查线'))
  const linkCount = await cdp.eval(`document.querySelectorAll('.links-svg g.link').length`)
  check('大纲连线渲染 ≥2', linkCount >= 2, String(linkCount))
  const labelTexts = await cdp.eval(`[...document.querySelectorAll('.links-svg .link-label text')].map(t => t.textContent).join(',')`)
  check('连线标签为因果/呼应', labelTexts.includes('因果') && labelTexts.includes('呼应'), labelTexts)
  await cdp.shot('04-outline')

  // 6. 事件详情：点第一张卡
  await cdp.eval(`document.querySelector('.event-card')?.click()`)
  await sleep(700)
  const detailText = await cdp.eval('document.body.innerText')
  check('事件详情面板打开', detailText.includes('事件详情') && detailText.includes('连到另一张卡'))
  await cdp.shot('05-event-detail')

  // 7. 关系图谱
  await cdp.eval(`[...document.querySelectorAll('.viewtabs button')].find(b => b.textContent === '图谱').click()`)
  await sleep(1200)
  const graphText = await cdp.eval('document.body.innerText')
  check('图谱含类型过滤', graphText.includes('人物') && graphText.includes('线索'))
  const nodeCount = await cdp.eval(`document.querySelectorAll('.gnode').length`)
  check('图谱节点 ≥8', nodeCount >= 8, String(nodeCount))
  const edgeCount = await cdp.eval(`document.querySelectorAll('.gedge').length`)
  check('图谱连线 ≥8', edgeCount >= 8, String(edgeCount))
  const edgeLabel = await cdp.eval(`[...document.querySelectorAll('.gedge-label text')].slice(0,6).map(t=>t.textContent).join(',')`)
  check('图谱边标签（对立/母子/伏笔→揭晓…）', edgeLabel.includes('对立') || edgeLabel.includes('母子') || edgeLabel.includes('伏笔→揭晓'), edgeLabel)
  await cdp.shot('06-graph')

  // 8. 设定台
  await cdp.eval(`[...document.querySelectorAll('.viewtabs button')].find(b => b.textContent === '设定').click()`)
  await sleep(900)
  const codexText = await cdp.eval('document.body.innerText')
  check('设定台人物卡', codexText.includes('沈泊舟') && codexText.includes('主角'))
  await cdp.shot('07-codex')

  // 9. 统计
  await cdp.eval(`[...document.querySelectorAll('.viewtabs button')].find(b => b.textContent === '统计').click()`)
  await sleep(900)
  const statsText = await cdp.eval('document.body.innerText')
  check('统计含全书字数', statsText.includes('全书字数'))
  await cdp.shot('08-stats')

  // 10. 导出 JSON（验证下载 payload 通过内存构造，不走真实下载）
  const exportOk = await cdp.eval(`(() => {
    try {
      const raw = localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('writing-pen:book:')));
      const book = JSON.parse(raw);
      return !!(book.id && book.volumes.length >= 2 && book.outline.events.length >= 7 && book.entityLinks.length >= 9);
    } catch (e) { return 'ERR:' + e.message }
  })()`)
  check('localStorage 数据完整（书/章/事件/连线）', exportOk === true, String(exportOk))

  console.log('\\n=== 结果汇总 ===')
  const fails = results.filter(r => !r.ok)
  console.log(`${results.length - fails.length}/${results.length} 通过`)
  if (fails.length) { console.log('失败项:'); for (const f of fails) console.log(' -', f.name, f.extra) }
} finally {
  proc.kill()
  try { rmdirSync(OUT + 'profile', { recursive: true, force: true }) } catch { /* windows 可能延迟锁定 */ }
}

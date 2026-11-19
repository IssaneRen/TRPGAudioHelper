import { useEffect, useRef, useState } from 'react'
import { listBooks, useApp, uid, saveImportedBook, deleteBook, loadBook } from './store'
import { makeSampleBook } from './sample'
import type { Book } from './types'
import { exportBookJSON, exportBookMarkdown, parseImportFile } from './lib/io'
import WriteView from './views/WriteView'
import OutlineView from './views/OutlineView'
import GraphView from './views/GraphView'
import CodexView from './views/CodexView'
import IdeasView from './views/IdeasView'
import StatsView from './views/StatsView'

const VIEWS = [
  { id: 'write', label: '写作' },
  { id: 'outline', label: '大纲' },
  { id: 'graph', label: '图谱' },
  { id: 'codex', label: '设定' },
  { id: 'ideas', label: '灵感' },
  { id: 'stats', label: '统计' },
] as const

export default function App() {
  const book = useApp((s) => s.book)
  const view = useApp((s) => s.view)
  const openBook = useApp((s) => s.openBook)
  const closeBook = useApp((s) => s.closeBook)
  const setView = useApp((s) => s.setView)
  const dirty = useApp((s) => s.dirty)
  const [theme, setTheme] = useState<'night' | 'day'>(
    () => (localStorage.getItem('writing-pen:theme') as 'night' | 'day') || 'night',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('writing-pen:theme', theme)
  }, [theme])

  // 全书字数（顶栏展示）
  const totalWords = book
    ? book.volumes.reduce((sum, v) => sum + v.chapters.reduce((s, c) => s + c.content.length, 0), 0)
    : 0

  if (!book) return <Bookshelf onOpen={openBook} />

  return (
    <div className="app">
      <header className="topbar">
        <button className="btn small" onClick={closeBook} title="回到书架">← 书架</button>
        <div className="brand">
          <span className="mark">笔</span>
          <span>{book.title}</span>
          <span className="tag">{totalWords.toLocaleString()} 字{dirty ? ' · 未保存' : ''}</span>
        </div>
        <div className="spacer" />
        <nav className="viewtabs" aria-label="视图切换">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
        <ImportExportButtons />
        <button className="btn small" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}>
          {theme === 'night' ? '日间' : '夜间'}
        </button>
      </header>
      <main className="workspace">
        {view === 'write' && <WriteView />}
        {view === 'outline' && <OutlineView />}
        {view === 'graph' && <GraphView />}
        {view === 'codex' && <CodexView />}
        {view === 'ideas' && <IdeasView />}
        {view === 'stats' && <StatsView />}
      </main>
    </div>
  )
}

function ImportExportButtons() {
  const fileRef = useRef<HTMLInputElement>(null)
  const book = useApp((s) => s.book)
  const setBook = useApp((s) => s.setBook)

  if (!book) return null

  const doExportJSON = () => exportBookJSON(book)
  const doExportMD = () => exportBookMarkdown(book)
  const doImport = async (file: File) => {
    const { book: imported } = await parseImportFile(file)
    if (!window.confirm(`导入《${imported.title}》将覆盖当前作品，继续？`)) return
    saveImportedBook(imported)
    setBook(imported)
  }

  return (
    <>
      <button className="btn small" onClick={doExportJSON} title="导出整书 JSON（含图谱与设定）">导出</button>
      <button className="btn small" onClick={doExportMD} title="导出正文 Markdown">正文MD</button>
      <button className="btn small" onClick={() => fileRef.current?.click()} title="导入整书 JSON">导入</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) doImport(f).catch((err) => window.alert('导入失败：' + err.message))
          e.target.value = ''
        }}
      />
    </>
  )
}

function Bookshelf({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState(listBooks)
  const refresh = () => setItems(listBooks())

  const createBook = () => {
    const title = window.prompt('新书名称：', '未命名作品')
    if (!title) return
    const book: Book = {
      id: uid('bk'),
      title,
      volumes: [{ id: uid('v'), title: '第一卷', chapters: [{ id: uid('c'), title: '第一章', content: '' }] }],
      outline: { stages: [], threads: [], events: [] },
      entities: [],
      entityLinks: [],
      ideas: [],
      stats: { history: {} },
      dailyGoal: 1500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveImportedBook(book)
    refresh()
    onOpen(book.id)
  }

  const restoreSample = () => {
    const sample = makeSampleBook()
    if (loadBook(sample.id)) {
      if (!window.confirm('示例书已存在，重置其内容？')) return
    }
    saveImportedBook(makeSampleBook())
    refresh()
  }

  const removeBook = (id: string, title: string) => {
    if (!window.confirm(`删除《${title}》？该操作不可恢复，建议先导出备份。`)) return
    deleteBook(id)
    refresh()
  }

  return (
    <div className="shelf">
      <div className="shelf-inner">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1>写作·笔</h1>
          <span style={{ color: 'var(--text-dim)', letterSpacing: 2 }}>PEN STUDIO</span>
        </div>
        <p className="sub">章节、大纲、关系图谱与设定档案都在这里，数据保存在本机浏览器。</p>
        <div className="shelf-grid">
          {items.map((b) => (
            <div key={b.id} className="book-card" onClick={() => onOpen(b.id)}>
              <div className="btitle">{b.title}</div>
              <div className="bmeta">
                {b.author ? b.author + ' · ' : ''}更新于 {new Date(b.updatedAt).toLocaleDateString()}
              </div>
              <button
                className="del"
                title="删除作品"
                onClick={(e) => {
                  e.stopPropagation()
                  removeBook(b.id, b.title)
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="book-card" onClick={createBook} style={{ display: 'grid', placeItems: 'center', minHeight: 96, color: 'var(--text-dim)' }}>
            ＋ 新建作品
          </div>
          {items.length === 0 && (
            <div className="book-card" onClick={restoreSample} style={{ display: 'grid', placeItems: 'center', minHeight: 96, color: 'var(--text-dim)' }}>
              载入示例书《山海遗事》
            </div>
          )}
        </div>
        {items.length > 0 && (
          <p style={{ marginTop: 18 }}>
            <button className="btn small" onClick={restoreSample}>重置示例书</button>
          </p>
        )}
      </div>
    </div>
  )
}

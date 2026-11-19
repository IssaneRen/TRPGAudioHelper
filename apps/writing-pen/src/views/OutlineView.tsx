// 大纲视图：剧情线 × 阶段矩阵 + 事件卡 + 因果/呼应连线（SVG 曲线）+ 事件详情
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { uid, useApp } from '../store'
import {
  EVENT_STATUS_LABEL,
  OUTLINE_LINK_LABEL,
  type OutlineEvent,
} from '../types'
import './outline.css'

interface CardPos {
  x: number
  y: number
  w: number
  h: number
}

export default function OutlineView() {
  const book = useApp((s) => s.book)!
  const updateBook = useApp((s) => s.updateBook)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const [cardPos, setCardPos] = useState<Record<string, CardPos>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingLink, setPendingLink] = useState<{ from: string } | null>(null)

  const { stages, threads, events } = book.outline

  // 事件卡坐标测量（连线端点用）；浅比较避免无限重渲染
  const measure = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const gRect = grid.getBoundingClientRect()
    const next: Record<string, CardPos> = {}
    cardRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      next[id] = { x: r.left - gRect.left + grid.scrollLeft, y: r.top - gRect.top + grid.scrollTop, w: r.width, h: r.height }
    })
    setCardPos((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
      for (const k of keys) {
        const a = prev[k]
        const b = next[k]
        if (!a || !b || a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h) return next
      }
      return prev
    })
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [measure])
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(grid)
    return () => ro.disconnect()
  }, [measure])

  const threadById = new Map(threads.map((t) => [t.id, t]))
  const stageById = new Map(stages.map((s) => [s.id, s]))
  const eventById = new Map(events.map((e) => [e.id, e]))

  const addStage = () => {
    const name = window.prompt('阶段名称：', `第${stages.length + 1}幕`)
    if (!name) return
    const range = window.prompt('章节区间（可空）：', '')
    updateBook((d) => d.outline.stages.push({ id: uid('s'), name, chapterRange: range || undefined }), { immediate: true })
  }
  const addThread = () => {
    const name = window.prompt('剧情线名称：', '新剧情线')
    if (!name) return
    updateBook((d) => d.outline.threads.push({ id: uid('t'), name }), { immediate: true })
  }
  const addEvent = (threadId: string, stageId: string) => {
    const id = uid('e')
    updateBook((d) => d.outline.events.push({ id, threadId, stageId, title: '新事件', status: 'planned', links: [] }), { immediate: true })
    setSelected(id)
  }

  const updateEvent = (id: string, fn: (e: OutlineEvent) => void) => {
    updateBook((d) => {
      const ev = d.outline.events.find((x) => x.id === id)
      if (ev) fn(ev)
    })
  }

  // 连线：从事件 A 发起 → 选中目标 → 弹类型选择
  const startLink = (fromId: string) => {
    setPendingLink({ from: fromId })
    const others = events.filter((e) => e.id !== fromId).map((e) => e.title)
    if (!others.length) {
      window.alert('还没有其他事件卡可连')
      setPendingLink(null)
      return
    }
    const title = window.prompt(`「${eventById.get(fromId)?.title}」连到哪张卡？输入卡片标题：\n${others.join(' / ')}`)
    const target = events.find((e) => e.title === title && e.id !== fromId)
    if (!target) {
      setPendingLink(null)
      return
    }
    const type = window.prompt('连线类型（因果 / 呼应）：', '因果')
    const linkType = type === '呼应' ? 'echo' : 'cause'
    updateBook((d) => {
      const ev = d.outline.events.find((x) => x.id === fromId)
      if (ev) ev.links.push({ id: uid('l'), from: fromId, to: target.id, type: linkType })
    }, { immediate: true })
    setPendingLink(null)
  }

  const removeLink = (ownerEventId: string, linkId: string) => {
    updateBook((d) => {
      const ev = d.outline.events.find((x) => x.id === ownerEventId)
      if (ev) ev.links = ev.links.filter((l) => l.id !== linkId)
      // 对端也删（连线数据存在发起方，对端可能也持有反向引用）
      for (const other of d.outline.events) {
        if (other.id !== ownerEventId) other.links = other.links.filter((l) => l.id !== linkId)
      }
    }, { immediate: true })
  }

  // 连线汇总（去重：同一 link 可能出现在两卡数据里）
  const seenLinks = new Set<string>()
  const allLinks = events.flatMap((e) =>
    e.links.filter((l) => {
      if (seenLinks.has(l.id)) return false
      seenLinks.add(l.id)
      return true
    }),
  )

  const selectedEvent = selected ? eventById.get(selected) ?? null : null

  return (
    <>
      <aside className="panel outline-side">
        <div className="panel-head">
          <span>阶段</span>
          <button className="btn small" onClick={addStage}>＋</button>
        </div>
        <div className="panel-body">
          {stages.map((s, i) => (
            <div key={s.id} className="stage-row" onClick={() => window.prompt('修改阶段名称：', s.name) && null}>
              <span className="stage-no">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div>{s.name}</div>
                {s.chapterRange && <div className="dim">{s.chapterRange}</div>}
              </div>
            </div>
          ))}
          <div className="side-sect" style={{ padding: '10px 12px 6px' }}>
            剧情线
            <button className="btn small" style={{ marginLeft: 8 }} onClick={addThread}>＋</button>
          </div>
          {threads.map((t) => (
            <div key={t.id} className="thread-row">
              <span className="dot" style={{ background: t.color ?? threadColor(t.id) }} />
              <span className="tname">{t.name}</span>
              <span className="tcount">{events.filter((e) => e.threadId === t.id).length} 事件</span>
            </div>
          ))}
        </div>
        <div className="panel-foot">
          已落卡 {events.filter((e) => e.status !== 'tothink').length} / {events.length} · 连线 {allLinks.length} 条
        </div>
      </aside>

      <section className="outline-zone">
        <div className="outline-toolbar">
          <span className="hint">每行一条剧情线，每列一个阶段；点开卡片详情可「连到另一张卡」。</span>
        </div>
        <div className="matrix-scroll" ref={gridRef}>
          <div className="matrix">
            {/* 连线层 */}
            <svg className="links-svg" width="100%" height="100%">
              <defs>
                <marker id="arr-ca" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--accent)" />
                </marker>
                <marker id="arr-ec" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--blue)" />
                </marker>
              </defs>
              {allLinks.map((l) => {
                const a = cardPos[l.from]
                const b = cardPos[l.to]
                if (!a || !b) return null
                const ax = a.x + a.w
                const ay = a.y + a.h / 2
                const bx = b.x
                const by = b.y + b.h / 2
                const backward = bx < ax
                const dx = Math.max(46, Math.abs(bx - ax) * 0.45)
                const d = backward
                  ? `M ${ax},${ay} C ${ax - dx},${ay} ${bx + dx},${by} ${bx},${by}`
                  : `M ${ax},${ay} C ${ax + dx},${ay} ${bx - dx},${by} ${bx},${by}`
                const mx = (ax + bx) / 2
                const my = (ay + by) / 2 - 6
                const cls = l.type === 'echo' ? 'echo' : 'cause'
                return (
                  <g key={l.id} className={`link ${cls}`} data-link={l.id}>
                    <path d={d} className="link-path" markerEnd={l.type === 'echo' ? 'url(#arr-ec)' : 'url(#arr-ca)'} />
                    <g className="link-label" style={{ transform: `translate(${mx}px, ${my}px)` }}>
                      <rect x="-24" y="-10" width="48" height="20" rx="10" />
                      <text textAnchor="middle" dominantBaseline="central">{OUTLINE_LINK_LABEL[l.type]}</text>
                    </g>
                  </g>
                )
              })}
            </svg>

            {/* 表头：阶段列 */}
            <div className="matrix-head">
              <div className="matrix-corner">剧情线 × 阶段</div>
              {stages.map((s, i) => (
                <div key={s.id} className="matrix-colhead">
                  <span className="stage-no">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div>{s.name}</div>
                    {s.chapterRange && <div className="dim">{s.chapterRange}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* 矩阵行 */}
            {threads.map((t) => (
              <div key={t.id} className="matrix-row">
                <div className="matrix-rowhead">
                  <span className="dot" style={{ background: t.color ?? threadColor(t.id) }} />
                  <div>
                    <div>{t.name}</div>
                    <div className="dim">{events.filter((e) => e.threadId === t.id).length} 个事件</div>
                  </div>
                </div>
                {stages.map((s) => {
                  const cellEvents = events.filter((e) => e.threadId === t.id && e.stageId === s.id)
                  return (
                    <div key={s.id} className="matrix-cell">
                      {cellEvents.map((ev) => (
                        <div
                          key={ev.id}
                          ref={(el) => {
                            if (el) cardRefs.current.set(ev.id, el)
                            else cardRefs.current.delete(ev.id)
                          }}
                          className={`event-card st-${ev.status} ${selected === ev.id ? 'sel' : ''}`}
                          onClick={() => setSelected(ev.id)}
                        >
                          <div className="ev-title">{ev.title}</div>
                          {ev.chapterRange && <div className="ev-range">{ev.chapterRange}</div>}
                        </div>
                      ))}
                      <button className="cell-add" onClick={() => addEvent(t.id, s.id)}>＋</button>
                    </div>
                  )
                })}
                {stages.length === 0 && <div className="matrix-cell empty-hint">先在左侧新建阶段</div>}
              </div>
            ))}
            {threads.length === 0 && <div className="empty" style={{ padding: 40 }}>先在左侧「剧情线」里建一条线</div>}
          </div>
        </div>
        {pendingLink && <div className="linking-tip">正在连线：{eventById.get(pendingLink.from)?.title}</div>}
      </section>

      {selectedEvent && (
        <aside className="panel event-detail">
          <div className="panel-head">
            <span>事件详情</span>
            <button className="btn small" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="panel-body detail-body">
            <label className="field">
              <span className="label">标题</span>
              <input type="text" value={selectedEvent.title} onChange={(e) => updateEvent(selectedEvent.id, (ev) => { ev.title = e.target.value })} />
            </label>
            <label className="field">
              <span className="label">章节区间</span>
              <input type="text" value={selectedEvent.chapterRange ?? ''} onChange={(e) => updateEvent(selectedEvent.id, (ev) => { ev.chapterRange = e.target.value })} placeholder="如 第5-6章" />
            </label>
            <label className="field">
              <span className="label">摘要</span>
              <textarea rows={3} value={selectedEvent.summary ?? ''} onChange={(e) => updateEvent(selectedEvent.id, (ev) => { ev.summary = e.target.value })} />
            </label>
            <label className="field">
              <span className="label">状态</span>
              <select
                value={selectedEvent.status}
                onChange={(e) => updateEvent(selectedEvent.id, (ev) => { ev.status = e.target.value as OutlineEvent['status'] })}
              >
                {Object.entries(EVENT_STATUS_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </label>

            <div className="side-sect">本章细纲</div>
            {(selectedEvent.checklist ?? []).map((k) => (
              <div key={k.id} className="check-row">
                <input
                  type="checkbox"
                  checked={k.done}
                  onChange={(e) => updateEvent(selectedEvent.id, (ev) => {
                    const item = ev.checklist?.find((x) => x.id === k.id)
                    if (item) item.done = e.target.checked
                  })}
                />
                <span className={k.done ? 'done' : ''}>{k.text}</span>
                <button className="del-btn" onClick={() => updateEvent(selectedEvent.id, (ev) => { ev.checklist = ev.checklist?.filter((x) => x.id !== k.id) })}>✕</button>
              </div>
            ))}
            <button
              className="btn small"
              onClick={() => {
                const text = window.prompt('细纲条目：')
                if (text) updateEvent(selectedEvent.id, (ev) => { (ev.checklist ??= []).push({ id: uid('k'), text, done: false }) })
              }}
            >＋ 细纲条目</button>

            <div className="side-sect" style={{ marginTop: 14 }}>关联 {selectedEvent.links.length}</div>
            {selectedEvent.links.map((l) => {
              const target = eventById.get(l.to)
              const owner = eventById.get(l.from)
              const isIncoming = l.from !== selectedEvent.id
              const other = isIncoming ? owner : target
              return (
                <div key={l.id} className="link-row">
                  <span className={`link-badge ${l.type}`}>
                    {OUTLINE_LINK_LABEL[l.type]} {isIncoming ? '←' : '→'}
                  </span>
                  <span className="link-other">{other?.title ?? '?'}</span>
                  <button className="del-btn" onClick={() => removeLink(isIncoming ? l.from : selectedEvent.id, l.id)}>✕</button>
                </div>
              )
            })}
            <button className="btn small" onClick={() => startLink(selectedEvent.id)}>＋ 连到另一张卡</button>

            {selectedEvent.stageId && (
              <div className="dim" style={{ marginTop: 14 }}>
                所属：{threadById.get(selectedEvent.threadId)?.name} · {stageById.get(selectedEvent.stageId)?.name}
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  )
}

const THREAD_COLORS = ['#e05d44', '#5e81ac', '#c9a227', '#5e9c76', '#8f6fc9', '#a49fb0']
function threadColor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return THREAD_COLORS[h % THREAD_COLORS.length]
}

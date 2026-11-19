// 关系图谱：自由画布节点图。节点 = 人物/地点/势力/物件/线索/事件，边 = 带标签的贝塞尔曲线。
// 交互：拖拽节点布点、锚点拖出连线、点选高亮邻接、类型过滤、双击空白建节点。
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { uid, useApp } from '../store'
import { KIND_COLOR, KIND_LABEL, type EntityKind } from '../types'
import './graph.css'

type FilterKind = EntityKind | 'event'

const KINDS: FilterKind[] = ['person', 'place', 'faction', 'item', 'clue', 'event']

const REL_PRESETS = ['亲属', '师徒', '同伴', '对立', '上下级', '归属', '持有', '知情', '因果', '伏笔→揭晓']

interface Pt {
  x: number
  y: number
}

export default function GraphView() {
  const book = useApp((s) => s.book)!
  const updateBook = useApp((s) => s.updateBook)

  const wrapRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const [positions, setPositions] = useState<Record<string, Pt>>({})
  // positions 提交后再补一轮渲染，让连线读取到已落位的节点 rect
  const [, setEdgeTick] = useState(0)
  useLayoutEffect(() => {
    setEdgeTick((t) => t + 1)
  }, [positions])
  const [selected, setSelected] = useState<{ type: 'node' | 'edge'; id: string } | null>(null)
  const [filters, setFilters] = useState<Set<FilterKind>>(new Set(KINDS))
  const [linking, setLinking] = useState<{ from: string; to: Pt } | null>(null)
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragState = useRef<
    | { kind: 'node'; id: string; offX: number; offY: number }
    | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
    | null
  >(null)

  // 数据源：设定实体 + 大纲事件（自动合成节点）
  const entityNodes = book.entities
  const eventNodes = book.outline.events.map((ev) => ({
    __event: ev,
    id: `ev:${ev.id}`,
    kind: 'event' as FilterKind,
    name: ev.title,
    role: book.outline.threads.find((t) => t.id === ev.threadId)?.name,
    color: undefined,
    graph: undefined,
  }))

  // 初始坐标：无 graph 坐标的节点按类型环形散布
  const layoutNode = useCallback(
    (_id: string, index: number, total: number): Pt => {
      const angle = (index / Math.max(total, 1)) * Math.PI * 2
      const radius = 190 + (index % 3) * 70
      return { x: 480 + Math.cos(angle) * radius, y: 320 + Math.sin(angle) * radius * 0.72 }
    },
    [],
  )

  const measure = useCallback(() => {
    const next: Record<string, Pt> = {}
    entityNodes.forEach((e, i) => {
      next[e.id] = e.graph ? { ...e.graph } : layoutNode(e.id, i, entityNodes.length)
    })
    eventNodes.forEach((n, i) => {
      // 事件节点用更大的外圈，避免与实体节点重叠
      const angle = ((entityNodes.length + i) / Math.max(entityNodes.length + eventNodes.length, 1)) * Math.PI * 2
      const radius = 430 + (i % 2) * 100
      next[n.id] = { x: 480 + Math.cos(angle) * radius, y: 320 + Math.sin(angle) * radius * 0.66 }
    })
    setPositions(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.entities, book.outline.events])

  useEffect(() => {
    measure()
  }, [measure])

  const persistPos = (id: string, p: Pt) => {
    if (id.startsWith('ev:')) return // 事件节点坐标暂不持久化（在大纲矩阵布局）
    updateBook((d) => {
      const ent = d.entities.find((x) => x.id === id)
      if (ent) ent.graph = { ...p }
    }, { immediate: true })
  }

  const kindVisible = (kind: FilterKind) => filters.has(kind)

  const isVisible = (id: string): boolean => {
    if (id.startsWith('ev:')) return kindVisible('event')
    const ent = book.entities.find((e) => e.id === id)
    return ent ? kindVisible(ent.kind) : false
  }

  // 邻接高亮集合
  const neighborIds = (() => {
    if (!selected) return null
    if (selected.type === 'node') {
      const set = new Set<string>([selected.id])
      for (const l of book.entityLinks) {
        if (l.from === selected.id) set.add(l.to)
        if (l.to === selected.id) set.add(l.from)
      }
      return set
    }
    const link = book.entityLinks.find((l) => l.id === selected.id)
    return link ? new Set([link.from, link.to]) : null
  })()

  // ── 指针交互 ──
  const onPointerDownNode = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    const p = positions[id]
    if (!p) return
    dragState.current = { kind: 'node', id, offX: e.clientX - p.x * zoom - pan.x, offY: e.clientY - p.y * zoom - pan.y }
    setSelected({ type: 'node', id })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.gnode')) return
    dragState.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setSelected(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current
    const wrap = wrapRef.current
    if (!st || !wrap) return
    const rect = wrap.getBoundingClientRect()
    if (st.kind === 'node') {
      const p = {
        x: Math.max(8, (e.clientX - st.offX - pan.x) / zoom),
        y: Math.max(8, (e.clientY - st.offY - pan.y) / zoom),
      }
      setPositions((prev) => ({ ...prev, [st.id]: p }))
    } else {
      setPan({ x: st.panX + (e.clientX - st.startX), y: st.panY + (e.clientY - st.startY) })
    }
    // 连线预览
    if (linking) {
      setLinking({ from: linking.from, to: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
    }
  }

  const onPointerUp = () => {
    const st = dragState.current
    dragState.current = null
    if (st?.kind === 'node') {
      const p = positions[st.id]
      if (p) persistPos(st.id, p)
    }
  }

  // 锚点拖出连线
  const onAnchorDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = wrapRef.current!.getBoundingClientRect()
    setLinking({ from: id, to: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onAnchorUp = (e: React.PointerEvent, targetId: string) => {
    if (!linking || linking.from === targetId) {
      setLinking(null)
      return
    }
    e.stopPropagation()
    const from = linking.from
    setLinking(null)
    const type = window.prompt(`关系类型（${REL_PRESETS.join(' / ')} 或自定义）：`, '同伴')?.trim()
    if (!type) return
    const note = window.prompt('关系备注（可空）：') ?? undefined
    updateBook((d) => {
      d.entityLinks.push({ id: uid('g'), from, to: targetId, type, note: note || undefined, directed: false })
    }, { immediate: true })
    setSelected({ type: 'edge', id: '' })
    setSelected(null)
  }

  // 双击空白：新建节点
  const onCanvasDouble = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.gnode, .gedge-label')) return
    const kind = window.prompt(`节点类型（${KINDS.slice(0, 5).map((k) => KIND_LABEL[k as EntityKind]).join(' / ')}）：`, '人物')
    if (!kind) return
    const kindMap: Record<string, EntityKind> = { 人物: 'person', 地点: 'place', 势力: 'faction', 物件: 'item', 线索: 'clue' }
    const entityKind = kindMap[kind]
    if (!entityKind) return
    const name = window.prompt('名称：')
    if (!name) return
    const rect = wrapRef.current!.getBoundingClientRect()
    const id = uid('n')
    const p = { x: (e.clientX - rect.left - pan.x) / zoom - 44, y: (e.clientY - rect.top - pan.y) / zoom - 44 }
    updateBook((d) => {
      d.entities.push({ id, kind: entityKind, name, graph: p })
    }, { immediate: true })
  }

  const deleteSelected = () => {
    if (!selected) return
    if (selected.type === 'node') {
      const ent = book.entities.find((e) => e.id === selected.id)
      if (!ent) return
      if (!window.confirm(`删除节点「${ent.name}」及其全部关系连线？（不删除设定档案本身）`)) return
      updateBook((d) => {
        d.entityLinks = d.entityLinks.filter((l) => l.from !== selected.id && l.to !== selected.id)
        const e = d.entities.find((x) => x.id === selected.id)
        if (e) delete e.graph
      }, { immediate: true })
    } else {
      if (!window.confirm('删除这条关系连线？')) return
      updateBook((d) => {
        d.entityLinks = d.entityLinks.filter((l) => l.id !== selected.id)
      }, { immediate: true })
    }
    setSelected(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const wrapRect = () => wrapRef.current!.getBoundingClientRect()

  const nodeCenter = (id: string): Pt => {
    const el = nodeRefs.current.get(id)
    const p = positions[id] ?? { x: 0, y: 0 }
    if (!el) return p
    const r = el.getBoundingClientRect()
    const wr = wrapRect()
    return { x: (r.left + r.width / 2 - wr.left - pan.x) / zoom, y: (r.top + r.height / 2 - wr.top - pan.y) / zoom }
  }

  const selectedLink = selected?.type === 'edge' ? book.entityLinks.find((l) => l.id === selected.id) : null
  const selectedNode = selected?.type === 'node' ? book.entities.find((e) => e.id === selected.id) : null

  const visibleLinks = book.entityLinks.filter((l) => isVisible(l.from) && isVisible(l.to))
  const dim = (id: string) => (neighborIds && !neighborIds.has(id))

  return (
    <div className="graph-zone" onPointerDown={onPointerDownCanvas} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onDoubleClick={onCanvasDouble}>
      {/* 类型过滤 */}
      <div className="graph-filters">
        {KINDS.map((k) => (
          <button
            key={k}
            className={`chip ${filters.has(k) ? 'on' : ''}`}
            onClick={() => {
              const next = new Set(filters)
              if (next.has(k)) next.delete(k)
              else next.add(k)
              setFilters(next)
            }}
          >
            {k !== 'event' && <span className="dot" style={{ background: KIND_COLOR[k as EntityKind] }} />}
            {k === 'event' ? '事件' : KIND_LABEL[k as EntityKind]}
          </button>
        ))}
        <span className="hint">拖动布点 · 从右侧锚点拖出连线 · 双击空白建节点 · Delete 删除选中</span>
      </div>

      <div className="graph-canvas" ref={wrapRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="graph-svg">
          <defs>
            <marker id="g-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--text-dim)" />
            </marker>
          </defs>
          {visibleLinks.map((l) => {
            const a = nodeCenter(l.from)
            const b = nodeCenter(l.to)
            const dx = Math.max(40, Math.abs(b.x - a.x) * 0.35)
            const d = `M ${a.x},${a.y} C ${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`
            const isSel = selected?.type === 'edge' && selected.id === l.id
            const lit = selected?.type === 'node' && !!neighborIds?.has(l.from) && !!neighborIds?.has(l.to)
            return (
              <g key={l.id} className={`gedge ${isSel ? 'sel' : ''} ${lit ? 'lit' : ''} ${dim(l.from) ? 'dim' : ''}`} onPointerDown={(e) => { e.stopPropagation(); setSelected({ type: 'edge', id: l.id }) }}>
                <path d={d} className="hit-path" />
                <path d={d} className="edge-path" markerEnd={l.directed ? 'url(#g-arrow)' : undefined} />
                <g className="gedge-label" style={{ transform: `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2 - 4}px)` }}>
                  <rect x={-Math.max(20, l.type.length * 7 + 10)} y="-11" width={Math.max(40, l.type.length * 14 + 20)} height="22" rx="11" />
                  <text textAnchor="middle" dominantBaseline="central">{l.type}</text>
                </g>
              </g>
            )
          })}
          {linking && (() => {
            const a = nodeCenter(linking.from)
            const b = linking.to
            return <path d={`M ${a.x},${a.y} L ${b.x / zoom},${b.y / zoom}`} className="edge-path preview" />
          })()}
        </svg>

        {/* 节点层 */}
        {entityNodes.filter((e) => isVisible(e.id)).map((ent) => (
          <div
            key={ent.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(ent.id, el)
              else nodeRefs.current.delete(ent.id)
            }}
            className={`gnode ${selected?.type === 'node' && selected.id === ent.id ? 'sel' : ''} ${dim(ent.id) ? 'dim' : ''}`}
            style={{ left: positions[ent.id]?.x ?? 0, top: positions[ent.id]?.y ?? 0, '--k': ent.color ?? KIND_COLOR[ent.kind] } as React.CSSProperties}
            onPointerDown={(e) => onPointerDownNode(e, ent.id)}
          >
            <div className="gavatar">{ent.name[0]}</div>
            <div className="gname">{ent.name}</div>
            <div className="gkind">{KIND_LABEL[ent.kind]}</div>
            <div className="ganchor" onPointerDown={(e) => onAnchorDown(e, ent.id)} onPointerUp={(e) => onAnchorUp(e, ent.id)} title="拖出连线" />
          </div>
        ))}

        {/* 事件节点 */}
        {kindVisible('event') &&
          eventNodes.map((n) => (
            <div
              key={n.id}
              className={`gnode event ${dim(n.id) ? 'dim' : ''}`}
              style={{ left: positions[n.id]?.x ?? 0, top: positions[n.id]?.y ?? 0, width: 116 } as React.CSSProperties}
            >
              <div className="gname">{n.name}</div>
              {n.role && <div className="gkind">{n.role}</div>}
            </div>
          ))}
      </div>

      {/* 缩放控件 */}
      <div className="zoom-ctl">
        <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}>＋</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>－</button>
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1) }}>复位</button>
      </div>

      {/* 详情 */}
      {selectedNode && (
        <aside className="panel graph-detail">
          <div className="panel-head">
            <span>节点详情</span>
            <button className="btn small" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="panel-body" style={{ padding: 14 }}>
            <p style={{ marginTop: 0 }}><b>{selectedNode.name}</b> <span className="tag">{KIND_LABEL[selectedNode.kind]}</span></p>
            {selectedNode.role && <p className="dim">{selectedNode.role}</p>}
            <p className="dim">{selectedNode.summary ?? '（无简介，在设定台补充）'}</p>
            <div className="side-sect">关系 {visibleLinks.filter((l) => l.from === selectedNode.id || l.to === selectedNode.id).length}</div>
            {visibleLinks
              .filter((l) => l.from === selectedNode.id || l.to === selectedNode.id)
              .map((l) => {
                const otherId = l.from === selectedNode.id ? l.to : l.from
                const other = book.entities.find((e) => e.id === otherId)
                return (
                  <div key={l.id} className="link-row">
                    <span className="tag">{l.type}{l.directed ? (l.from === selectedNode.id ? ' →' : ' ←') : ''}</span>
                    <span className="link-other">{other?.name ?? '?'}</span>
                    <button className="del-btn" onClick={() => updateBook((d) => { d.entityLinks = d.entityLinks.filter((x) => x.id !== l.id) }, { immediate: true })}>✕</button>
                  </div>
                )
              })}
            <button className="btn small danger" style={{ marginTop: 10 }} onClick={deleteSelected}>删除节点布线</button>
          </div>
        </aside>
      )}
      {selectedLink && (
        <aside className="panel graph-detail">
          <div className="panel-head">
            <span>连线详情</span>
            <button className="btn small" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="panel-body" style={{ padding: 14 }}>
            <p style={{ marginTop: 0 }}>
              <b>{book.entities.find((e) => e.id === selectedLink.from)?.name}</b>
              <span className="tag" style={{ margin: '0 6px' }}>{selectedLink.type}</span>
              <b>{book.entities.find((e) => e.id === selectedLink.to)?.name}</b>
            </p>
            <label className="field">
              <span className="label">关系类型</span>
              <input
                type="text"
                value={selectedLink.type}
                onChange={(e) => updateBook((d) => { const l = d.entityLinks.find((x) => x.id === selectedLink.id); if (l) l.type = e.target.value })}
              />
            </label>
            <label className="field">
              <span className="label">备注</span>
              <input
                type="text"
                value={selectedLink.note ?? ''}
                onChange={(e) => updateBook((d) => { const l = d.entityLinks.find((x) => x.id === selectedLink.id); if (l) l.note = e.target.value })}
              />
            </label>
            <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!selectedLink.directed}
                onChange={(e) => updateBook((d) => { const l = d.entityLinks.find((x) => x.id === selectedLink.id); if (l) l.directed = e.target.checked })}
              />
              <span className="label" style={{ margin: 0 }}>带方向（画箭头）</span>
            </label>
            <button className="btn small danger" onClick={deleteSelected}>删除连线</button>
          </div>
        </aside>
      )}
    </div>
  )
}

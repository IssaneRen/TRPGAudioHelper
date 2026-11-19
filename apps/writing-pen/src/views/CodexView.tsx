// 设定台：人物/地点/势力/物件/线索档案卡 + 详情编辑
import { useMemo, useState } from 'react'
import { uid, useApp } from '../store'
import {
  CLUE_STATUS_LABEL,
  KIND_COLOR,
  KIND_LABEL,
  type ClueStatus,
  type Entity,
  type EntityKind,
} from '../types'
import './codex.css'

const KINDS: EntityKind[] = ['person', 'place', 'faction', 'item', 'clue']

export default function CodexView() {
  const book = useApp((s) => s.book)!
  const updateBook = useApp((s) => s.updateBook)
  const [kind, setKind] = useState<EntityKind>('person')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => book.entities.filter((e) => e.kind === kind), [book.entities, kind])
  const editing = openId ? book.entities.find((e) => e.id === openId) ?? null : null

  const addEntity = () => {
    const name = window.prompt(`新建${KIND_LABEL[kind]}名称：`)
    if (!name) return
    const id = uid('n')
    updateBook((d) => d.entities.push({ id, kind, name }), { immediate: true })
    setOpenId(id)
  }

  const updateEntity = (id: string, fn: (e: Entity) => void) => {
    updateBook((d) => {
      const ent = d.entities.find((x) => x.id === id)
      if (ent) fn(ent)
    })
  }

  const chapterTitle = (chId?: string) => {
    if (!chId) return ''
    for (const v of book.volumes) {
      const ch = v.chapters.find((c) => c.id === chId)
      if (ch) return ch.title
    }
    return chId
  }

  return (
    <>
      <aside className="panel codex-side">
        <div className="panel-head"><span>分类</span></div>
        <div className="panel-body">
          {KINDS.map((k) => (
            <button
              key={k}
              className={`kind-row ${kind === k ? 'on' : ''}`}
              onClick={() => { setKind(k); setOpenId(null) }}
            >
              <span className="dot" style={{ background: KIND_COLOR[k] }} />
              {KIND_LABEL[k]}
              <span className="tcount">{book.entities.filter((e) => e.kind === k).length}</span>
            </button>
          ))}
        </div>
        <div className="panel-foot">
          <button className="btn small primary" onClick={addEntity}>＋ 新建{KIND_LABEL[kind]}</button>
        </div>
      </aside>

      <section className="codex-zone">
        <div className="codex-grid">
          {list.map((ent) => {
            const presence = (ent.presence ?? []).length
            const totalChapters = book.volumes.reduce((s, v) => s + v.chapters.length, 0)
            return (
              <div key={ent.id} className="codex-card" onClick={() => setOpenId(ent.id)}>
                <div className="avatar" style={{ background: ent.color ?? KIND_COLOR[ent.kind] }}>{ent.name[0]}</div>
                <div className="codex-main">
                  <div className="codex-name">
                    {ent.name}
                    {ent.kind === 'clue' && ent.clue && <span className="tag clue-st">{CLUE_STATUS_LABEL[ent.clue.status]}</span>}
                  </div>
                  {ent.role && <div className="dim">{ent.role}</div>}
                  <div className="codex-sum">{ent.summary}</div>
                  {ent.kind === 'person' && totalChapters > 0 && (
                    <div className="presence" title={`出场 ${presence} 章`}>
                      {book.volumes.flatMap((v) => v.chapters).map((ch) => (
                        <span key={ch.id} className={`seg ${(ent.presence ?? []).includes(ch.id) ? 'hit' : ''}`} />
                      ))}
                    </div>
                  )}
                  {ent.kind === 'clue' && ent.clue && (
                    <div className="dim">
                      {ent.clue.plantedIn ? `埋设于 ${chapterTitle(ent.clue.plantedIn)}` : '未标埋设章'}
                      {ent.clue.resolvedIn ? ` · 回收于 ${chapterTitle(ent.clue.resolvedIn)}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {list.length === 0 && (
            <div className="empty" style={{ gridColumn: '1 / -1' }}>还没有{KIND_LABEL[kind]}档案，左下角新建一个</div>
          )}
        </div>
      </section>

      {editing && (
        <aside className="panel codex-detail">
          <div className="panel-head">
            <span>档案 · {KIND_LABEL[editing.kind]}</span>
            <button className="btn small" onClick={() => setOpenId(null)}>✕</button>
          </div>
          <div className="panel-body" style={{ padding: 14 }}>
            <label className="field">
              <span className="label">名称</span>
              <input type="text" value={editing.name} onChange={(e) => updateEntity(editing.id, (x) => { x.name = e.target.value })} />
            </label>
            <label className="field">
              <span className="label">定位（一句话身份）</span>
              <input type="text" value={editing.role ?? ''} onChange={(e) => updateEntity(editing.id, (x) => { x.role = e.target.value })} />
            </label>
            <label className="field">
              <span className="label">简介</span>
              <textarea rows={4} value={editing.summary ?? ''} onChange={(e) => updateEntity(editing.id, (x) => { x.summary = e.target.value })} />
            </label>
            <label className="field">
              <span className="label">别名（逗号分隔）</span>
              <input
                type="text"
                value={(editing.aliases ?? []).join('，')}
                onChange={(e) => updateEntity(editing.id, (x) => { x.aliases = e.target.value ? e.target.value.split(/[，,]/).map((s) => s.trim()).filter(Boolean) : undefined })}
              />
            </label>
            <label className="field">
              <span className="label">标记色</span>
              <input
                type="color"
                value={editing.color ?? KIND_COLOR[editing.kind]}
                onChange={(e) => updateEntity(editing.id, (x) => { x.color = e.target.value })}
                style={{ width: 46, height: 28, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--panel-2)' }}
              />
            </label>

            {editing.kind === 'person' && (
              <div className="field">
                <span className="label">出场章节（勾选）</span>
                {book.volumes.map((v) => (
                  <div key={v.id} className="presence-edit">
                    <div className="dim" style={{ margin: '6px 0 3px' }}>{v.title}</div>
                    {v.chapters.map((ch) => (
                      <label key={ch.id} className="chcheck">
                        <input
                          type="checkbox"
                          checked={(editing.presence ?? []).includes(ch.id)}
                          onChange={(e) => updateEntity(editing.id, (x) => {
                            const set = new Set(x.presence ?? [])
                            if (e.target.checked) set.add(ch.id)
                            else set.delete(ch.id)
                            x.presence = set.size ? [...set] : undefined
                          })}
                        />
                        <span>{ch.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {editing.kind === 'clue' && (
              <>
                <div className="field">
                  <span className="label">线索状态</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(Object.entries(CLUE_STATUS_LABEL) as [ClueStatus, string][]).map(([v, label]) => (
                      <button
                        key={v}
                        className={`chip ${(editing.clue?.status ?? 'planted') === v ? 'on' : ''}`}
                        onClick={() => updateEntity(editing.id, (x) => { x.clue = { status: v, plantedIn: x.clue?.plantedIn, resolvedIn: x.clue?.resolvedIn, traces: x.clue?.traces ?? [] } })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="label">埋设章 / 回收章</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={editing.clue?.plantedIn ?? ''}
                      onChange={(e) => updateEntity(editing.id, (x) => { x.clue = { ...x.clue!, plantedIn: e.target.value || undefined } })}
                    >
                      <option value="">埋设章…</option>
                      {book.volumes.flatMap((v) => v.chapters).map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.title}</option>
                      ))}
                    </select>
                    <select
                      value={editing.clue?.resolvedIn ?? ''}
                      onChange={(e) => updateEntity(editing.id, (x) => { x.clue = { ...x.clue!, resolvedIn: e.target.value || undefined } })}
                    >
                      <option value="">回收章…</option>
                      {book.volumes.flatMap((v) => v.chapters).map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <span className="label">记录到的痕迹</span>
                  {(editing.clue?.traces ?? []).map((t, i) => (
                    <div key={i} className="trace-row">
                      <input
                        type="text"
                        value={t}
                        onChange={(e) => updateEntity(editing.id, (x) => { if (x.clue) x.clue.traces[i] = e.target.value })}
                      />
                      <button className="del-btn" onClick={() => updateEntity(editing.id, (x) => { x.clue?.traces.splice(i, 1) })}>✕</button>
                    </div>
                  ))}
                  <button
                    className="btn small"
                    onClick={() => updateEntity(editing.id, (x) => { x.clue = { status: x.clue?.status ?? 'planted', traces: x.clue?.traces ?? [] }; x.clue.traces.push('新痕迹') })}
                  >＋ 痕迹</button>
                </div>
              </>
            )}

            <button
              className="btn small danger"
              style={{ marginTop: 8 }}
              onClick={() => {
                if (!window.confirm(`删除${KIND_LABEL[editing.kind]}「${editing.name}」？（同时移除图谱中的节点与连线）`)) return
                updateBook((d) => {
                  d.entities = d.entities.filter((x) => x.id !== editing.id)
                  d.entityLinks = d.entityLinks.filter((l) => l.from !== editing.id && l.to !== editing.id)
                }, { immediate: true })
                setOpenId(null)
              }}
            >删除档案</button>
          </div>
        </aside>
      )}
    </>
  )
}

// 写作视图：章节树 + 正文编辑 + 右栏（提要/关联/线索/批注）
import { useMemo, useRef, useState } from 'react'
import { scheduleSave, uid, useApp } from '../store'
import { countWords, findMentions, recordDailyWords, todayWords, streakDays } from '../lib/words'
import { CLUE_STATUS_LABEL, KIND_COLOR, KIND_LABEL, type Chapter } from '../types'
import './write.css'

export default function WriteView() {
  const book = useApp((s) => s.book)!
  const updateBook = useApp((s) => s.updateBook)
  const [currentId, setCurrentId] = useState<string>(() => book.volumes[0]?.chapters[0]?.id ?? '')
  const [tab, setTab] = useState<'feed' | 'cast' | 'clues' | 'notes'>('feed')
  const prevTotal = useRef(bookTotal(book))
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const chapter = useMemo(() => {
    for (const v of book.volumes) {
      const ch = v.chapters.find((c) => c.id === currentId)
      if (ch) return { vol: v, ch }
    }
    return null
  }, [book, currentId])

  const changeChapterContent = (content: string) => {
    if (!chapter) return
    const before = prevTotal.current
    updateBook((draft) => {
      for (const v of draft.volumes) {
        const ch = v.chapters.find((c) => c.id === chapter.ch.id)
        if (ch) {
          ch.content = content
          break
        }
      }
      const total = bookTotal(draft)
      recordDailyWords(draft, before, total)
      prevTotal.current = total
    })
    scheduleSave()
    setTimeout(() => setSavedAt(new Date()), 0)
  }

  const addChapter = (volId: string) => {
    const id = uid('c')
    updateBook((draft) => {
      const vol = draft.volumes.find((v) => v.id === volId)
      if (!vol) return
      vol.chapters.push({ id, title: `第${vol.chapters.length + 1}章`, content: '' })
    }, { immediate: true })
    setCurrentId(id)
  }

  const addVolume = () => {
    updateBook((draft) => {
      const n = draft.volumes.length + 1
      const volId = uid('v')
      draft.volumes.push({ id: volId, title: `第${n}卷`, chapters: [] })
    }, { immediate: true })
  }

  const renameChapter = (chId: string) => {
    const current = book.volumes.flatMap((v) => v.chapters).find((c) => c.id === chId)
    const title = window.prompt('章节标题：', current?.title ?? '')
    if (!title) return
    updateBook((draft) => {
      for (const v of draft.volumes) {
        const ch = v.chapters.find((c) => c.id === chId)
        if (ch) ch.title = title
      }
    }, { immediate: true })
  }

  const mentions = chapter ? findMentions(book, chapter.ch.content) : []
  const clueEntities = book.entities.filter((e) => e.kind === 'clue')
  const chapterClues = clueEntities.filter(
    (e) =>
      (e.clue?.plantedIn && chapter && e.clue.plantedIn === chapter.ch.id) ||
      (e.clue?.resolvedIn && chapter && e.clue.resolvedIn === chapter.ch.id) ||
      e.clue?.traces.some((t) => chapter && chapter.ch.content.includes(t)) ||
      (chapter?.ch.content.includes(e.name) ?? false),
  )

  return (
    <>
      <aside className="panel chapter-panel">
        <div className="panel-head">
          <span>章节目录</span>
          <button className="btn small" onClick={addVolume}>＋卷</button>
        </div>
        <div className="panel-body">
          {book.volumes.map((vol) => (
            <div key={vol.id} className="vol">
              <div className="vol-head">{vol.title} · {vol.chapters.length}章</div>
              {vol.chapters.map((ch) => (
                <div
                  key={ch.id}
                  className={`chrow ${ch.id === currentId ? 'on' : ''}`}
                  onClick={() => setCurrentId(ch.id)}
                  onDoubleClick={() => renameChapter(ch.id)}
                >
                  <span className="chtitle">{ch.title}</span>
                  <span className="chwords">{countWords(ch.content) || ''}</span>
                </div>
              ))}
              <button className="addch" onClick={() => addChapter(vol.id)}>＋ 新章节</button>
            </div>
          ))}
        </div>
        <div className="panel-foot">
          今日 {todayWords(book)}{book.dailyGoal ? ` / ${book.dailyGoal}` : ''} · 连续 {streakDays(book)} 天
        </div>
      </aside>

      <section className="editor-zone">
        {chapter ? (
          <>
            <div className="crumb">{chapter.vol.title} · {chapter.ch.title}{chapter.ch.summary ? ' · ' + chapter.ch.summary : ''}</div>
            <h1 className="chtitle-big">{chapter.ch.title}</h1>
            <div className="ornament" aria-hidden="true" />
            <textarea
              className="editor"
              value={chapter.ch.content}
              onChange={(e) => changeChapterContent(e.target.value)}
              placeholder="从这里开始写……"
              spellCheck={false}
            />
            <div className="editor-foot">
              {countWords(chapter.ch.content)} 字 · {savedAt ? '已保存 ' + savedAt.toLocaleTimeString() : '自动保存中'}
              <button className="btn small" onClick={() => renameChapter(chapter.ch.id)}>改章名</button>
            </div>
          </>
        ) : (
          <div className="empty">在左侧选择或新建章节</div>
        )}
      </section>

      <aside className="panel side-panel">
        <div className="side-tabs">
          {([['feed', '提要'], ['cast', '关联'], ['clues', '线索'], ['notes', '批注']] as const).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="panel-body side-body">
          {tab === 'feed' && chapter && (
            <textarea
              className="summary-edit"
              placeholder="这一章的提要……"
              value={chapter.ch.summary ?? ''}
              onChange={(e) => {
                const v = e.target.value
                updateBook((draft) => {
                  for (const vol of draft.volumes) {
                    const ch = vol.chapters.find((c) => c.id === chapter.ch.id)
                    if (ch) ch.summary = v
                  }
                })
                scheduleSave()
              }}
            />
          )}
          {tab === 'cast' && (
            <>
              <div className="side-sect">出场人物 / 地点 {mentions.length}</div>
              {mentions.map((m) => (
                <div key={m.id} className="mention-card">
                  <span className="avatar" style={{ background: m.color ?? KIND_COLOR[m.kind] }}>{m.name[0]}</span>
                  <div className="mention-main">
                    <div className="mention-name">{m.name} <span className="tag">{KIND_LABEL[m.kind]}</span>{m.role ? <span className="tag">{m.role}</span> : null}</div>
                    <div className="mention-sum">{m.summary}</div>
                    {m.aliases?.length ? <div className="mention-alias">别名：{m.aliases.join(' / ')}</div> : null}
                  </div>
                </div>
              ))}
              {mentions.length === 0 && <div className="empty-sm">正文暂未出现设定名</div>}
            </>
          )}
          {tab === 'clues' && (
            <>
              <div className="side-sect">本章相关线索 {chapterClues.length}</div>
              {chapterClues.map((c) => (
                <div key={c.id} className="mention-card">
                  <span className="avatar" style={{ background: c.color ?? KIND_COLOR.clue }}>线</span>
                  <div className="mention-main">
                    <div className="mention-name">{c.name} <span className="tag clue-st">{c.clue ? CLUE_STATUS_LABEL[c.clue.status] : ''}</span></div>
                    <div className="mention-sum">{c.summary}</div>
                    {c.clue?.traces.slice(0, 3).map((t, i) => <div key={i} className="trace">· {t}</div>)}
                  </div>
                </div>
              ))}
              {chapterClues.length === 0 && <div className="empty-sm">本章暂无线索</div>}
            </>
          )}
          {tab === 'notes' && chapter && (
            <>
              <button
                className="btn small"
                onClick={() => {
                  const note = window.prompt('批注内容（先在正文中复制引文）：')
                  if (!note) return
                  updateBook((draft) => {
                    for (const vol of draft.volumes) {
                      const ch = vol.chapters.find((c) => c.id === chapter.ch.id)
                      if (ch) (ch.annotations ??= []).push({ id: uid('a'), quote: '', note })
                    }
                  }, { immediate: true })
                }}
              >＋ 添加批注</button>
              {(chapter.ch.annotations ?? []).map((a) => (
                <div key={a.id} className="mention-card">
                  <div className="mention-main">
                    {a.quote && <div className="mention-sum">「{a.quote}」</div>}
                    <div className="mention-name" style={{ fontWeight: 400 }}>{a.note}</div>
                    <button
                      className="btn small danger"
                      style={{ marginTop: 6 }}
                      onClick={() => {
                        updateBook((draft) => {
                          for (const vol of draft.volumes) {
                            const ch = vol.chapters.find((c) => c.id === chapter.ch.id)
                            if (ch?.annotations) ch.annotations = ch.annotations.filter((x) => x.id !== a.id)
                          }
                        }, { immediate: true })
                      }}
                    >删除</button>
                  </div>
                </div>
              ))}
              {(chapter.ch.annotations ?? []).length === 0 && <div className="empty-sm">暂无批注</div>}
            </>
          )}
        </div>
      </aside>
    </>
  )
}

function bookTotal(book: { volumes: { chapters: Pick<Chapter, 'content'>[] }[] }): number {
  return book.volumes.reduce((s, v) => s + v.chapters.reduce((n, c) => n + countWords(c.content), 0), 0)
}

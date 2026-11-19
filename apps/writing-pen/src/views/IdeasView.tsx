// 灵感箱：随手记想法，可转大纲事件或线索
import { useState } from 'react'
import { uid, useApp } from '../store'
import './ideas.css'

export default function IdeasView() {
  const book = useApp((s) => s.book)!
  const updateBook = useApp((s) => s.updateBook)
  const [text, setText] = useState('')

  const addIdea = () => {
    const t = text.trim()
    if (!t) return
    updateBook((d) => d.ideas.unshift({ id: uid('i'), text: t, createdAt: new Date().toISOString() }), { immediate: true })
    setText('')
  }

  const asOutlineEvent = (ideaId: string) => {
    const idea = book.ideas.find((i) => i.id === ideaId)
    if (!idea) return
    const thread = book.outline.threads[0]
    if (!thread) {
      window.alert('请先在大纲里建一条剧情线')
      return
    }
    updateBook((d) => {
      d.outline.events.push({
        id: uid('e'),
        threadId: thread.id,
        title: idea.text.slice(0, 18),
        summary: idea.text,
        status: 'tothink',
        links: [],
      })
      const idea2 = d.ideas.find((i) => i.id === ideaId)
      if (idea2) idea2.used = true
    }, { immediate: true })
  }

  const asClue = (ideaId: string) => {
    const idea = book.ideas.find((i) => i.id === ideaId)
    if (!idea) return
    updateBook((d) => {
      d.entities.push({
        id: uid('n'),
        kind: 'clue',
        name: idea.text.slice(0, 12),
        summary: idea.text,
        clue: { status: 'planted', traces: [] },
      })
      const idea2 = d.ideas.find((i) => i.id === ideaId)
      if (idea2) idea2.used = true
    }, { immediate: true })
  }

  return (
    <section className="ideas-zone">
      <div className="ideas-input">
        <input
          type="text"
          value={text}
          placeholder="记录突发构思，回车存入灵感箱…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addIdea()}
          autoFocus
        />
        <button className="btn primary" onClick={addIdea}>存入</button>
      </div>
      <div className="ideas-list">
        {book.ideas.map((i) => (
          <div key={i.id} className={`idea-card ${i.used ? 'used' : ''}`}>
            <div className="idea-text">{i.text}</div>
            <div className="idea-foot">
              <span className="dim">{new Date(i.createdAt).toLocaleString()}</span>
              <span className="idea-actions">
                {!i.used && (
                  <>
                    <button className="btn small" onClick={() => asOutlineEvent(i.id)}>转大纲事件</button>
                    <button className="btn small" onClick={() => asClue(i.id)}>转线索</button>
                  </>
                )}
                {i.used && <span className="tag">已使用</span>}
                <button
                  className="del-btn"
                  onClick={() => {
                    if (window.confirm('删除这条灵感？')) updateBook((d) => { d.ideas = d.ideas.filter((x) => x.id !== i.id) }, { immediate: true })
                  }}
                >✕</button>
              </span>
            </div>
          </div>
        ))}
        {book.ideas.length === 0 && <div className="empty">灵感箱是空的，想到什么就记下来</div>}
      </div>
    </section>
  )
}

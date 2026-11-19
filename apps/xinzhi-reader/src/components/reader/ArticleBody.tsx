import { useMemo } from 'react'
import { ArrowUpRight, Link2 } from 'lucide-react'
import { Figure } from '@/components/Figure'
import { splitByHighlights } from '@/lib/text'
import type { Article, Block, Highlight } from '@/types'

function RichText({
  text,
  highlights,
  flashId,
  noteIds,
  onMarkClick,
}: {
  text: string
  highlights: Pick<Highlight, 'id' | 'start' | 'end' | 'color'>[]
  flashId?: string | null
  noteIds: Set<string>
  onMarkClick: (id: string, element: HTMLElement) => void
}) {
  const runs = splitByHighlights(text, highlights)
  return (
    <>
      {runs.map((run, index) =>
        run.highlightId ? (
          <mark
            key={`${run.highlightId}-${index}`}
            data-highlight-id={run.highlightId}
            className={`hl hl--${run.color} ${noteIds.has(run.highlightId) ? 'has-note' : ''} ${
              flashId === run.highlightId ? 'is-flash' : ''
            }`}
            onClick={(event) => {
              event.stopPropagation()
              onMarkClick(run.highlightId as string, event.currentTarget)
            }}
          >
            {run.text}
          </mark>
        ) : (
          <span key={`t-${index}`}>{run.text}</span>
        ),
      )}
    </>
  )
}

export function ArticleBody({
  article,
  highlights,
  flashHighlightId,
  speakingBlockId,
  onMarkClick,
  onNoteClick,
}: {
  article: Article
  highlights: Highlight[]
  flashHighlightId?: string | null
  speakingBlockId?: string | null
  onMarkClick: (id: string, element: HTMLElement) => void
  onNoteClick: (id: string) => void
}) {
  const byBlock = useMemo(() => {
    const map = new Map<string, Highlight[]>()
    for (const highlight of highlights) {
      const list = map.get(highlight.blockId) || []
      list.push(highlight)
      map.set(highlight.blockId, list)
    }
    return map
  }, [highlights])

  const noteIds = useMemo(
    () => new Set(highlights.filter((highlight) => highlight.note).map((highlight) => highlight.id)),
    [highlights],
  )

  const renderBlock = (block: Block) => {
    if (block.type === 'figure' && block.figure) {
      return <Figure kind={block.figure} caption={block.caption} />
    }
    if (block.type === 'divider') {
      return (
        <div className="reader-divider" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )
    }
    if (block.type === 'link' && block.href) {
      return (
        <a className="reader-link-card" href={block.href} target="_blank" rel="noreferrer">
          <span className="reader-link-icon">
            <Link2 size={17} strokeWidth={1.7} />
          </span>
          <span className="reader-link-body">
            <strong>{block.text || block.href}</strong>
            <em>{block.caption || '打开原文'}</em>
            <span>{block.href}</span>
          </span>
          <ArrowUpRight size={17} className="reader-link-arrow" />
        </a>
      )
    }
    if (block.type === 'list' && block.items) {
      return (
        <ul className="reader-list">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    }
    if (!block.text) return null

    const blockHighlights = byBlock.get(block.id) || []
    const rich = (
      <RichText
        text={block.text}
        highlights={blockHighlights.map((highlight) => ({
          id: highlight.id,
          start: highlight.start,
          end: highlight.end,
          color: highlight.color,
        }))}
        flashId={flashHighlightId}
        noteIds={noteIds}
        onMarkClick={onMarkClick}
      />
    )

    if (block.type === 'h2') {
      return (
        <h2 data-block-id={block.id} className="reader-h2">
          {rich}
        </h2>
      )
    }
    if (block.type === 'h3') {
      return (
        <h3 data-block-id={block.id} className="reader-h3">
          {rich}
        </h3>
      )
    }
    if (block.type === 'quote') {
      return (
        <blockquote data-block-id={block.id} className="reader-quote">
          {rich}
        </blockquote>
      )
    }
    return (
      <p data-block-id={block.id} className="reader-p">
        {rich}
      </p>
    )
  }

  return (
    <div className="reader-body">
      {article.blocks.map((block) => {
        const notes = (byBlock.get(block.id) || []).filter((highlight) => highlight.note)
        const speaking = speakingBlockId === block.id
        return (
          <div
            key={block.id}
            className={`reader-block ${speaking ? 'is-speaking' : ''}`}
            data-reading-block={block.id}
          >
            {renderBlock(block)}
            {notes.map((highlight) => (
              <button
                key={highlight.id}
                type="button"
                className="inline-note"
                onClick={() => onNoteClick(highlight.id)}
              >
                <span className="inline-note-label">想法</span>
                <span className="inline-note-text">{highlight.note}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

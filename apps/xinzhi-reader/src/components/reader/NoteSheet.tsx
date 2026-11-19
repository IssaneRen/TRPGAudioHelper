import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { useStore } from '@/lib/store'
import { ageLabel } from '@/lib/text'

export function NoteSheet({
  highlightId,
  onClose,
}: {
  highlightId: string | null
  onClose: () => void
}) {
  const highlights = useStore((state) => state.highlights)
  const articles = useStore((state) => state.articles)
  const setHighlightNote = useStore((state) => state.setHighlightNote)
  const toast = useToast()
  const highlight = highlights.find((entry) => entry.id === highlightId)
  const article = articles.find((entry) => entry.id === highlight?.articleId)
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const open = Boolean(highlightId && highlight)

  useEffect(() => {
    if (!open) return
    setText(highlight?.note || '')
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 160)
    return () => window.clearTimeout(timer)
  }, [highlightId, open, highlight?.note])

  function save() {
    if (!highlight) return
    setHighlightNote(highlight.id, text)
    if (!text.trim() && highlight.note) {
      toast('想法已删除')
    } else {
      toast('想法已记下')
    }
    onClose()
  }

  if (!highlight) {
    return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  }

  return (
    <Sheet open={open} onClose={onClose} title="写想法" className="note-sheet">
      <div className="note-body">
        <div className={`note-quote note-quote--${highlight.color}`}>
          <p>“{highlight.text}”</p>
          <span>
            {article?.title} · {ageLabel(highlight.createdAt)}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="这句话让你想到了什么？"
          rows={6}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              save()
            }
          }}
        />
        <div className="note-foot">
          <button
            type="button"
            className="text-button note-delete"
            onClick={() => {
              if (!text.trim()) {
                toast('先写点什么吧')
                return
              }
              setHighlightNote(highlight.id, '')
              toast('想法已清空')
              onClose()
            }}
          >
            <Trash2 size={14} />
            清空
          </button>
          <span className="note-local">只保存在本地</span>
          <button type="button" className="primary-button" onClick={save}>
            保存
            <kbd>⌘ ↵</kbd>
          </button>
        </div>
      </div>
    </Sheet>
  )
}

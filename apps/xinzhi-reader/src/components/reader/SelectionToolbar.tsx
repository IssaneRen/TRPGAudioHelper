import { Copy, ImageDown, StickyNote, Trash2 } from 'lucide-react'
import type { HighlightColor } from '@/types'

export const highlightColors: { value: HighlightColor; label: string }[] = [
  { value: 'yellow', label: '藤黄' },
  { value: 'coral', label: '珊瑚' },
  { value: 'blue', label: '天青' },
  { value: 'green', label: '苔绿' },
]

export interface SelectionState {
  blockId: string
  start: number
  end: number
  text: string
  top: number
  left: number
  above: boolean
  highlightId?: string
  color?: HighlightColor
}

export function SelectionToolbar({
  selection,
  onColor,
  onCopy,
  onNote,
  onShare,
  onDelete,
}: {
  selection: SelectionState
  onColor: (color: HighlightColor) => void
  onCopy: () => void
  onNote: () => void
  onShare: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`selection-bar ${selection.above ? 'is-above' : 'is-below'}`}
      style={{ top: selection.top, left: selection.left }}
      role="toolbar"
      aria-label="划线操作"
    >
      <div className="selection-colors">
        {highlightColors.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`selection-color selection-color--${color.value} ${
              selection.color === color.value ? 'is-current' : ''
            }`}
            aria-label={color.label}
            title={color.label}
            onClick={() => onColor(color.value)}
          />
        ))}
      </div>
      <span className="selection-sep" aria-hidden="true" />
      <button type="button" className="selection-action" onClick={onCopy}>
        <Copy size={16} strokeWidth={1.7} />
        <span>复制</span>
      </button>
      <button type="button" className="selection-action" onClick={onNote}>
        <StickyNote size={16} strokeWidth={1.7} />
        <span>想法</span>
      </button>
      <button type="button" className="selection-action" onClick={onShare}>
        <ImageDown size={16} strokeWidth={1.7} />
        <span>分享</span>
      </button>
      {selection.highlightId && (
        <button type="button" className="selection-action is-danger" onClick={onDelete}>
          <Trash2 size={16} strokeWidth={1.7} />
          <span>删除</span>
        </button>
      )}
    </div>
  )
}

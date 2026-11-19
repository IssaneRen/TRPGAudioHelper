import { BookOpen, FileText, Link2, Mic, PenLine, Rss } from 'lucide-react'
import type { SourceKind } from '@/types'

const icons = {
  newsletter: Rss,
  web: Link2,
  book: BookOpen,
  note: PenLine,
  voice: Mic,
  pdf: FileText,
}

export function SourceIcon({
  kind,
  size = 36,
  className = '',
}: {
  kind: SourceKind
  size?: number
  className?: string
}) {
  const Icon = icons[kind] || Link2
  return (
    <span
      className={`source-icon source-icon--${kind} ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
      aria-hidden="true"
    >
      <Icon size={Math.max(14, Math.round(size * 0.46))} strokeWidth={1.7} />
    </span>
  )
}

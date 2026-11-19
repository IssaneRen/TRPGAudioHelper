import { X } from 'lucide-react'
import { FloatingPanel } from '@/components/Sheet'
import { ReadingControls } from '@/components/ReadingControls'
import type { Article } from '@/types'

export function ReaderSettingsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <FloatingPanel open={open} onClose={onClose} className="reader-panel settings-panel" label="排版设置">
      <header className="panel-head">
        <div>
          <h2>排版</h2>
          <p>调到眼睛最舒服的样子</p>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="关闭">
          <X size={17} />
        </button>
      </header>
      <ReadingControls showAppearance />
    </FloatingPanel>
  )
}

export function TocPanel({
  open,
  onClose,
  article,
  activeBlockId,
  onJump,
}: {
  open: boolean
  onClose: () => void
  article: Article
  activeBlockId?: string | null
  onJump: (blockId: string) => void
}) {
  const headings = article.blocks.filter((block) => block.type === 'h2' || block.type === 'h3')

  return (
    <FloatingPanel open={open} onClose={onClose} className="reader-panel toc-panel" label="目录">
      <header className="panel-head">
        <div>
          <h2>目录</h2>
          <p>{headings.length > 0 ? `共 ${headings.length} 节` : '这篇文章没有分节'}</p>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="关闭">
          <X size={17} />
        </button>
      </header>
      <div className="toc-list">
        {headings.map((heading, index) => (
          <button
            key={heading.id}
            type="button"
            className={`toc-item ${heading.type === 'h3' ? 'is-sub' : ''} ${
              activeBlockId === heading.id ? 'is-active' : ''
            }`}
            onClick={() => onJump(heading.id)}
          >
            <span className="toc-index">{String(index + 1).padStart(2, '0')}</span>
            <span>{heading.text}</span>
          </button>
        ))}
        {headings.length === 0 && <p className="toc-empty">这是一篇短文，一口气读完就好。</p>}
      </div>
    </FloatingPanel>
  )
}

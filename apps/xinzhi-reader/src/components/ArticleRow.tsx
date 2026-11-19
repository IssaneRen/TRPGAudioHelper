import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ChevronRight, Highlighter } from 'lucide-react'
import { SourceIcon } from '@/components/SourceIcon'
import { useStore } from '@/lib/store'
import { excerptOf, readingMinutes, relativeTime } from '@/lib/text'
import type { Article } from '@/types'

export function ArticleRow({
  article,
  onArchive,
  archiveLabel = '归档',
  showExcerpt = true,
  actionIcon,
}: {
  article: Article
  onArchive?: () => void
  archiveLabel?: string
  showExcerpt?: boolean
  actionIcon?: ReactNode
}) {
  const highlights = useStore((state) => state.highlights)
  const highlightCount = useMemo(
    () => highlights.filter((highlight) => highlight.articleId === article.id).length,
    [highlights, article.id],
  )
  const percent = Math.round(article.progress * 100)
  const excerpt = excerptOf(article, 76)

  return (
    <div className={`article-row ${article.progress > 0 ? 'is-started' : ''}`}>
      <Link to={`/read/${article.id}`} className="article-row-link">
        <SourceIcon kind={article.source.kind} size={38} />
        <div className="article-row-body">
          <div className="article-row-title-line">
            <h3>{article.title}</h3>
            {article.progress === 0 && <span className="unread-dot" aria-label="未读" />}
          </div>
          {showExcerpt && excerpt && <p className="article-row-excerpt">{excerpt}</p>}
          <div className="article-row-meta">
            <span>{article.source.name}</span>
            <span className="meta-dot" />
            <span>{relativeTime(article.savedAt)}</span>
            <span className="meta-dot" />
            <span>{readingMinutes(article)} 分钟</span>
            {highlightCount > 0 && (
              <span className="row-highlight-count" title={`${highlightCount} 处划线`}>
                <Highlighter size={11} strokeWidth={1.8} />
                {highlightCount}
              </span>
            )}
            {article.tags[0] && <span className="row-tag">#{article.tags[0]}</span>}
          </div>
          {percent > 0 && percent < 100 && (
            <div className="row-progress" aria-label={`已读 ${percent}%`}>
              <span style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
        {!onArchive && <ChevronRight size={16} className="row-chevron" aria-hidden="true" />}
      </Link>
      {onArchive && (
        <button
          type="button"
          className="row-action"
          onClick={onArchive}
          aria-label={archiveLabel}
          title={archiveLabel}
        >
          {actionIcon || <Archive size={15} strokeWidth={1.7} />}
        </button>
      )}
    </div>
  )
}

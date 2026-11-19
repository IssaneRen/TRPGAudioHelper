import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, FileText, Highlighter, Search, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { articlePlainText, excerptOf, relativeTime } from '@/lib/text'

interface ArticleResult {
  kind: 'article'
  id: string
  title: string
  source: string
  meta: string
  excerpt: string
}

interface HighlightResult {
  kind: 'highlight'
  id: string
  articleId: string
  title: string
  text: string
  note?: string
  meta: string
}

type Result = ArticleResult | HighlightResult

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const articles = useStore((state) => state.articles)
  const highlights = useStore((state) => state.highlights)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previous
    }
  }, [open])

  const { articleResults, highlightResults } = useMemo(() => {
    const term = query.trim().toLowerCase()
    const articleMatches: ArticleResult[] = []
    const highlightMatches: HighlightResult[] = []

    const articlePool = [...articles].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    )
    for (const article of articlePool) {
      const haystack = [
        article.title,
        article.subtitle,
        article.tags.join(' '),
        articlePlainText(article),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (term && !haystack.includes(term)) continue
      articleMatches.push({
        kind: 'article',
        id: article.id,
        title: article.title,
        source: article.source.name,
        meta: relativeTime(article.savedAt),
        excerpt: excerptOf(article, 70),
      })
      if (articleMatches.length >= 5) break
    }

    const highlightPool = [...highlights].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    for (const highlight of highlightPool) {
      const article = articles.find((entry) => entry.id === highlight.articleId)
      if (!article) continue
      const haystack = [highlight.text, highlight.note, article.title].filter(Boolean).join(' ').toLowerCase()
      if (term && !haystack.includes(term)) continue
      highlightMatches.push({
        kind: 'highlight',
        id: highlight.id,
        articleId: highlight.articleId,
        title: article.title,
        text: highlight.text,
        note: highlight.note,
        meta: relativeTime(highlight.createdAt),
      })
      if (highlightMatches.length >= 4) break
    }

    return { articleResults: articleMatches, highlightResults: highlightMatches }
  }, [articles, highlights, query])

  const flat: Result[] = useMemo(
    () => [...articleResults, ...highlightResults],
    [articleResults, highlightResults],
  )

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    document.querySelector('[data-search-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((current) => (flat.length ? (current + 1) % flat.length : 0))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((current) => (flat.length ? (current - 1 + flat.length) % flat.length : 0))
      }
      if (event.key === 'Enter') {
        const item = flat[active]
        if (item) {
          event.preventDefault()
          choose(item)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  if (!open) return null

  function choose(item: Result) {
    onClose()
    if (item.kind === 'article') {
      navigate(`/read/${item.id}`)
    } else {
      navigate(`/read/${item.articleId}`, { state: { highlightId: item.id } })
    }
  }

  const hasResults = flat.length > 0

  return createPortal(
    <div className="palette-root">
      <button className="palette-scrim" aria-label="关闭搜索" onClick={onClose} tabIndex={-1} />
      <div className="palette-panel" role="dialog" aria-modal="true" aria-label="搜索">
        <div className="palette-input-row">
          <Search size={18} strokeWidth={1.7} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文章、划线或想法…"
            aria-label="搜索"
          />
          {query ? (
            <button type="button" className="palette-clear" onClick={() => setQuery('')} aria-label="清空">
              <X size={15} />
            </button>
          ) : (
            <kbd>esc</kbd>
          )}
        </div>

        <div className="palette-results">
          {articleResults.length > 0 && (
            <section className="palette-section">
              <p className="palette-label">{query ? '文章' : '最近收藏'}</p>
              {articleResults.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-search-active={active === index}
                  className={`palette-item ${active === index ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <span className="palette-icon">
                    <FileText size={16} strokeWidth={1.6} />
                  </span>
                  <span className="palette-item-body">
                    <span className="palette-item-title">{item.title}</span>
                    <span className="palette-item-excerpt">{item.excerpt}</span>
                    <span className="palette-item-meta">
                      {item.source} · {item.meta}
                    </span>
                  </span>
                  <CornerDownLeft size={14} className="palette-enter" />
                </button>
              ))}
            </section>
          )}

          {highlightResults.length > 0 && (
            <section className="palette-section">
              <p className="palette-label">{query ? '划线' : '最近的划线'}</p>
              {highlightResults.map((item, index) => {
                const flatIndex = articleResults.length + index
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-search-active={active === flatIndex}
                    className={`palette-item palette-item--highlight ${
                      active === flatIndex ? 'is-active' : ''
                    }`}
                    onMouseEnter={() => setActive(flatIndex)}
                    onClick={() => choose(item)}
                  >
                    <span className="palette-icon">
                      <Highlighter size={16} strokeWidth={1.6} />
                    </span>
                    <span className="palette-item-body">
                      <span className="palette-item-quote">“{item.text}”</span>
                      {item.note && <span className="palette-item-excerpt">{item.note}</span>}
                      <span className="palette-item-meta">
                        {item.title} · {item.meta}
                      </span>
                    </span>
                  </button>
                )
              })}
            </section>
          )}

          {!hasResults && (
            <div className="palette-empty">
              <p>没有找到「{query}」</p>
              <span>换一个词，或者去收集新的内容。</span>
            </div>
          )}
        </div>

        <footer className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>↵</kbd> 打开
          </span>
          <span className="palette-foot-note">只在本地搜索</span>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

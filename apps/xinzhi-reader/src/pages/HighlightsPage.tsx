import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Highlighter } from 'lucide-react'
import { Empty } from '@/components/ui'
import { useReviewItems } from '@/lib/selectors'
import { ageLabel } from '@/lib/text'
import type { HighlightColor } from '@/types'

type Filter = 'all' | 'notes' | 'plain'

const colors: { value: HighlightColor; label: string }[] = [
  { value: 'yellow', label: '藤黄' },
  { value: 'coral', label: '珊瑚' },
  { value: 'blue', label: '天青' },
  { value: 'green', label: '苔绿' },
]

export function HighlightsPage() {
  const items = useReviewItems()
  const [filter, setFilter] = useState<Filter>('all')
  const [color, setColor] = useState<HighlightColor | 'all'>('all')

  const filtered = items.filter((item) => {
    if (filter === 'notes' && !item.note) return false
    if (filter === 'plain' && item.note) return false
    if (color !== 'all' && item.color !== color) return false
    return true
  })

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">HIGHLIGHTS</p>
        <h1 className="display">批注</h1>
        <p className="page-sub">划过的句子，写下的想法，都替你留着。</p>
      </header>

      <div className="filter-row">
        <div className="segmented" role="group" aria-label="批注筛选">
          {[
            { value: 'all', label: '全部' },
            { value: 'notes', label: '有想法' },
            { value: 'plain', label: '纯划线' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? 'is-active' : ''}
              onClick={() => setFilter(option.value as Filter)}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="color-filter" role="group" aria-label="按颜色筛选">
          <button
            type="button"
            className={`color-filter-all ${color === 'all' ? 'is-active' : ''}`}
            onClick={() => setColor('all')}
          >
            全部颜色
          </button>
          {colors.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={`color-dot color-dot--${entry.value} ${
                color === entry.value ? 'is-active' : ''
              }`}
              aria-label={entry.label}
              title={entry.label}
              onClick={() => setColor(entry.value)}
            />
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="highlight-list">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/read/${item.articleId}`}
              state={{ highlightId: item.id }}
              className="highlight-card"
            >
              <span className={`highlight-rail highlight-rail--${item.color}`} aria-hidden="true" />
              <div className="highlight-main">
                <blockquote>“{item.text}”</blockquote>
                {item.note && (
                  <div className="highlight-note">
                    <span className="highlight-note-label">想法</span>
                    <p>{item.note}</p>
                  </div>
                )}
                <footer>
                  <span>{item.articleTitle}</span>
                  <span className="meta-dot" />
                  <span>{ageLabel(item.createdAt)}</span>
                </footer>
              </div>
              <Highlighter
                size={15}
                strokeWidth={1.6}
                className="highlight-card-icon"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          icon={<Highlighter size={22} strokeWidth={1.5} />}
          title="还没有符合条件的批注"
          hint="阅读时选中一段文字，就可以划线或写下想法。"
        />
      )}

      <Link to="/review" className="inline-link page-bottom-link">
        进入每日回顾 <ArrowRight size={14} />
      </Link>
    </div>
  )
}

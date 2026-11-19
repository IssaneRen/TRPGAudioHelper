import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { Empty } from '@/components/ui'
import { useReviewItems } from '@/lib/selectors'
import { ageLabel, todayLabel } from '@/lib/text'

export function ReviewPage() {
  const items = useReviewItems()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    if (index >= items.length) setIndex(0)
  }, [items.length, index])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % Math.max(1, items.length))
      if (event.key === 'ArrowLeft')
        setIndex((current) => (current - 1 + Math.max(1, items.length)) % Math.max(1, items.length))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length])

  if (!items.length) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="display">回顾</h1>
          <p className="page-sub">让旧的划线，重新长出来。</p>
        </header>
        <Empty
          icon={<Sparkles size={22} strokeWidth={1.5} />}
          title="还没有可以回顾的内容"
          hint="先去读一读，划下一两句话。"
        />
      </div>
    )
  }

  const item = items[Math.min(index, items.length - 1)]
  const next = () => setIndex((current) => (current + 1) % items.length)
  const prev = () => setIndex((current) => (current - 1 + items.length) % items.length)

  return (
    <div className="page review-page">
      <header className="page-head review-head">
        <div>
          <p className="eyebrow">
            <Sparkles size={12} strokeWidth={1.8} /> 每日回顾 · {todayLabel()}
          </p>
          <h1 className="display">回顾</h1>
          <p className="page-sub">让旧的划线，重新长出来。</p>
        </div>
        <Link to="/highlights" className="inline-link">
          全部批注 <ArrowRight size={14} />
        </Link>
      </header>

      <div
        className="review-deck"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return
          const delta = event.changedTouches[0].clientX - touchStart.current
          touchStart.current = null
          if (delta < -44) next()
          if (delta > 44) prev()
        }}
      >
        <span className="deck-sheet deck-sheet--back" aria-hidden="true" />
        <span className="deck-sheet deck-sheet--mid" aria-hidden="true" />
        <article className="review-card" key={item.id}>
          <span className="review-quote-mark" aria-hidden="true">
            “
          </span>
          <blockquote>{item.text}</blockquote>
          {item.note && (
            <div className="review-note">
              <span>我的想法</span>
              <p>{item.note}</p>
            </div>
          )}
          <footer className="review-card-foot">
            <span>
              {ageLabel(item.createdAt)} · 摘自《{item.articleTitle}》
            </span>
            <span className="review-source">{item.sourceName}</span>
          </footer>
        </article>
      </div>

      <div className="review-controls">
        <button type="button" className="round-button" onClick={prev} aria-label="上一张">
          <ArrowLeft size={16} strokeWidth={1.8} />
        </button>
        <div className="review-progress">
          <span>
            {index + 1} / {items.length}
          </span>
          <div className="review-dots">
            {items.slice(0, 12).map((entry, dotIndex) => (
              <button
                key={entry.id}
                type="button"
                className={dotIndex === index ? 'is-active' : ''}
                aria-label={`第 ${dotIndex + 1} 张`}
                aria-current={dotIndex === index}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </div>
        <button type="button" className="round-button" onClick={next} aria-label="下一张">
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="review-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate(`/read/${item.articleId}`, { state: { highlightId: item.id } })
          }
        >
          回到原文
          <ArrowUpRight size={16} />
        </button>
        <button type="button" className="text-button" onClick={next}>
          换一张
        </button>
      </div>

      <p className="review-hint">左右滑动，或使用键盘 ← → 翻动卡片</p>
    </div>
  )
}

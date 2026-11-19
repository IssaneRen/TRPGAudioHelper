import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Feather,
  Hash,
  Search,
  Settings,
} from 'lucide-react'
import { ArticleRow } from '@/components/ArticleRow'
import { Logo } from '@/components/Logo'
import { useToast } from '@/components/Toast'
import { Empty, IconButton } from '@/components/ui'
import type { ShellContext } from '@/components/shellContext'
import {
  useContinueReading,
  useInboxArticles,
  useReadingDays,
  useReviewItems,
  useStats,
  useTagStats,
} from '@/lib/selectors'
import { useStore } from '@/lib/store'
import { ageLabel, readingMinutes, todayLabel } from '@/lib/text'

export function FlowPage() {
  const { openSearch, openSettings } = useOutletContext<ShellContext>()
  const toast = useToast()
  const archiveArticle = useStore((state) => state.archiveArticle)
  const inbox = useInboxArticles()
  const stats = useStats()
  const tags = useTagStats()
  const continueArticle = useContinueReading()
  const reviewItems = useReviewItems()
  const readingDays = useReadingDays(14)
  const [activeTag, setActiveTag] = useState<string>('all')

  const filtered =
    activeTag === 'all' ? inbox : inbox.filter((article) => article.tags.includes(activeTag))
  const topTags = tags.slice(0, 6)
  const activeDays = readingDays.filter((day) => day.active > 0).length
  const quote = reviewItems[0]

  return (
    <div className="page flow-page">
      <header className="page-head flow-head">
        <div className="flow-dateline">
          <div className="flow-mobile-brand"><Logo /></div>
          <time>{todayLabel()}</time>
        </div>
        <div className="flow-title-line">
          <h1 className="display">阅读流</h1>
          <div className="head-actions">
            <Link to="/tags" className="icon-button" aria-label="标签" title="标签">
              <Hash size={18} strokeWidth={1.7} />
            </Link>
            <IconButton label="搜索（⌘K）" onClick={openSearch}>
              <Search size={18} strokeWidth={1.7} />
            </IconButton>
            <IconButton label="设置" onClick={openSettings} className="mobile-only">
              <Settings size={18} strokeWidth={1.7} />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="flow-layout">
        <div className="flow-main">
          <nav className="flow-index" aria-label="阅读概览">
            <a href="#inbox">暂存箱 <span>{stats.inbox}</span></a>
            <Link to="/archive">已归档 <span>{stats.archived}</span></Link>
            <Link to="/highlights">批注 <span>{stats.highlights}</span></Link>
            <Link to="/feeds">订阅 <span>{stats.feeds}</span></Link>
          </nav>

          {continueArticle && (
            <Link to={`/read/${continueArticle.id}`} className="continue-card">
              <div className="continue-copy">
                <p className="eyebrow">继续阅读</p>
                <h2>{continueArticle.title}</h2>
                <p className="continue-meta">
                  {continueArticle.source.name} · 已读 {Math.round(continueArticle.progress * 100)}%
                  {' · '}
                  还剩{' '}
                  {Math.max(
                    1,
                    Math.ceil(readingMinutes(continueArticle) * (1 - continueArticle.progress)),
                  )}{' '}
                  分钟
                </p>
                <div className="continue-progress" aria-hidden="true">
                  <span style={{ width: `${Math.round(continueArticle.progress * 100)}%` }} />
                </div>
              </div>
              <span className="continue-arrow">
                <ArrowRight size={18} strokeWidth={1.7} />
              </span>
            </Link>
          )}

          <section className="inbox-section" id="inbox">
            <div className="section-head">
              <h2>待阅读</h2>
              <p>{filtered.length} 篇</p>
            </div>

            <div className="tag-filter" role="tablist" aria-label="按标签筛选">
              <button
                type="button"
                role="tab"
                aria-selected={activeTag === 'all'}
                className={activeTag === 'all' ? 'is-active' : ''}
                onClick={() => setActiveTag('all')}
              >
                全部
              </button>
              {topTags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  role="tab"
                  aria-selected={activeTag === tag.name}
                  className={activeTag === tag.name ? 'is-active' : ''}
                  onClick={() => setActiveTag(tag.name)}
                >
                  #{tag.name}
                </button>
              ))}
              <Link to="/tags" className="tag-filter-more">
                全部标签 <ArrowUpRight size={11} strokeWidth={1.8} />
              </Link>
            </div>

            {filtered.length > 0 ? (
              <div className="article-list">
                {filtered.map((article) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    onArchive={() => {
                      archiveArticle(article.id)
                      toast('已归档，可在「已归档」里找回')
                    }}
                  />
                ))}
              </div>
            ) : (
              <Empty
                icon={<Feather size={22} strokeWidth={1.4} />}
                title="没有待阅读的文章"
                hint="试试其他标签，或收集一篇文章。"
              />
            )}
          </section>
        </div>

        <aside className="flow-aside">
          {quote && (
            <Link to="/review" className="quote-card">
              <div className="quote-card-head">
                <span>今日回顾</span>
              </div>
              <blockquote>“{quote.text}”</blockquote>
              <p className="quote-card-meta">
                {ageLabel(quote.createdAt)} · 摘自《{quote.articleTitle}》
              </p>
              <span className="quote-card-cta">
                查看回顾 <ArrowRight size={13} strokeWidth={1.7} />
              </span>
            </Link>
          )}

          <div className="rhythm-card">
            <div className="rhythm-head">
              <span>最近十四天</span>
              <em>{activeDays} 天有阅读</em>
            </div>
            <div className="rhythm-bars" aria-hidden="true">
              {readingDays.map((day) => (
                <span
                  key={day.date}
                  className={`rhythm-bar ${day.active > 0 ? 'is-active' : ''}`}
                  style={{ height: day.active > 0 ? 12 + Math.min(day.active, 3) * 7 : 5 }}
                  title={`${new Date(day.date).getMonth() + 1} 月 ${new Date(day.date).getDate()} 日`}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

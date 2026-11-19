import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  Feather,
  Hash,
  Highlighter,
  Inbox,
  Rss,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { ArticleRow } from '@/components/ArticleRow'
import { LeafMark } from '@/components/Logo'
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
        <p className="eyebrow">
          <span className="live-dot" />
          {todayLabel()}
        </p>
        <div className="flow-title-line">
          <span className="flow-glyph" aria-hidden="true">
            <LeafMark size={23} />
          </span>
          <div className="flow-title-copy">
            <h1 className="display">阅读流</h1>
            <p className="flow-sub">把值得读的，慢慢读完。</p>
          </div>
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
          <section className="stat-grid" aria-label="概览">
            <a href="#inbox" className="stat-card" data-tone="sage">
              <div className="stat-top">
                <span className="stat-icon">
                  <Inbox size={17} strokeWidth={1.7} />
                </span>
                <strong>{stats.inbox}</strong>
              </div>
              <span className="stat-label">暂存箱</span>
            </a>
            <Link to="/archive" className="stat-card" data-tone="sand">
              <div className="stat-top">
                <span className="stat-icon">
                  <Archive size={17} strokeWidth={1.7} />
                </span>
                <strong>{stats.archived}</strong>
              </div>
              <span className="stat-label">已归档</span>
            </Link>
            <Link to="/highlights" className="stat-card" data-tone="clay">
              <div className="stat-top">
                <span className="stat-icon">
                  <Highlighter size={17} strokeWidth={1.7} />
                </span>
                <strong>{stats.highlights}</strong>
              </div>
              <span className="stat-label">批注</span>
            </Link>
            <Link to="/feeds" className="stat-card" data-tone="mist">
              <div className="stat-top">
                <span className="stat-icon">
                  <Rss size={17} strokeWidth={1.7} />
                </span>
                <strong>{stats.feeds}</strong>
              </div>
              <span className="stat-label">订阅</span>
            </Link>
          </section>

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
              <span className="continue-rings" aria-hidden="true" />
            </Link>
          )}

          <section className="inbox-section" id="inbox">
            <div className="section-head">
              <h2>
                随手翻阅 <span className="section-count">{filtered.length}</span>
              </h2>
              <p>{inbox.length} 篇待读</p>
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
                title="这一栏还空着"
                hint="换一个标签，或者去收集一点新的东西。"
              />
            )}
          </section>
        </div>

        <aside className="flow-aside">
          {quote && (
            <Link to="/review" className="quote-card">
              <div className="quote-card-head">
                <Sparkles size={14} strokeWidth={1.7} />
                <span>今日回顾</span>
              </div>
              <blockquote>“{quote.text}”</blockquote>
              <p className="quote-card-meta">
                {ageLabel(quote.createdAt)} · 摘自《{quote.articleTitle}》
              </p>
              <span className="quote-card-cta">
                翻一翻 <ArrowRight size={13} strokeWidth={1.7} />
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
            <p className="rhythm-note">
              {activeDays > 0
                ? '不必每天读很多，保持回来的习惯就好。'
                : '今天还没有翻开一页。要不要从继续阅读开始？'}
            </p>
          </div>

          <div className="aside-note">
            <LeafMark size={18} />
            <p>无广告，无推荐流。所有收藏与批注只保存在这台设备。</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

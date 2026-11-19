import { ArrowLeft, ArrowUpRight, Rss } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ArticleRow } from '@/components/ArticleRow'
import { Empty } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useFeedStats } from '@/lib/selectors'
import { useStore } from '@/lib/store'
import { relativeTime } from '@/lib/text'

export function FeedsPage() {
  const feeds = useFeedStats()

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">订阅</h1>
        <p className="page-sub">把喜欢的作者，放进自己的阅读流。</p>
      </header>

      <div className="feed-grid">
        {feeds.map((feed) => (
          <Link key={feed.id} to={`/feeds/${feed.id}`} className="feed-card">
            <span className={`feed-avatar feed-avatar--${feed.accent}`} aria-hidden="true">
              {feed.name.slice(0, 1)}
            </span>
            <div className="feed-copy">
              <div className="feed-title-line">
                <h2>{feed.name}</h2>
                {feed.unread > 0 && <span className="feed-unread">{feed.unread} 未读</span>}
              </div>
              <p>{feed.description}</p>
              <span className="feed-meta">
                {feed.author && `${feed.author} · `}
                {feed.latest ? `更新于 ${relativeTime(feed.latest)}` : '还没有文章'}
              </span>
            </div>
            <ArrowUpRight size={17} className="feed-arrow" strokeWidth={1.6} />
          </Link>
        ))}
      </div>

      {feeds.length === 0 && (
        <Empty
          icon={<Rss size={22} strokeWidth={1.5} />}
          title="还没有订阅"
          hint="示例数据可以随时在设置里恢复。"
        />
      )}

      <p className="page-foot-note">订阅内容为本地示例，不连接任何外部服务。</p>
    </div>
  )
}

export function FeedDetailPage() {
  const { feedId } = useParams()
  const feeds = useFeedStats()
  const toast = useToast()
  const articles = useStore((state) => state.articles)
  const archiveArticle = useStore((state) => state.archiveArticle)
  const feed = feeds.find((entry) => entry.id === feedId)
  const feedArticles = articles
    .filter((article) => article.feedId === feedId)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())

  if (!feed) {
    return (
      <div className="page">
        <Link to="/feeds" className="back-link">
          <ArrowLeft size={16} /> 全部订阅
        </Link>
        <Empty icon={<Rss size={22} />} title="没有找到这个订阅" />
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/feeds" className="back-link">
        <ArrowLeft size={16} strokeWidth={1.7} />
        全部订阅
      </Link>

      <header className="feed-detail-head">
        <span className={`feed-avatar feed-avatar--${feed.accent}`} aria-hidden="true">
          {feed.name.slice(0, 1)}
        </span>
        <div>
          <h1 className="display">{feed.name}</h1>
          <p className="feed-detail-desc">{feed.description}</p>
          <p className="feed-meta">
            {feed.author && `${feed.author} · `}
            {feed.total} 篇收藏
            {feed.unread > 0 && ` · ${feed.unread} 篇未读`}
          </p>
        </div>
      </header>

      {feedArticles.length > 0 ? (
        <div className="article-list feed-article-list">
          {feedArticles.map((article) => (
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
          icon={<Rss size={22} strokeWidth={1.5} />}
          title="这个订阅还没有收藏文章"
          hint="等下一次更新，或者先去读点别的。"
        />
      )}
    </div>
  )
}

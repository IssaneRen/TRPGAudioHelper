import { ArrowLeft, Hash, Tag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ArticleRow } from '@/components/ArticleRow'
import { Empty } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useTagStats } from '@/lib/selectors'
import { useStore } from '@/lib/store'

export function TagsPage() {
  const tags = useTagStats()

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">ORGANIZE</p>
        <h1 className="display">标签</h1>
        <p className="page-sub">让信息自然有序，而不是被文件夹切碎。</p>
      </header>

      <div className="tag-grid">
        {tags.map((tag) => (
          <Link key={tag.name} to={`/tags/${encodeURIComponent(tag.name)}`} className="tag-card">
            <div className="tag-card-top">
              <span className="tag-card-hash">
                <Hash size={17} strokeWidth={1.8} />
              </span>
              <span className="tag-card-count">{tag.count}</span>
            </div>
            <h2>{tag.name}</h2>
            <p>
              {tag.unread > 0 ? `${tag.unread} 篇待读` : '都已读过'}
              <span className="tag-card-dot" />
              共 {tag.count} 篇
            </p>
          </Link>
        ))}
      </div>

      {tags.length === 0 && (
        <Empty
          icon={<Tag size={22} strokeWidth={1.5} />}
          title="还没有标签"
          hint="收集内容时加上标签，它们会在这里长出来。"
        />
      )}
    </div>
  )
}

export function TagDetailPage() {
  const { tagName } = useParams()
  const tag = decodeURIComponent(tagName || '')
  const toast = useToast()
  const articles = useStore((state) => state.articles)
  const archiveArticle = useStore((state) => state.archiveArticle)
  const tagged = articles
    .filter((article) => article.tags.includes(tag))
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())

  return (
    <div className="page">
      <Link to="/tags" className="back-link">
        <ArrowLeft size={16} strokeWidth={1.7} />
        全部标签
      </Link>

      <header className="tag-detail-head">
        <span className="tag-detail-hash">#</span>
        <div>
          <h1 className="display">{tag}</h1>
          <p className="page-sub">
            {tagged.length} 篇收藏 ·{' '}
            {tagged.filter((article) => article.progress === 0).length} 篇待读
          </p>
        </div>
      </header>

      {tagged.length > 0 ? (
        <div className="article-list">
          {tagged.map((article) => (
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
          icon={<Hash size={22} strokeWidth={1.5} />}
          title={`还没有「${tag}」的内容`}
          hint="去阅读流里看看吧。"
        />
      )}
    </div>
  )
}

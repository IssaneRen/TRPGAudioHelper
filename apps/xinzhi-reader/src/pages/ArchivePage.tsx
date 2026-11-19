import { Archive, RotateCcw } from 'lucide-react'
import { ArticleRow } from '@/components/ArticleRow'
import { Empty } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useArchivedArticles } from '@/lib/selectors'
import { useStore } from '@/lib/store'

export function ArchivePage() {
  const archived = useArchivedArticles()
  const restoreArticle = useStore((state) => state.restoreArticle)
  const toast = useToast()

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">已归档</h1>
        <p className="page-sub">归档不是删除，是给读过的内容一个安静的位置。</p>
      </header>

      {archived.length > 0 ? (
        <div className="article-list">
          {archived.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onArchive={() => {
                restoreArticle(article.id)
                toast('已放回阅读流')
              }}
              archiveLabel="放回阅读流"
              actionIcon={<RotateCcw size={15} strokeWidth={1.7} />}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Archive size={22} strokeWidth={1.5} />}
          title="这里还很安静"
          hint="读完并归档的文章会出现在这里。"
        />
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { Article, Feed, Highlight } from '@/types'

export function useArticle(id: string | undefined): Article | undefined {
  const articles = useStore((state) => state.articles)
  return useMemo(() => articles.find((article) => article.id === id), [articles, id])
}

export function useHighlightsForArticle(id: string | undefined): Highlight[] {
  const highlights = useStore((state) => state.highlights)
  return useMemo(
    () =>
      highlights
        .filter((highlight) => highlight.articleId === id)
        .sort((a, b) => a.start - b.start),
    [highlights, id],
  )
}

export function useInboxArticles(): Article[] {
  const articles = useStore((state) => state.articles)
  return useMemo(
    () =>
      articles
        .filter((article) => article.status === 'inbox')
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [articles],
  )
}

export function useArchivedArticles(): Article[] {
  const articles = useStore((state) => state.articles)
  return useMemo(
    () =>
      articles
        .filter((article) => article.status === 'archived')
        .sort(
          (a, b) =>
            new Date(b.readAt || b.savedAt).getTime() - new Date(a.readAt || a.savedAt).getTime(),
        ),
    [articles],
  )
}

export function useContinueReading(): Article | undefined {
  const inbox = useInboxArticles()
  return useMemo(
    () =>
      [...inbox]
        .filter((article) => article.progress >= 0.02 && article.progress < 0.985)
        .sort(
          (a, b) =>
            new Date(b.lastReadAt || b.savedAt).getTime() -
            new Date(a.lastReadAt || a.savedAt).getTime(),
        )[0],
    [inbox],
  )
}

export interface TagStat {
  name: string
  count: number
  unread: number
  latest: string
}

export function useTagStats(): TagStat[] {
  const articles = useStore((state) => state.articles)
  return useMemo(() => {
    const map = new Map<string, TagStat>()
    for (const article of articles) {
      for (const tag of article.tags) {
        const existing = map.get(tag)
        if (existing) {
          existing.count += 1
          if (article.progress === 0) existing.unread += 1
          if (new Date(article.savedAt).getTime() > new Date(existing.latest).getTime()) {
            existing.latest = article.savedAt
          }
        } else {
          map.set(tag, {
            name: tag,
            count: 1,
            unread: article.progress === 0 ? 1 : 0,
            latest: article.savedAt,
          })
        }
      }
    }
    return [...map.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'),
    )
  }, [articles])
}

export interface FeedStat extends Feed {
  total: number
  unread: number
  latest?: string
}

export function useFeedStats(): FeedStat[] {
  const feeds = useStore((state) => state.feeds)
  const articles = useStore((state) => state.articles)
  return useMemo(
    () =>
      feeds.map((feed) => {
        const items = articles.filter((article) => article.feedId === feed.id)
        return {
          ...feed,
          total: items.length,
          unread: items.filter((article) => article.progress === 0).length,
          latest: items.sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
          )[0]?.savedAt,
        }
      }),
    [feeds, articles],
  )
}

export function useStats() {
  const articles = useStore((state) => state.articles)
  const highlights = useStore((state) => state.highlights)
  const feeds = useStore((state) => state.feeds)
  return useMemo(
    () => ({
      inbox: articles.filter((article) => article.status === 'inbox').length,
      archived: articles.filter((article) => article.status === 'archived').length,
      highlights: highlights.length,
      notes: highlights.filter((highlight) => highlight.note).length,
      feeds: feeds.length,
      unread: articles.filter((article) => article.progress === 0 && article.status === 'inbox')
        .length,
    }),
    [articles, highlights, feeds],
  )
}

export interface ReviewItem extends Highlight {
  articleTitle: string
  sourceName: string
}

export function useReviewItems(): ReviewItem[] {
  const highlights = useStore((state) => state.highlights)
  const articles = useStore((state) => state.articles)
  return useMemo(
    () =>
      highlights
        .map((highlight) => {
          const article = articles.find((entry) => entry.id === highlight.articleId)
          return {
            ...highlight,
            articleTitle: article?.title || '已删除的文章',
            sourceName: article?.source.name || '',
          }
        })
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [highlights, articles],
  )
}

export function useReadingDays(days = 14): { date: string; active: number }[] {
  const articles = useStore((state) => state.articles)
  return useMemo(() => {
    const result: { date: string; active: number }[] = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      const active = articles.filter((article) => {
        if (!article.lastReadAt) return false
        const time = new Date(article.lastReadAt).getTime()
        return time >= date.getTime() && time < next.getTime()
      }).length
      result.push({ date: date.toISOString(), active })
    }
    return result
  }, [articles, days])
}

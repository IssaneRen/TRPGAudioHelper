import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createSeedData } from '@/data/seed'
import { hostOf, parseBlocks, uid } from '@/lib/text'
import type {
  AppData,
  Article,
  Block,
  Highlight,
  HighlightColor,
  ReaderSettings,
  SlimArticle,
  SourceKind,
  Settings,
} from '@/types'

export interface NewArticleInput {
  title: string
  text: string
  blocks?: Block[]
  author?: string
  sourceName?: string
  kind?: SourceKind
  tags?: string[]
  href?: string
}

interface StoreState extends AppData {
  addArticle: (input: NewArticleInput) => Article
  addLink: (input: { url: string; title?: string; note?: string; tags?: string[] }) => Article
  mergeImportArticles: (list: SlimArticle[]) => number
  archiveArticle: (id: string) => void
  restoreArticle: (id: string) => void
  removeArticle: (id: string) => void
  renameArticle: (id: string, title: string) => void
  setProgress: (id: string, progress: number) => void
  addHighlight: (input: {
    articleId: string
    blockId: string
    start: number
    end: number
    text: string
    color?: HighlightColor
  }) => Highlight | null
  setHighlightColor: (id: string, color: HighlightColor) => void
  setHighlightNote: (id: string, note: string) => void
  removeHighlight: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateReaderSettings: (patch: Partial<ReaderSettings>) => void
  importData: (data: AppData) => void
  resetData: () => void
}

function upsertByDate<T extends { id: string }>(list: T[], item: T): T[] {
  return [item, ...list.filter((entry) => entry.id !== item.id)]
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createSeedData(),

      addArticle: (input) => {
        const now = new Date().toISOString()
        const title = input.title.trim() || '未命名的一页'
        const blocks =
          input.blocks && input.blocks.length
            ? input.blocks.map((block) => ({ ...block }))
            : parseBlocks(input.text, uid('p'))
        const article: Article = {
          id: uid('a'),
          title,
          author: input.author?.trim() || undefined,
          source: {
            name: input.sourceName?.trim() || '我的收藏',
            kind: input.kind || 'web',
            url: input.href,
          },
          publishedAt: now,
          savedAt: now,
          blocks,
          tags: (input.tags || []).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean),
          status: 'inbox',
          progress: 0,
        }
        set((state) => ({ articles: [article, ...state.articles] }))
        return article
      },

      mergeImportArticles: (list) => {
        const existingIds = new Set(get().articles.map((article) => article.id))
        const now = new Date().toISOString()
        const articles: Article[] = []
        for (const item of list) {
          if (!item || typeof item.title !== 'string' || !item.title.trim()) continue
          const blocks =
            item.blocks && item.blocks.length
              ? item.blocks.map((block) => ({ ...block, id: block.id || uid('b') }))
              : item.text && item.text.trim()
                ? parseBlocks(item.text, uid('p'))
                : []
          if (!blocks.length) continue
          const id = item.id && !existingIds.has(item.id) ? item.id : uid('a')
          existingIds.add(id)
          const savedAt = item.savedAt || now
          articles.push({
            id,
            title: item.title.trim(),
            author: item.author?.trim() || undefined,
            source: {
              name: item.source?.trim() || (item.url ? hostOf(item.url) : '合并导入'),
              kind: item.kind || (item.url ? 'web' : 'note'),
              url: item.url,
            },
            publishedAt: savedAt,
            savedAt,
            blocks,
            tags: (item.tags || [])
              .map((tag) => String(tag).replace(/^#/, '').trim())
              .filter(Boolean),
            status: 'inbox',
            progress: 0,
          })
        }
        if (articles.length) {
          set((state) => ({ articles: [...articles, ...state.articles] }))
        }
        return articles.length
      },

      addLink: (input) => {
        const now = new Date().toISOString()
        const cleanUrl = input.url.trim()
        const title = input.title?.trim() || hostOf(cleanUrl)
        const blocks = [
          ...(input.note?.trim()
            ? [{ id: uid('b'), type: 'p' as const, text: input.note.trim() }]
            : []),
          {
            id: uid('b'),
            type: 'link' as const,
            text: title,
            href: cleanUrl,
            caption: '打开原文',
          },
        ]
        const article: Article = {
          id: uid('a'),
          title,
          source: { name: hostOf(cleanUrl), kind: 'web', url: cleanUrl },
          publishedAt: now,
          savedAt: now,
          blocks,
          tags: (input.tags || []).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean),
          status: 'inbox',
          progress: 0,
        }
        set((state) => ({ articles: [article, ...state.articles] }))
        return article
      },

      archiveArticle: (id) =>
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id
              ? { ...article, status: 'archived', readAt: article.readAt || new Date().toISOString() }
              : article,
          ),
        })),

      restoreArticle: (id) =>
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id ? { ...article, status: 'inbox' } : article,
          ),
        })),

      removeArticle: (id) =>
        set((state) => ({
          articles: state.articles.filter((article) => article.id !== id),
          highlights: state.highlights.filter((highlight) => highlight.articleId !== id),
        })),

      renameArticle: (id, title) =>
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id ? { ...article, title: title.trim() || article.title } : article,
          ),
        })),

      setProgress: (id, progress) => {
        const clamped = Math.max(0, Math.min(1, progress))
        const now = new Date().toISOString()
        set((state) => ({
          articles: state.articles.map((article) => {
            if (article.id !== id) return article
            const finished = clamped >= 0.985
            return {
              ...article,
              progress: finished ? 1 : clamped,
              lastReadAt: now,
              readAt: finished ? article.readAt || now : article.readAt,
            }
          }),
        }))
      },

      addHighlight: ({ articleId, blockId, start, end, text, color = 'yellow' }) => {
        const state = get()
        const overlaps = state.highlights.some(
          (highlight) =>
            highlight.articleId === articleId &&
            highlight.blockId === blockId &&
            start < highlight.end &&
            end > highlight.start,
        )
        if (overlaps) return null
        const highlight: Highlight = {
          id: uid('hl'),
          articleId,
          blockId,
          start,
          end,
          text,
          color,
          createdAt: new Date().toISOString(),
        }
        set((prev) => ({ highlights: [highlight, ...prev.highlights] }))
        return highlight
      },

      setHighlightColor: (id, color) =>
        set((state) => ({
          highlights: state.highlights.map((highlight) =>
            highlight.id === id
              ? { ...highlight, color, updatedAt: new Date().toISOString() }
              : highlight,
          ),
        })),

      setHighlightNote: (id, note) =>
        set((state) => ({
          highlights: state.highlights.map((highlight) =>
            highlight.id === id
              ? {
                  ...highlight,
                  note: note.trim() || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : highlight,
          ),
        })),

      removeHighlight: (id) =>
        set((state) => ({ highlights: state.highlights.filter((highlight) => highlight.id !== id) })),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      updateReaderSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, reader: { ...state.settings.reader, ...patch } },
        })),

      importData: (data) =>
        set(() => ({
          articles: data.articles,
          highlights: data.highlights,
          feeds: data.feeds,
          settings: data.settings,
        })),

      resetData: () => set(() => ({ ...createSeedData() })),
    }),
    {
      name: 'xinzhi.web.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        articles: state.articles,
        highlights: state.highlights,
        feeds: state.feeds,
        settings: state.settings,
      }),
    },
  ),
)

export function exportData(): AppData {
  const { articles, highlights, feeds, settings } = useStore.getState()
  return { articles, highlights, feeds, settings }
}

export function downloadExport() {
  const payload = JSON.stringify(exportData(), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `白羽备份-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export { upsertByDate }

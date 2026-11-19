import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { ArchivePage } from '@/pages/ArchivePage'
import { AppShell } from '@/components/AppShell'
import { FeedsPage, FeedDetailPage } from '@/pages/FeedsPage'
import { FlowPage } from '@/pages/FlowPage'
import { HighlightsPage } from '@/pages/HighlightsPage'
import { ReaderPage } from '@/pages/ReaderPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { TagsPage, TagDetailPage } from '@/pages/TagsPage'
import { useStore } from '@/lib/store'

function NotFound() {
  return (
    <div className="page not-found">
      <h1 className="display">这一页不见了</h1>
      <p>也许它被移到了别处，或者从来没有存在过。</p>
      <Link to="/" className="primary-button">
        回到阅读流
      </Link>
    </div>
  )
}

export function App() {
  const appearance = useStore((state) => state.settings.appearance)

  useEffect(() => {
    document.documentElement.dataset.theme = appearance
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute(
        'content',
        appearance === 'night' ? '#141413' : appearance === 'white' ? '#ffffff' : '#f5f3ed',
      )
    }
  }, [appearance])

  return (
    <Routes>
      <Route path="/read/:articleId" element={<ReaderPage />} />
      <Route element={<AppShell />}>
        <Route index element={<FlowPage />} />
        <Route path="feeds" element={<FeedsPage />} />
        <Route path="feeds/:feedId" element={<FeedDetailPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/:tagName" element={<TagDetailPage />} />
        <Route path="highlights" element={<HighlightsPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

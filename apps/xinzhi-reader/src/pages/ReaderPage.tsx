import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Headphones,
  ListTree,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Type,
  Volume2,
} from 'lucide-react'
import { ArticleBody } from '@/components/reader/ArticleBody'
import { NoteSheet } from '@/components/reader/NoteSheet'
import { ReaderSettingsPanel, TocPanel } from '@/components/reader/ReaderPanels'
import { SelectionToolbar } from '@/components/reader/SelectionToolbar'
import type { SelectionState } from '@/components/reader/SelectionToolbar'
import { SpeechBar } from '@/components/reader/SpeechBar'
import type { SpeechState } from '@/components/reader/SpeechBar'
import { SourceIcon } from '@/components/SourceIcon'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { IconButton } from '@/components/ui'
import { copyText } from '@/lib/clipboard'
import { useArticle, useHighlightsForArticle } from '@/lib/selectors'
import { useStore } from '@/lib/store'
import { shareQuoteCard } from '@/lib/shareCard'
import { ageLabel, countChars, fullDate, readingMinutes } from '@/lib/text'
import type { HighlightColor } from '@/types'

function closestBlock(node: Node | null): HTMLElement | null {
  if (!node) return null
  const element =
    node.nodeType === Node.TEXT_NODE ? (node.parentElement as HTMLElement | null) : (node as HTMLElement)
  return element?.closest<HTMLElement>('[data-block-id]') || null
}

function offsetWithinBlock(block: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(block)
  try {
    range.setEnd(node, offset)
  } catch {
    return 0
  }
  return range.toString().length
}

export function ReaderPage() {
  const { articleId } = useParams()
  const article = useArticle(articleId)
  const highlights = useHighlightsForArticle(articleId)
  const settings = useStore((state) => state.settings)
  const setProgress = useStore((state) => state.setProgress)
  const addHighlight = useStore((state) => state.addHighlight)
  const setHighlightColor = useStore((state) => state.setHighlightColor)
  const removeHighlight = useStore((state) => state.removeHighlight)
  const archiveArticle = useStore((state) => state.archiveArticle)
  const restoreArticle = useStore((state) => state.restoreArticle)
  const removeArticle = useStore((state) => state.removeArticle)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const progressBarRef = useRef<HTMLSpanElement>(null)
  const lastScrollY = useRef(0)
  const lastSaveAt = useRef(0)
  const speechCancelled = useRef(false)
  const rateRef = useRef(1)
  const mountedRef = useRef(true)

  const [chrome, setChrome] = useState(true)
  const [pct, setPct] = useState(0)
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [speech, setSpeech] = useState<SpeechState>({
    active: false,
    paused: false,
    blockId: null,
    rate: 1,
  })

  const minutes = article ? readingMinutes(article) : 1
  const chars = article ? countChars(article) : 0
  const remaining = Math.max(0, Math.ceil(minutes * (1 - pct / 100)))
  const readerStyle = {
    '--reader-font': settings.reader.font === 'serif' ? 'var(--serif)' : 'var(--sans)',
    '--reader-size': `${settings.reader.fontSize}px`,
    '--reader-leading': String(settings.reader.lineHeight),
    '--reader-measure':
      settings.reader.measure === 'narrow'
        ? '30rem'
        : settings.reader.measure === 'wide'
          ? '41rem'
          : '35rem',
  } as CSSProperties

  const speakable = useMemo(
    () =>
      (article?.blocks || [])
        .filter((block) => ['p', 'quote', 'h2'].includes(block.type) && block.text)
        .map((block) => ({ id: block.id, text: block.text as string })),
    [article],
  )

  const goBack = useCallback(() => {
    if (location.key && location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [location.key, navigate])

  useEffect(() => {
    mountedRef.current = true
    document.body.classList.add('reader-open')
    window.scrollTo(0, 0)
    return () => {
      mountedRef.current = false
      document.body.classList.remove('reader-open')
    }
  }, [])

  useEffect(() => {
    if (!article) return
    document.title = `${article.title} · 阅读·书`
    return () => {
      document.title = '阅读·书'
    }
  }, [article])

  // restore position or jump to a shared highlight
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || !article) return
    setChrome(true)
    setSelection(null)
    setFlashId(null)
    const targetId = (location.state as { highlightId?: string } | null)?.highlightId
    const timer = window.setTimeout(() => {
      const current = scrollRef.current
      if (!current) return
      if (targetId) {
        const mark = current.querySelector<HTMLElement>(
          `mark[data-highlight-id="${targetId}"]`,
        )
        if (mark) {
          mark.scrollIntoView({ block: 'center' })
          lastScrollY.current = current.scrollTop
          setFlashId(targetId)
          window.setTimeout(() => setFlashId(null), 2600)
          return
        }
      }
      if (article.progress > 0.01 && article.progress < 0.985) {
        current.scrollTop = article.progress * (current.scrollHeight - current.clientHeight)
        lastScrollY.current = current.scrollTop
      }
    }, 90)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id])

  useEffect(() => {
    const id = article?.id
    return () => {
      speechCancelled.current = true
      window.speechSynthesis?.cancel()
      if (!id) return
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      const max = scrollEl.scrollHeight - scrollEl.clientHeight
      if (max > 0) {
        useStore.getState().setProgress(id, scrollEl.scrollTop / max)
      }
    }
  }, [article?.id])

  const stopSpeech = useCallback(() => {
    speechCancelled.current = true
    window.speechSynthesis?.cancel()
    setSpeech({ active: false, paused: false, blockId: null, rate: rateRef.current })
  }, [])

  const startSpeech = useCallback(
    (fromId?: string | null) => {
      if (!('speechSynthesis' in window)) {
        toast('当前浏览器不支持朗读')
        return
      }
      if (!speakable.length) {
        toast('这篇文章还没有可朗读的内容')
        return
      }
      speechCancelled.current = true
      window.speechSynthesis.cancel()
      window.setTimeout(() => {
        if (!mountedRef.current) return
        speechCancelled.current = false
        let startIndex = 0
        if (fromId) {
          const found = speakable.findIndex((item) => item.id === fromId)
          if (found >= 0) startIndex = found
        }
        setSpeech({
          active: true,
          paused: false,
          blockId: speakable[startIndex]?.id || null,
          rate: rateRef.current,
        })
        if (startIndex === 0) {
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }

        const speakAt = (index: number) => {
          if (speechCancelled.current) return
          if (index >= speakable.length) {
            speechCancelled.current = true
            setSpeech((current) => ({ ...current, active: false, paused: false, blockId: null }))
            toast('朗读结束')
            return
          }
          const item = speakable[index]
          setSpeech((current) => ({ ...current, blockId: item.id, paused: false }))
          const utterance = new SpeechSynthesisUtterance(item.text)
          utterance.lang = 'zh-CN'
          utterance.rate = rateRef.current
          const voices = window.speechSynthesis.getVoices()
          const voice =
            voices.find(
              (entry) => entry.lang.toLowerCase().startsWith('zh') && entry.localService,
            ) || voices.find((entry) => entry.lang.toLowerCase().startsWith('zh'))
          if (voice) utterance.voice = voice
          utterance.onend = () => {
            if (!speechCancelled.current) speakAt(index + 1)
          }
          utterance.onerror = (event) => {
            if (speechCancelled.current) return
            if (event.error === 'interrupted' || event.error === 'canceled') return
            speechCancelled.current = true
            setSpeech((current) => ({ ...current, active: false, paused: false, blockId: null }))
            toast('朗读中断了，可以再试一次')
          }
          window.speechSynthesis.speak(utterance)
          const blockEl = articleRef.current?.querySelector(
            `[data-reading-block="${item.id}"]`,
          )
          blockEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        speakAt(startIndex)
      }, 60)
    },
    [speakable, toast],
  )

  const toggleSpeech = useCallback(() => {
    if (!speech.active) {
      startSpeech(speech.blockId)
      return
    }
    const synth = window.speechSynthesis
    if (speech.paused) {
      synth?.resume()
      setSpeech((current) => ({ ...current, paused: false }))
    } else {
      synth?.pause()
      setSpeech((current) => ({ ...current, paused: true }))
    }
  }, [speech.active, speech.blockId, speech.paused, startSpeech])

  const cycleRate = useCallback(() => {
    const rates = [0.9, 1.1, 1.3]
    const next = rates[(rates.indexOf(rateRef.current) + 1) % rates.length] ?? 1.1
    rateRef.current = next
    setSpeech((current) => ({ ...current, rate: next }))
    if (speech.active && speech.blockId) {
      startSpeech(speech.blockId)
    }
    toast(`语速 ${next.toFixed(1)}×`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.active, speech.blockId, startSpeech, toast])

  const clearNativeSelection = () => {
    window.getSelection()?.removeAllRanges()
  }

  const pickSelection = useCallback(() => {
    if (!article) return
    if (noteId || settingsOpen || tocOpen || menuOpen) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const startBlock = closestBlock(range.startContainer)
    const endBlock = closestBlock(range.endContainer)
    if (!startBlock || startBlock !== endBlock) {
      if (sel.toString().trim()) toast('一次高亮一段文字，会更舒服')
      return
    }
    const blockId = startBlock.dataset.blockId
    if (!blockId) return
    const block = article.blocks.find((entry) => entry.id === blockId)
    if (!block?.text) return
    let start = offsetWithinBlock(startBlock, range.startContainer, range.startOffset)
    let end = offsetWithinBlock(startBlock, range.endContainer, range.endOffset)
    if (start > end) [start, end] = [end, start]
    const raw = block.text.slice(start, end)
    const trimmed = raw.trim()
    if (!trimmed) return
    start += raw.indexOf(trimmed)
    end = start + trimmed.length
    const existing = highlights.find(
      (highlight) =>
        highlight.blockId === blockId && start < highlight.end && end > highlight.start,
    )
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) return
    const toolbarHalf = Math.min(156, window.innerWidth / 2 - 12)
    const center = rect.left + rect.width / 2
    const left = Math.min(window.innerWidth - 12 - toolbarHalf, Math.max(12 + toolbarHalf, center))
    const above = rect.top > 96
    setSelection({
      blockId,
      start,
      end,
      text: trimmed,
      top: above ? rect.top - 12 : rect.bottom + 12,
      left,
      above,
      highlightId: existing?.id,
      color: existing?.color,
    })
    setChrome(true)
  }, [article, highlights, noteId, settingsOpen, tocOpen, menuOpen, toast])

  const pickSelectionRef = useRef(pickSelection)
  const selectionTimer = useRef(0)

  useEffect(() => {
    pickSelectionRef.current = pickSelection
  }, [pickSelection])

  const schedulePickSelection = useCallback((delay = 40) => {
    window.clearTimeout(selectionTimer.current)
    selectionTimer.current = window.setTimeout(() => pickSelectionRef.current(), delay)
  }, [])

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) schedulePickSelection(380)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('.selection-bar')) return
      if (target.closest('mark[data-highlight-id]')) return
      setSelection(null)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onPointerDown)
      window.clearTimeout(selectionTimer.current)
    }
  }, [schedulePickSelection])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !noteId && !settingsOpen && !tocOpen && !menuOpen) {
        goBack()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [goBack, menuOpen, noteId, settingsOpen, tocOpen])

  if (!article) {
    return (
      <div className="reader-missing">
        <p>这一页已经不在书架上了。</p>
        <Link to="/" className="primary-button">
          回到阅读流
        </Link>
      </div>
    )
  }

  const activeArticle = article

  function handleScroll() {
    const el = scrollRef.current
    if (!el || !article) return
    const max = el.scrollHeight - el.clientHeight
    const progress = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progress})`
    }
    const nextPct = Math.round(progress * 100)
    setPct((current) => (current === nextPct ? current : nextPct))

    const top = el.scrollTop
    if (top > lastScrollY.current + 12 && top > 170) {
      if (!selection && !noteId && !settingsOpen && !tocOpen && !menuOpen) setChrome(false)
    } else if (top < lastScrollY.current - 12 || top < 40) {
      setChrome(true)
    }
    lastScrollY.current = top

    const headings = articleRef.current?.querySelectorAll<HTMLElement>(
      '.reader-h2[data-block-id], .reader-h3[data-block-id]',
    )
    if (headings) {
      let current: string | null = null
      headings.forEach((heading) => {
        if (heading.getBoundingClientRect().top < 180) {
          current = heading.dataset.blockId || null
        }
      })
      setActiveHeading((prev) => (prev === current ? prev : current))
    }

    const now = Date.now()
    if (now - lastSaveAt.current > 1200) {
      lastSaveAt.current = now
      setProgress(article.id, progress)
    }
  }

  function handleMarkClick(id: string, element: HTMLElement) {
    const highlight = highlights.find((entry) => entry.id === id)
    if (!highlight) return
    clearNativeSelection()
    const rect = element.getBoundingClientRect()
    const toolbarHalf = Math.min(156, window.innerWidth / 2 - 12)
    const left = Math.min(
      window.innerWidth - 12 - toolbarHalf,
      Math.max(12 + toolbarHalf, rect.left + rect.width / 2),
    )
    const above = rect.top > 96
    setSelection({
      blockId: highlight.blockId,
      start: highlight.start,
      end: highlight.end,
      text: highlight.text,
      top: above ? rect.top - 10 : rect.bottom + 10,
      left,
      above,
      highlightId: highlight.id,
      color: highlight.color,
    })
    setChrome(true)
  }

  function clearSelection() {
    clearNativeSelection()
    setSelection(null)
  }

  function applyColor(color: HighlightColor) {
    if (!selection) return
    if (selection.highlightId) {
      setHighlightColor(selection.highlightId, color)
      toast('已更换颜色')
    } else {
      const created = addHighlight({
        articleId: activeArticle.id,
        blockId: selection.blockId,
        start: selection.start,
        end: selection.end,
        text: selection.text,
        color,
      })
      if (!created) {
        toast('这一段已经划过了')
      } else {
        toast('已划线')
      }
    }
    clearSelection()
  }

  function writeNote() {
    if (!selection) return
    let id = selection.highlightId
    if (!id) {
      const created = addHighlight({
        articleId: activeArticle.id,
        blockId: selection.blockId,
        start: selection.start,
        end: selection.end,
        text: selection.text,
        color: selection.color || 'yellow',
      })
      if (!created) {
        toast('这一段已经划过了')
        return
      }
      id = created.id
    }
    clearSelection()
    setNoteId(id)
  }

  async function copySelection() {
    if (!selection) return
    const ok = await copyText(selection.text)
    toast(ok ? '已复制' : '复制失败，请手动选择')
    clearSelection()
  }

  async function shareSelection() {
    if (!selection) return
    const result = await shareQuoteCard({
      text: selection.text,
      title: activeArticle.title,
      source: activeArticle.source.name,
      date: fullDate(activeArticle.savedAt),
    })
    if (result === 'downloaded') toast('摘录卡片已保存')
    if (result === 'shared') toast('已分享')
    if (result === 'failed') toast('图片生成失败了')
    clearSelection()
  }

  function deleteSelection() {
    if (!selection?.highlightId) return
    removeHighlight(selection.highlightId)
    toast('高亮已删除')
    clearSelection()
  }

  function jumpTo(blockId: string) {
    const scrollEl = scrollRef.current
    const el = articleRef.current?.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)
    if (!scrollEl || !el) return
    const offset =
      el.getBoundingClientRect().top -
      scrollEl.getBoundingClientRect().top +
      scrollEl.scrollTop -
      96
    scrollEl.scrollTo({ top: offset, behavior: 'smooth' })
    setTocOpen(false)
  }

  const noteHighlight = highlights.find((highlight) => highlight.id === noteId)

  return (
    <div className="reader" data-reader>
      <div className="reader-progress-line" aria-hidden="true">
        <span ref={progressBarRef} />
      </div>

      <header className={`reader-bar ${chrome ? 'is-visible' : 'is-hidden'}`}>
        <div className="reader-bar-left">
          <IconButton label="返回" onClick={goBack}>
            <ArrowLeft size={19} strokeWidth={1.7} />
          </IconButton>
          <span className="reader-bar-source">{article.source.name}</span>
          <span className="reader-bar-meter">
            <strong>{pct}%</strong>
            <span className="meter-dot" aria-hidden="true" />
            <span>{pct >= 100 ? '已读完' : `约剩 ${remaining} 分钟`}</span>
          </span>
        </div>
        <div className="reader-bar-actions">
          <IconButton
            label={speech.active ? '停止朗读' : '听全文'}
            active={speech.active}
            onClick={() => {
              if (speech.active) stopSpeech()
              else startSpeech()
            }}
          >
            <Volume2 size={18} strokeWidth={1.7} />
          </IconButton>
          <IconButton label="目录" onClick={() => setTocOpen(true)}>
            <ListTree size={18} strokeWidth={1.7} />
          </IconButton>
          <IconButton label="排版" onClick={() => setSettingsOpen(true)}>
            <Type size={18} strokeWidth={1.7} />
          </IconButton>
          <IconButton label="更多" onClick={() => setMenuOpen(true)}>
            <MoreHorizontal size={19} strokeWidth={1.7} />
          </IconButton>
        </div>
      </header>

      <div
        className="reader-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerUp={() => schedulePickSelection(30)}
        onTouchEnd={() => schedulePickSelection(30)}
      >
        <div className="reader-canvas">
          <article className="reader-article" style={readerStyle} ref={articleRef}>
            <header className="reader-head">
              <div className="reader-source-line">
                <SourceIcon kind={article.source.kind} size={22} />
                {article.source.url ? (
                  <a href={article.source.url} target="_blank" rel="noreferrer">
                    {article.source.name}
                  </a>
                ) : (
                  <span>{article.source.name}</span>
                )}
                <span className="meta-dot" />
                <span>{fullDate(article.publishedAt)}</span>
              </div>
              <h1>{article.title}</h1>
              {article.subtitle && <p className="reader-dek">{article.subtitle}</p>}
              <div className="reader-byline">
                <span>{article.author || article.source.name}</span>
                <span className="meta-dot" />
                <span>
                  {minutes} 分钟 · {chars} 字
                </span>
                <button
                  type="button"
                  className={`listen-inline ${speech.active ? 'is-active' : ''}`}
                  onClick={() => {
                    if (speech.active) stopSpeech()
                    else startSpeech()
                  }}
                >
                  <Headphones size={14} strokeWidth={1.8} />
                  {speech.active ? '停止朗读' : '听全文'}
                </button>
              </div>
              <div className="reader-ornament" aria-hidden="true">
                <span />
              </div>
            </header>

            <ArticleBody
              article={article}
              highlights={highlights}
              flashHighlightId={flashId}
              speakingBlockId={speech.active ? speech.blockId : null}
              onMarkClick={handleMarkClick}
              onNoteClick={(id) => setNoteId(id)}
            />

            {article.tags.length > 0 && (
              <div className="reader-tags">
                {article.tags.map((tag) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                    # {tag}
                  </Link>
                ))}
              </div>
            )}

            <footer className="reader-end">
              <p className="reader-end-title">读到这里了。</p>
              <p className="reader-end-meta">
                共 {chars} 字 · 约 {minutes} 分钟
                {article.status === 'archived' ? ' · 已归档' : ''}
              </p>
              <div className="reader-end-actions">
                {article.status === 'archived' ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      restoreArticle(article.id)
                      toast('已放回阅读流')
                    }}
                  >
                    <RotateCcw size={15} strokeWidth={1.7} />
                    放回阅读流
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      archiveArticle(article.id)
                      toast('已归档这篇文章')
                    }}
                  >
                    <Archive size={15} strokeWidth={1.7} />
                    归档这篇文章
                  </button>
                )}
                <Link to="/" className="text-button">
                  回到阅读流
                </Link>
              </div>
            </footer>
          </article>
        </div>
      </div>

      {selection && (
        <SelectionToolbar
          selection={selection}
          onColor={applyColor}
          onCopy={() => void copySelection()}
          onNote={writeNote}
          onShare={() => void shareSelection()}
          onDelete={deleteSelection}
        />
      )}

      <ReaderSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TocPanel
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        article={article}
        activeBlockId={activeHeading}
        onJump={jumpTo}
      />

      <NoteSheet
        highlightId={noteHighlight?.id || null}
        onClose={() => setNoteId(null)}
      />

      <SpeechBar
        speech={speech}
        excerpt={
          speakable.find((item) => item.id === speech.blockId)?.text.slice(0, 34) ||
          article.title
        }
        onToggle={toggleSpeech}
        onStop={stopSpeech}
        onRate={cycleRate}
      />

      <Sheet
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false)
          setDeleteArmed(false)
        }}
        title="更多"
        className="reader-menu-sheet"
      >
        <div className="reader-menu">
          <div className="reader-menu-meta">
            <strong>{article.title}</strong>
            <span>
              {ageLabel(article.savedAt)}收藏 · {highlights.length} 处划线
            </span>
          </div>
          <button
            type="button"
            className="menu-row"
            onClick={() => {
              if (article.status === 'archived') {
                restoreArticle(article.id)
                toast('已放回阅读流')
              } else {
                archiveArticle(article.id)
                toast('已归档')
              }
              setMenuOpen(false)
            }}
          >
            {article.status === 'archived' ? (
              <RotateCcw size={17} strokeWidth={1.7} />
            ) : (
              <Archive size={17} strokeWidth={1.7} />
            )}
            <span>
              <strong>{article.status === 'archived' ? '放回阅读流' : '归档文章'}</strong>
              <em>{article.status === 'archived' ? '继续留在待读列表里' : '从阅读流移到已归档'}</em>
            </span>
          </button>
          {article.source.url && (
            <>
              <a
                className="menu-row"
                href={article.source.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} strokeWidth={1.7} />
                <span>
                  <strong>打开原文</strong>
                  <em>{article.source.url}</em>
                </span>
                <ArrowUpRight size={15} className="menu-row-end" />
              </a>
              <button
                type="button"
                className="menu-row"
                onClick={async () => {
                  const ok = await copyText(article.source.url as string)
                  toast(ok ? '链接已复制' : '复制失败')
                  setMenuOpen(false)
                }}
              >
                <Copy size={17} strokeWidth={1.7} />
                <span>
                  <strong>复制原文链接</strong>
                  <em>稍后分享给别人</em>
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            className="menu-row is-danger"
            onClick={() => {
              if (!deleteArmed) {
                setDeleteArmed(true)
                toast('再点一次，确认删除这篇文章')
                return
              }
              removeArticle(article.id)
              setMenuOpen(false)
              toast('文章已删除')
              navigate('/')
            }}
          >
            <Trash2 size={17} strokeWidth={1.7} />
            <span>
              <strong>{deleteArmed ? '再点一次确认删除' : '删除文章'}</strong>
              <em>文章与它的全部批注都会被移除</em>
            </span>
          </button>
        </div>
      </Sheet>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileUp, Link2, PenLine } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { SourceIcon } from '@/components/SourceIcon'
import { useToast } from '@/components/Toast'
import { importFromFile } from '@/lib/importers'
import type { ImportedDoc } from '@/lib/importers'
import { useStore } from '@/lib/store'

type Mode = 'text' | 'link' | 'file'

interface ImportItem {
  key: string
  name: string
  size: number
  status: 'parsing' | 'done' | 'error'
  doc?: ImportedDoc
  error?: string
}

const suggestedTags = ['阅读', '想法', '设计', '灵感']

const acceptTypes =
  '.txt,.text,.md,.markdown,.html,.htm,.xhtml,.pdf,.epub,' +
  'text/plain,text/markdown,text/html,application/pdf,application/epub+zip'

export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const addArticle = useStore((state) => state.addArticle)
  const addLink = useStore((state) => state.addLink)
  const [mode, setMode] = useState<Mode>('text')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [imports, setImports] = useState<ImportItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setMode('text')
    setTitle('')
    setSource('')
    setText('')
    setUrl('')
    setTags([])
    setImports([])
    setDragOver(false)
    setSubmitting(false)
    window.setTimeout(() => firstFieldRef.current?.focus(), 120)
  }, [open])

  const doneImports = imports.filter((item) => item.status === 'done' && item.doc)
  const anyParsing = imports.some((item) => item.status === 'parsing')

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  }

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list)
    if (!files.length) return
    const items: ImportItem[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      status: 'parsing',
    }))
    setImports((current) => [...current, ...items])
    await Promise.all(
      files.map(async (file, index) => {
        const key = items[index].key
        try {
          const doc = await importFromFile(file)
          setImports((current) =>
            current.map((item) => (item.key === key ? { ...item, status: 'done', doc } : item)),
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : '解析失败'
          setImports((current) =>
            current.map((item) =>
              item.key === key ? { ...item, status: 'error', error: message } : item,
            ),
          )
        }
      }),
    )
  }

  function submitImports() {
    if (submitting || anyParsing) return
    if (!doneImports.length) {
      toast('先选择能解析的文件')
      return
    }
    setSubmitting(true)
    const created = doneImports.map((item) =>
      addArticle({
        title: item.doc!.title,
        text: '',
        blocks: item.doc!.blocks,
        author: item.doc!.author,
        sourceName: item.doc!.sourceName,
        kind: item.doc!.kind,
        tags,
      }),
    )
    toast(`已导入 ${created.length} 篇`)
    onClose()
    navigate(`/read/${created[0].id}`)
  }

  function submit() {
    if (mode === 'file') {
      submitImports()
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      if (mode === 'link') {
        if (!url.trim()) {
          toast('先贴一个链接吧')
          setSubmitting(false)
          return
        }
        try {
          new URL(url.trim())
        } catch {
          toast('链接格式似乎不太对')
          setSubmitting(false)
          return
        }
        const article = addLink({
          url: url.trim(),
          title: title.trim() || undefined,
          note: text.trim() || undefined,
          tags,
        })
        toast('链接已收藏，正文可稍后补充')
        onClose()
        navigate(`/read/${article.id}`)
        return
      }

      if (!text.trim()) {
        toast('还没有内容')
        setSubmitting(false)
        textareaRef.current?.focus()
        return
      }
      const article = addArticle({
        title: title.trim() || (source.trim() ? `${source.trim()} · 摘录` : '未命名的一页'),
        text: text.trim(),
        sourceName: source.trim() || '我的收藏',
        kind: 'note',
        tags,
      })
      toast('已放进暂存箱')
      onClose()
      navigate(`/read/${article.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const footerLabel =
    mode === 'file'
      ? doneImports.length > 0
        ? `导入 ${doneImports.length} 篇到暂存箱`
        : '导入文件'
      : '放进暂存箱'
  const footerDisabled = mode === 'file' && (anyParsing || doneImports.length === 0)

  return (
    <Sheet open={open} onClose={onClose} title="收集" className="capture-sheet">
      <div className="capture-body" onKeyDown={handleKeyDown}>
        <div className="segmented capture-tabs" role="tablist" aria-label="收集方式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'text'}
            className={mode === 'text' ? 'is-active' : ''}
            onClick={() => setMode('text')}
          >
            <PenLine size={15} strokeWidth={1.8} />
            文字摘录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'link'}
            className={mode === 'link' ? 'is-active' : ''}
            onClick={() => setMode('link')}
          >
            <Link2 size={15} strokeWidth={1.8} />
            收藏链接
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'file'}
            className={mode === 'file' ? 'is-active' : ''}
            onClick={() => setMode('file')}
          >
            <FileUp size={15} strokeWidth={1.8} />
            本地文件
          </button>
        </div>

        <div className="capture-scroll">
          {mode !== 'file' && (
            <label className="field">
              <span className="field-label">标题</span>
              <input
                ref={firstFieldRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={mode === 'text' ? '给这一页起个名字（可选）' : '文章标题（可选）'}
              />
            </label>
          )}

          {mode === 'text' && (
            <label className="field">
              <span className="field-label">正文</span>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="粘贴文章、摘录或此刻的想法…&#10;支持 Markdown：# 标题、> 引用、- 列表"
                rows={7}
              />
            </label>
          )}

          {mode === 'link' && (
            <>
              <label className="field">
                <span className="field-label">链接</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </label>
              <label className="field">
                <span className="field-label">备注</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="为什么想保存它？先记一句，之后更容易回来。"
                  rows={3}
                />
              </label>
            </>
          )}

          {mode === 'file' && (
            <>
              <div
                className={`import-drop ${dragOver ? 'is-over' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="选择或拖入文件"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  void handleFiles(event.dataTransfer.files)
                }}
              >
                <span className="import-drop-icon">
                  <FileUp size={19} strokeWidth={1.7} />
                </span>
                <p className="import-drop-title">拖入文件，或点击选择</p>
                <p className="import-formats">.txt · .md · .html · .pdf · .epub</p>
                <p className="import-drop-hint">
                  EPUB 的段落还原最准确；PDF 尽力还原排版；扫描件无法提取文字。中文 txt
                  会自动识别 GBK 编码。
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept={acceptTypes}
                onChange={(event) => {
                  void handleFiles(event.target.files || [])
                  event.target.value = ''
                }}
              />

              {imports.length > 0 && (
                <div className="import-list">
                  {imports.map((item) => (
                    <div
                      key={item.key}
                      className={`import-item ${item.status === 'error' ? 'is-error' : ''}`}
                    >
                      {item.doc ? (
                        <SourceIcon kind={item.doc.kind} size={30} />
                      ) : (
                        <span className="source-icon" style={{ width: 30, height: 30 }}>
                          <FileText size={14} strokeWidth={1.7} />
                        </span>
                      )}
                      <div className="import-item-body">
                        <p className="import-item-title">{item.doc?.title || item.name}</p>
                        {item.status === 'parsing' && (
                          <span className="import-item-meta is-busy">解析中…</span>
                        )}
                        {item.status === 'done' && item.doc && (
                          <span className="import-item-meta">{item.doc.meta}</span>
                        )}
                        {item.status === 'error' && (
                          <span className="import-item-error">{item.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {mode !== 'file' && (
            <label className="field">
              <span className="field-label">来源</span>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="我的收藏 / 某篇文章 / 某个人"
              />
            </label>
          )}

          <div className="tag-picker">
            <span className="field-label">标签</span>
            <div className="tag-picker-list">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${tags.includes(tag) ? 'is-active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  # {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="capture-footer">
          <p className="capture-hint">所有内容只保存在此浏览器 · 无广告</p>
          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={submitting || footerDisabled}
          >
            {footerLabel}
            {mode !== 'file' && <kbd>⌘ ↵</kbd>}
          </button>
        </footer>
      </div>
    </Sheet>
  )
}

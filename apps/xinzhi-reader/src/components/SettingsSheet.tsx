import { useRef, useState } from 'react'
import { Download, ListPlus, RotateCcw, Upload } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { AppearanceControl, ReadingControls } from '@/components/ReadingControls'
import { useToast } from '@/components/Toast'
import { downloadExport, useStore } from '@/lib/store'
import type { AppData, SlimArticle } from '@/types'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const importData = useStore((state) => state.importData)
  const mergeImportArticles = useStore((state) => state.mergeImportArticles)
  const resetData = useStore((state) => state.resetData)
  const fileRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as AppData
      if (
        !Array.isArray(parsed.articles) ||
        !Array.isArray(parsed.highlights) ||
        !Array.isArray(parsed.feeds) ||
        !parsed.settings
      ) {
        throw new Error('invalid')
      }
      importData(parsed)
      toast('备份已恢复')
      onClose()
    } catch {
      toast('这个备份文件似乎无法读取')
    }
  }

  async function handleMergeImport(file: File | undefined) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as
        | SlimArticle[]
        | { articles?: SlimArticle[] }
        | null
      const list = Array.isArray(parsed) ? parsed : parsed?.articles
      if (!Array.isArray(list) || !list.length) {
        throw new Error('invalid')
      }
      const count = mergeImportArticles(list)
      if (count > 0) {
        toast(`已合并 ${count} 篇文章`)
        onClose()
      } else {
        toast('没有可导入的文章')
      }
    } catch {
      toast('这个 JSON 里没有可识别的文章列表')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="设置" className="settings-sheet">
      <div className="settings-body">
        <section className="settings-section">
          <h3>外观</h3>
          <AppearanceControl />
        </section>

        <section className="settings-section">
          <h3>阅读</h3>
          <ReadingControls />
        </section>

        <section className="settings-section">
          <h3>数据</h3>
          <p className="settings-hint">
            新枝没有服务器。你的收藏、划线和想法都保存在当前浏览器的本地存储里。换设备时，请手动备份。
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-action"
              onClick={() => {
                downloadExport()
                toast('备份文件已开始下载')
              }}
            >
              <Download size={16} strokeWidth={1.7} />
              <span>
                导出备份
                <em>JSON · 包含全部文章与批注</em>
              </span>
            </button>
            <button type="button" className="settings-action" onClick={() => fileRef.current?.click()}>
              <Upload size={16} strokeWidth={1.7} />
              <span>
                导入备份
                <em>会用备份完全替换当前数据</em>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                void handleImport(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              className="settings-action"
              onClick={() => mergeRef.current?.click()}
            >
              <ListPlus size={16} strokeWidth={1.7} />
              <span>
                合并导入文章
                <em>JSON · 追加到收藏，不覆盖现有数据</em>
              </span>
            </button>
            <input
              ref={mergeRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                void handleMergeImport(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              className="settings-action settings-action--danger"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true)
                  window.setTimeout(() => setConfirmReset(false), 4000)
                  return
                }
                resetData()
                setConfirmReset(false)
                toast('已恢复为示例内容')
              }}
            >
              <RotateCcw size={16} strokeWidth={1.7} />
              <span>
                {confirmReset ? '再点一次确认恢复' : '恢复示例内容'}
                <em>当前的收藏与批注会被清除</em>
              </span>
            </button>
          </div>
        </section>

        <section className="settings-section settings-about">
          <h3>关于</h3>
          <p>
            新枝 Web · 一个保护注意力的阅读空间。界面语言致敬新枝 App，为个人非商业复刻，并非官方版本。
          </p>
          <p className="settings-version">
            版本 0.1 · 无广告 · 无账号 · 本地优先 · 构建 {__BUILD_SHA__.slice(0, 7)}
          </p>
        </section>
      </div>
    </Sheet>
  )
}

import { Minus, Plus } from 'lucide-react'
import { Segmented } from '@/components/ui'
import { useStore } from '@/lib/store'
import type { Appearance, ReaderSettings } from '@/types'

export function AppearanceControl() {
  const appearance = useStore((state) => state.settings.appearance)
  const updateSettings = useStore((state) => state.updateSettings)
  return (
    <div className="control-group">
      <div className="control-label">
        <span>纸色</span>
      </div>
      <Segmented<Appearance>
        label="纸色"
        value={appearance}
        onChange={(value) => updateSettings({ appearance: value })}
        options={[
          { value: 'paper', label: '纸感' },
          { value: 'white', label: '纯白' },
          { value: 'night', label: '夜间' },
        ]}
      />
    </div>
  )
}

export function ReadingControls({ showAppearance = false }: { showAppearance?: boolean }) {
  const reader = useStore((state) => state.settings.reader)
  const updateReaderSettings = useStore((state) => state.updateReaderSettings)
  const set = (patch: Partial<ReaderSettings>) => updateReaderSettings(patch)

  return (
    <div className="reading-controls">
      {showAppearance && <AppearanceControl />}

      <div className="control-group">
        <div className="control-label">
          <span>字号</span>
          <span className="control-value">{reader.fontSize} px</span>
        </div>
        <div className="stepper">
          <button
            type="button"
            aria-label="减小字号"
            onClick={() => set({ fontSize: Math.max(15, reader.fontSize - 1) })}
          >
            <Minus size={15} />
          </button>
          <span className="stepper-track" aria-hidden="true">
            <span style={{ width: `${((reader.fontSize - 15) / 11) * 100}%` }} />
          </span>
          <button
            type="button"
            aria-label="增大字号"
            onClick={() => set({ fontSize: Math.min(26, reader.fontSize + 1) })}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>字体</span>
        </div>
        <Segmented<ReaderSettings['font']>
          label="字体"
          value={reader.font}
          onChange={(value) => set({ font: value })}
          options={[
            { value: 'serif', label: '宋体' },
            { value: 'sans', label: '黑体' },
          ]}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>行距</span>
        </div>
        <Segmented<string>
          label="行距"
          value={String(reader.lineHeight)}
          onChange={(value) => set({ lineHeight: Number(value) })}
          options={[
            { value: '1.7', label: '紧凑' },
            { value: '1.95', label: '适中' },
            { value: '2.2', label: '舒展' },
          ]}
        />
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>版心</span>
        </div>
        <Segmented<ReaderSettings['measure']>
          label="版心"
          value={reader.measure}
          onChange={(value) => set({ measure: value })}
          options={[
            { value: 'narrow', label: '窄' },
            { value: 'medium', label: '中' },
            { value: 'wide', label: '宽' },
          ]}
        />
      </div>

      <div className="reading-preview" aria-hidden="true">
        <span
          style={{
            fontFamily: reader.font === 'serif' ? 'var(--serif)' : 'var(--sans)',
            fontSize: `${Math.round(reader.fontSize * 0.72)}px`,
            lineHeight: reader.lineHeight,
          }}
        >
          文字安静下来，才听得见自己的想法。
        </span>
      </div>
    </div>
  )
}

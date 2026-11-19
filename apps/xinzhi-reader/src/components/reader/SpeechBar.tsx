import { Pause, Play, Square } from 'lucide-react'

export interface SpeechState {
  active: boolean
  paused: boolean
  blockId: string | null
  rate: number
}

export function SpeechBar({
  speech,
  excerpt,
  onToggle,
  onStop,
  onRate,
}: {
  speech: SpeechState
  excerpt: string
  onToggle: () => void
  onStop: () => void
  onRate: () => void
}) {
  if (!speech.active) return null

  return (
    <div className="speech-bar" role="group" aria-label="朗读控制">
      <span className={`speech-eq ${speech.paused ? 'is-paused' : ''}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="speech-copy">
        <span>{speech.paused ? '已暂停' : '正在朗读'}</span>
        <p>{excerpt}</p>
      </div>
      <button type="button" className="speech-rate" onClick={onRate} title="切换语速">
        {speech.rate.toFixed(1)}×
      </button>
      <button
        type="button"
        className="speech-toggle"
        onClick={onToggle}
        aria-label={speech.paused ? '继续朗读' : '暂停朗读'}
      >
        {speech.paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
      </button>
      <button type="button" className="speech-stop" onClick={onStop} aria-label="停止朗读">
        <Square size={14} fill="currentColor" />
      </button>
    </div>
  )
}

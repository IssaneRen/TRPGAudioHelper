// 统计：总量、连续天数、各章字数条形、近 14 天趋势
import { useMemo } from 'react'
import { useApp } from '../store'
import { bookWords, countWords, streakDays, todayWords } from '../lib/words'
import './stats.css'

export default function StatsView() {
  const book = useApp((s) => s.book)!

  const total = bookWords(book)
  const chapters = useMemo(
    () => book.volumes.flatMap((v) => v.chapters.map((c) => ({ vol: v.title, ...c, words: countWords(c.content) }))),
    [book],
  )
  const maxWords = Math.max(...chapters.map((c) => c.words), 1)

  const last14 = useMemo(() => {
    const days: { key: string; words: number }[] = []
    const d = new Date()
    d.setDate(d.getDate() - 13)
    for (let i = 0; i < 14; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({ key, words: book.stats.history[key] ?? 0 })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [book.stats.history])
  const maxDay = Math.max(...last14.map((d) => d.words), 1)

  // 容量护栏
  const bytes = JSON.stringify(book).length
  const usageMB = bytes / 1024 / 1024

  return (
    <section className="stats-zone">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">{total.toLocaleString()}</div>
          <div className="stat-label">全书字数</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{todayWords(book)}</div>
          <div className="stat-label">今日新增{book.dailyGoal ? ` / 目标 ${book.dailyGoal}` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{streakDays(book)}</div>
          <div className="stat-label">连续写作天数</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{chapters.length}</div>
          <div className="stat-label">章节数</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{usageMB.toFixed(2)} MB</div>
          <div className="stat-label">本机占用（超 4MB 建议导出备份）</div>
        </div>
      </div>

      <h3>各章字数</h3>
      <div className="bar-list">
        {chapters.map((c) => (
          <div key={c.id} className="bar-row">
            <span className="bar-name">{c.title}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(c.words / maxWords) * 100}%` }} />
            </div>
            <span className="bar-num">{c.words}</span>
          </div>
        ))}
      </div>

      <h3>近 14 天写作量</h3>
      <div className="trend">
        {last14.map((d) => (
          <div key={d.key} className="trend-col" title={`${d.key}：${d.words} 字`}>
            <div className="trend-bar" style={{ height: `${Math.max(2, (d.words / maxDay) * 90)}px`, opacity: d.words ? 1 : 0.25 }} />
            <span className="trend-day">{d.key.slice(5)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

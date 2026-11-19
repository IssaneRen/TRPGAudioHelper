import { NavLink } from 'react-router-dom'
import { Highlighter, Plus, Rss, Sparkles, Sun } from 'lucide-react'

export function MobileTabBar({ onCapture }: { onCapture: () => void }) {
  return (
    <nav className="mobile-tabs" aria-label="底部导航">
      <NavLink to="/" end className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}>
        <Sun size={20} strokeWidth={1.6} />
        <span>阅读流</span>
      </NavLink>
      <NavLink
        to="/feeds"
        className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}
      >
        <Rss size={20} strokeWidth={1.6} />
        <span>订阅</span>
      </NavLink>
      <button type="button" className="mobile-capture" onClick={onCapture} aria-label="收集一篇文章">
        <Plus size={22} strokeWidth={1.9} />
      </button>
      <NavLink
        to="/highlights"
        className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}
      >
        <Highlighter size={20} strokeWidth={1.6} />
        <span>批注</span>
      </NavLink>
      <NavLink
        to="/review"
        className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}
      >
        <Sparkles size={20} strokeWidth={1.6} />
        <span>回顾</span>
      </NavLink>
    </nav>
  )
}

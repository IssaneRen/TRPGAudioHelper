import { NavLink } from 'react-router-dom'
import {
  Archive,
  Hash,
  Highlighter,
  Plus,
  Rss,
  Search,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useStats } from '@/lib/selectors'

const items = [
  { to: '/', label: '阅读流', icon: Sun, end: true, count: 'inbox' as const },
  { to: '/feeds', label: '订阅', icon: Rss, count: 'feeds' as const },
  { to: '/tags', label: '标签', icon: Hash, count: undefined },
  { to: '/highlights', label: '批注', icon: Highlighter, count: 'highlights' as const },
  { to: '/review', label: '回顾', icon: Sparkles, count: undefined },
  { to: '/archive', label: '已归档', icon: Archive, count: 'archived' as const },
]

export function Sidebar({
  onCapture,
  onSearch,
  onSettings,
}: {
  onCapture: () => void
  onSearch: () => void
  onSettings: () => void
}) {
  const stats = useStats()

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <button type="button" className="collect-button" onClick={onCapture}>
          <Plus size={16} strokeWidth={1.9} />
          <span>收集</span>
          <kbd>N</kbd>
        </button>
        <button type="button" className="search-button" onClick={onSearch}>
          <Search size={15} strokeWidth={1.8} />
          <span>搜索</span>
          <kbd>⌘ K</kbd>
        </button>
      </div>

      <nav className="side-nav" aria-label="主导航">
        <p className="side-label">我的空间</p>
        {items.map((item) => {
          const Icon = item.icon
          const count = item.count ? stats[item.count] : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span>{item.label}</span>
              {typeof count === 'number' && count > 0 && <em>{count}</em>}
            </NavLink>
          )
        })}
      </nav>

      <div className="side-bottom">
        <div className="local-note">
          <span className="local-dot" />
          <p>无广告 · 数据只留在此设备</p>
        </div>
        <button type="button" className="side-settings" onClick={onSettings}>
          <Settings size={16} strokeWidth={1.7} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}

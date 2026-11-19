import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { MobileTabBar } from '@/components/MobileTabBar'
import { CaptureSheet } from '@/components/CaptureSheet'
import { SearchPalette } from '@/components/SearchPalette'
import { SettingsSheet } from '@/components/SettingsSheet'
import type { ShellContext } from '@/components/shellContext'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function AppShell() {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        return
      }
      if (isTypingTarget(event.target)) return
      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setCaptureOpen(true)
        return
      }
      if (!meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setCaptureOpen(true)
        return
      }
      if (!meta && event.key === '/') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const context: ShellContext = {
    openCapture: () => setCaptureOpen(true),
    openSearch: () => setSearchOpen(true),
    openSettings: () => setSettingsOpen(true),
  }

  return (
    <div className="app-shell">
      <Sidebar
        onCapture={context.openCapture}
        onSearch={context.openSearch}
        onSettings={context.openSettings}
      />
      <main className="app-main">
        <Outlet context={context} />
      </main>
      <MobileTabBar onCapture={context.openCapture} />
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

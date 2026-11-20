import { useEffect, useRef, useState } from 'react'
import { lockCatalog, unlockCatalog } from '@/lib/server-books'
import { refreshShelf } from '@/lib/store'

export function PrivateLibrary() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const request = useRef<AbortController | null>(null)

  async function login(value: string) {
    request.current?.abort()
    const current = new AbortController()
    request.current = current
    try {
      await unlockCatalog(value, current.signal)
      if (current.signal.aborted) return
      sessionStorage.setItem('reader-kp-session', value)
      refreshShelf()
      setOpen(true)
      setToken('')
      setStatus('')
    } catch (err) {
      if (current.signal.aborted) return
      logout()
      setStatus(err instanceof Error ? err.message : '登录失败')
    }
  }
  function logout() {
    request.current?.abort()
    sessionStorage.removeItem('reader-kp-session')
    lockCatalog()
    refreshShelf()
    setOpen(false)
    setStatus('')
  }
  useEffect(() => {
    const saved = sessionStorage.getItem('reader-kp-session')
    if (saved) void login(saved)
    return () => { request.current?.abort() }
  }, [])
  return <div className="private-library-login">
    {open ? <button type="button" onClick={logout}>锁定私人书库</button> :
      <form onSubmit={event => { event.preventDefault(); if (token.trim()) void login(token.trim()) }}>
        <label>私人书库 <input aria-label="KP 凭据" type="password" autoComplete="off" placeholder="KP 凭据" value={token} onChange={event => setToken(event.target.value)} /></label>
        <button type="submit">登录</button>
      </form>}
    {status && <small role="status">{status}</small>}
  </div>
}

import { useEffect, useRef, useState } from 'react'
import { lockCatalog, unlockCatalog } from '@/lib/server-books'
import { refreshShelf } from '@/lib/store'

export function PrivateLibrary() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const siteLogin = Boolean(localStorage.getItem('ai-session-token'))
  const request = useRef<AbortController | null>(null)

  async function login(value: string) {
    request.current?.abort()
    const current = new AbortController()
    request.current = current
    setLoading(true)
    setStatus('')
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
    } finally {
      if (request.current === current) setLoading(false)
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
  return <section className="private-library-login" aria-label="私人书库">
    {open ? <button type="button" onClick={logout}>锁定私人书库</button> :
      <form onSubmit={event => {
        event.preventDefault()
        const credential = token.trim() || localStorage.getItem('ai-session-token')
        if (credential) void login(credential)
      }}>
        <label htmlFor="reader-kp-token">私人书库</label>
        <input id="reader-kp-token" aria-label="KP 凭据" type="password" autoComplete="off"
          placeholder="KP 凭据" required={!siteLogin} value={token} onChange={event => setToken(event.target.value)} />
        <button type="submit" disabled={loading}>{loading ? '读取中…' : siteLogin && !token.trim() ? '使用本站登录' : '登录'}</button>
      </form>}
    {status ? <small role="alert">{status}</small> :
      !open && <small role="status">登录后显示服务器书目</small>}
  </section>
}

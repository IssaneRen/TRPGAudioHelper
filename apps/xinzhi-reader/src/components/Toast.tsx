import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastFn = (message: string) => void

const ToastContext = createContext<ToastFn>(() => undefined)

export function useToast(): ToastFn {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ToastFn>((next) => {
    window.clearTimeout(timer.current)
    setMessage(next)
    setVisible(true)
    timer.current = window.setTimeout(() => {
      setVisible(false)
      window.setTimeout(() => setMessage(null), 260)
    }, 2400)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  )
}

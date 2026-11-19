import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui'

export function Sheet({
  open,
  onClose,
  children,
  title,
  variant = 'sheet',
  className = '',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  variant?: 'sheet' | 'dialog'
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={`sheet-root sheet-root--${variant}`}>
      <button className="sheet-scrim" aria-label="关闭" onClick={onClose} tabIndex={-1} />
      <div
        className={`sheet-panel sheet-panel--${variant} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-grab" aria-hidden="true" />
        {title && (
          <header className="sheet-head">
            <h2>{title}</h2>
            <IconButton label="关闭" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </header>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function FloatingPanel({
  open,
  onClose,
  children,
  className = '',
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  label: string
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="floating-root">
      <button className="panel-scrim" aria-label="关闭面板" onClick={onClose} tabIndex={-1} />
      <div className={`floating-panel ${className}`} role="dialog" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

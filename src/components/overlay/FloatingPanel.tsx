import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

export interface FloatingPanelProps {
  id: string
  title: string
  icon?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  titleHidden?: boolean
  closeOnOutsideClick?: boolean
  headerHidden?: boolean
  closeOnPanelClick?: boolean
  draggable?: boolean
}

export function FloatingPanel({
  id,
  title,
  icon,
  onClose,
  children,
  style,
  className = '',
  titleHidden,
  closeOnOutsideClick = true,
  headerHidden,
  closeOnPanelClick,
  draggable = true,
}: FloatingPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startDx: number; startDy: number } | null>(null)
  const storageKey = useMemo(() => `gw_panel_pos_${id}`, [id])
  const [offset, setOffset] = useState<{ dx: number; dy: number }>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return { dx: 0, dy: 0 }
      const v = JSON.parse(raw) as any
      if (typeof v?.dx === 'number' && typeof v?.dy === 'number') return { dx: v.dx, dy: v.dy }
      return { dx: 0, dy: 0 }
    } catch {
      return { dx: 0, dy: 0 }
    }
  })

  // 外部点击关闭
  useEffect(() => {
    if (!closeOnOutsideClick) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target?.closest('[data-overlay-exempt="true"]')) return
      if (!ref.current?.contains(target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose, closeOnOutsideClick])

  // ESC 关闭
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(offset))
    } catch {}
  }, [storageKey, offset])

  return (
    <div
      id={`panel-${id}`}
      ref={ref}
      className={`rounded-xl border shadow-xl flex flex-col overflow-hidden ${className}`}
      style={{
        ...style,
        transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)`,
        touchAction: draggable ? 'none' : undefined,
      }}
      role="dialog"
      aria-label={title}
      onClick={() => {
        if (closeOnPanelClick) onClose()
      }}
    >
      {!headerHidden && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-[var(--color-surface)]"
          style={{ borderColor: 'var(--color-border)' }}
          onPointerDown={(e) => {
            if (!draggable || closeOnPanelClick) return
            if (e.button !== 0) return
            const el = e.currentTarget
            el.setPointerCapture(e.pointerId)
            dragRef.current = { startX: e.clientX, startY: e.clientY, startDx: offset.dx, startDy: offset.dy }
          }}
          onPointerMove={(e) => {
            const st = dragRef.current
            if (!draggable || closeOnPanelClick || !st) return
            setOffset({ dx: st.startDx + (e.clientX - st.startX), dy: st.startDy + (e.clientY - st.startY) })
          }}
          onPointerUp={(e) => {
            if (!draggable || closeOnPanelClick) return
            try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
            dragRef.current = null
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {icon && <span className="flex items-center justify-center w-4 h-4">{icon}</span>}
            {!titleHidden && <span>{title}</span>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--color-surface)] p-3">
        {children}
      </div>
    </div>
  )
}

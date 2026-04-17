import { BarChart2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import type { FloatingPanelDecl } from '@/api/types'

interface Props {
  floatingPanels?: FloatingPanelDecl[]
  onTogglePanel: (id: string) => void
  isPanelOpen: (id: string) => boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PanelSwitcherMenu({ floatingPanels = [], onTogglePanel, isPanelOpen, open, onOpenChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  // 只显示 placement !== 'none' 的面板，顺序与声明一致
  const visiblePanels = floatingPanels.filter(p => p.launcher?.placement !== 'none')

  return (
    <div className="relative" ref={ref} data-overlay-exempt="true" style={{ zIndex: 70 }}>
      <button
        className="p-1.5 rounded transition-colors"
        style={{ color: open ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        onClick={() => onOpenChange(!open)}
        aria-label="面板"
      >
        <BarChart2 size={18} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-[70] py-1">
          {visiblePanels.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              暂无面板
            </div>
          ) : (
            visiblePanels.map(p => {
              const active = isPanelOpen(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-accent)]/10 transition-colors"
                  style={{ color: active ? 'var(--color-accent)' : 'var(--color-text)' }}
                  onClick={() => { onTogglePanel(p.id); onOpenChange(false) }}
                >
                  <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {p.launcher.icon}
                  </span>
                  <span className="flex-1">{p.launcher.label ?? p.id}</span>
                  {active && <span className="text-[10px] opacity-60">●</span>}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

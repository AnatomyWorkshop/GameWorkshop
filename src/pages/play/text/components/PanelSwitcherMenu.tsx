import { BarChart2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import type { FloatingPanelDecl } from '@/api/types'

interface Props {
  statsAvailable?: boolean
  floatingPanels?: FloatingPanelDecl[]
  onTogglePanel: (id: string) => void
  isPanelOpen: (id: string) => boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PanelSwitcherMenu({ statsAvailable = true, floatingPanels = [], onTogglePanel, isPanelOpen, open, onOpenChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  return (
    <div className="relative" ref={ref} data-overlay-exempt="true" style={{ zIndex: 70 }}>
      <button
        className="p-1.5 rounded transition-colors"
        style={{ color: open ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        onClick={() => onOpenChange(!open)}
        aria-label="游戏状态"
      >
        <BarChart2 size={18} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-[70] py-1">
          <button
            type="button"
            disabled={!statsAvailable}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-40"
            onClick={() => { onTogglePanel('stats'); onOpenChange(false) }}
          >
            <span className="text-[var(--color-text-muted)]">📊</span>
            <span className="flex-1">统计</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-accent)]/10 transition-colors"
            onClick={() => { onTogglePanel('tags'); onOpenChange(false) }}
          >
            <span className="text-[var(--color-text-muted)]">🔖</span>
            <span className="flex-1">叙事标签</span>
          </button>

          {floatingPanels.length > 0 ? (
            <div className="py-1">
              {floatingPanels.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-accent)]/10 transition-colors"
                  onClick={() => {
                    onTogglePanel(p.id)
                    onOpenChange(false)
                  }}
                >
                  <span className="text-[var(--color-text-muted)]">{p.launcher.icon}</span>
                  <span className="flex-1">{p.id}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
              暂无浮窗入口
            </div>
          )}
        </div>
      )}
    </div>
  )
}

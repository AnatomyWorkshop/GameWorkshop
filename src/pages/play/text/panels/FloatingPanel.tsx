import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useDraggable } from './hooks/useDraggable'

export interface FloatingPanelProps {
  id: string
  title: string
  icon?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  /**
   * 面板行为预设：
   * - `peek`：无 header，点击面板背景关闭（不响应子元素冒泡）
   * - `tool`：有 header + 关闭按钮，点击面板外关闭
   * - `pinned`：有 header + 关闭按钮，只能点 × 关闭
   * 未指定时从旧版散装 props 推导（向后兼容）。
   */
  behavior?: 'peek' | 'tool' | 'pinned'
  draggable?: boolean
  /** @deprecated 使用 behavior 替代 */
  titleHidden?: boolean
  /** @deprecated 使用 behavior 替代 */
  closeOnOutsideClick?: boolean
  /** @deprecated 使用 behavior 替代 */
  headerHidden?: boolean
  /** @deprecated 使用 behavior 替代 */
  closeOnPanelClick?: boolean
}

export function FloatingPanel({
  id,
  title,
  icon,
  onClose,
  children,
  style,
  className = '',
  behavior,
  draggable = true,
  titleHidden,
  closeOnOutsideClick,
  headerHidden,
  closeOnPanelClick,
}: FloatingPanelProps) {
  const resolvedBehavior: 'peek' | 'tool' | 'pinned' = behavior ?? (
    closeOnPanelClick ? 'peek' :
    (closeOnOutsideClick ?? true) ? 'tool' :
    'pinned'
  )

  const showHeader = resolvedBehavior !== 'peek' && !headerHidden
  const bgClickCloses = resolvedBehavior === 'peek'
  const outsideClickCloses = resolvedBehavior === 'tool'
  const canDrag = draggable && showHeader

  const { ref, offset, dragHandleProps } = useDraggable({ id, enabled: canDrag })

  // 外部点击关闭（tool 行为）
  useEffect(() => {
    if (!outsideClickCloses) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target?.closest('[data-overlay-exempt="true"]')) return
      if (!ref.current?.contains(target)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose, outsideClickCloses, ref])

  // ESC 关闭
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      id={`panel-${id}`}
      ref={ref}
      className={`rounded-xl border shadow-xl flex flex-col overflow-hidden ${className}`}
      style={{
        ...style,
        transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)`,
        touchAction: canDrag ? 'none' : undefined,
      }}
      role="dialog"
      aria-label={title}
      onClick={(e) => {
        if (bgClickCloses && e.target === e.currentTarget) onClose()
      }}
    >
      {showHeader && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-[var(--color-surface)]"
          style={{ borderColor: 'var(--color-border)', ...dragHandleProps.style }}
          onPointerDown={dragHandleProps.onPointerDown}
          onPointerMove={dragHandleProps.onPointerMove}
          onPointerUp={dragHandleProps.onPointerUp}
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {icon && <span className="flex items-center justify-center w-4 h-4">{icon}</span>}
            {!titleHidden && <span>{title}</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--color-surface)] p-3">
        {children}
      </div>
    </div>
  )
}

/**
 * useDraggable — 悬浮窗拖动 hook
 *
 * 使用 PointerEvent + setPointerCapture 实现，支持鼠标和触摸。
 * 拖动位置通过 transform: translate3d 应用，不修改 top/left，避免 layout reflow。
 * 位置持久化到 localStorage（key: gw_panel_pos_{id}），刷新后恢复。
 *
 * 用法：
 *   const { ref, offset, handlePointerDown } = useDraggable({ id: 'stats', enabled: true })
 *   // 在面板根节点上：ref={ref} style={{ transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)` }}
 *   // 在拖动手柄上：onPointerDown={handlePointerDown}
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseDraggableOptions {
  id: string
  enabled?: boolean
}

interface DragOffset {
  dx: number
  dy: number
}

export function useDraggable({ id, enabled = true }: UseDraggableOptions) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startDx: number; startDy: number } | null>(null)
  const storageKey = useMemo(() => `gw_panel_pos_${id}`, [id])

  const [offset, setOffset] = useState<DragOffset>(() => {
    try {
      const raw = localStorage.getItem(`gw_panel_pos_${id}`)
      if (!raw) return { dx: 0, dy: 0 }
      const v = JSON.parse(raw) as any
      if (typeof v?.dx === 'number' && typeof v?.dy === 'number') return { dx: v.dx, dy: v.dy }
    } catch {}
    return { dx: 0, dy: 0 }
  })

  // 持久化位置
  useEffect(() => {
    if (!enabled) return
    try { localStorage.setItem(storageKey, JSON.stringify(offset)) } catch {}
  }, [storageKey, offset, enabled])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startDx: offset.dx, startDy: offset.dy }
  }, [enabled, offset])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const st = dragRef.current
    if (!enabled || !st) return
    setOffset({
      dx: st.startDx + (e.clientX - st.startX),
      dy: st.startDy + (e.clientY - st.startY),
    })
  }, [enabled])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    dragRef.current = null
  }, [enabled])

  const resetPosition = useCallback(() => {
    setOffset({ dx: 0, dy: 0 })
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey])

  return {
    ref,
    offset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetPosition,
    dragHandleProps: enabled ? {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      style: { cursor: 'grab' } as React.CSSProperties,
    } : {},
  }
}

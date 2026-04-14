import { useState, useCallback, useEffect } from 'react'

export interface PanelState {
  id: string
  open: boolean
}

export interface UsePanelsReturn {
  panels: Record<string, boolean>
  togglePanel: (id: string) => void
  closePanel: (id: string) => void
  isPanelOpen: (id: string) => boolean
}

export function usePanels(initialStates: string[] = []): UsePanelsReturn {

  const [panels, setPanels] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const id of initialStates) {
      init[id] = true
    }
    return init
  })

  const togglePanel = useCallback((id: string) => {
    setPanels(prev => {
      // 如果不允许同时打开多个面板，可以在这里增加关闭其他面板的逻辑
      // 目前允许同屏多面板
      return { ...prev, [id]: !prev[id] }
    })
  }, [])

  const closePanel = useCallback((id: string) => {
    setPanels(prev => {
      if (!prev[id]) return prev
      return { ...prev, [id]: false }
    })
  }, [])

  const isPanelOpen = useCallback((id: string) => {
    return !!panels[id]
  }, [panels])

  // ESC 关闭最后打开的面板逻辑（可选）
  // 暂时保留基础实现

  return {
    panels,
    togglePanel,
    closePanel,
    isPanelOpen
  }
}

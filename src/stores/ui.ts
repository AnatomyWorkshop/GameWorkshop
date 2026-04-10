import { create } from 'zustand'

interface UIState {
  worldbookOpen: boolean
  sidebarOpen: boolean
  toggleWorldbook: () => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>(set => ({
  worldbookOpen: false,
  sidebarOpen: false,
  toggleWorldbook: () => set(s => ({ worldbookOpen: !s.worldbookOpen })),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
}))

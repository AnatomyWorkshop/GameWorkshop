import { create } from 'zustand'

export interface ApiTraceItem {
  id: string
  ts: number
  method: string
  url: string
  status?: number
  ok?: boolean
  ms?: number
  error?: string
}

interface ApiTraceState {
  items: ApiTraceItem[]
  push: (item: ApiTraceItem) => void
  patch: (id: string, patch: Partial<ApiTraceItem>) => void
  clear: () => void
}

export const useApiTraceStore = create<ApiTraceState>((set) => ({
  items: [],
  push: (item) =>
    set((s) => ({ items: [item, ...s.items].slice(0, 50) })),
  patch: (id, patch) =>
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
  clear: () => set({ items: [] }),
}))

export function newTraceId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

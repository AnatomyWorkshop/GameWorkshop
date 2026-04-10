import { create } from 'zustand'

interface StreamState {
  sessionId: string | null
  streaming: boolean
  buffer: string        // accumulated delta text for current assistant turn
  abortCtrl: AbortController | null
  startStream: (sessionId: string) => AbortController
  appendDelta: (text: string) => void
  endStream: () => void
}

export const useStreamStore = create<StreamState>((set, get) => ({
  sessionId: null,
  streaming: false,
  buffer: '',
  abortCtrl: null,
  startStream(sessionId) {
    get().abortCtrl?.abort()
    const ctrl = new AbortController()
    set({ sessionId, streaming: true, buffer: '', abortCtrl: ctrl })
    return ctrl
  },
  appendDelta(text) {
    set(s => ({ buffer: s.buffer + text }))
  },
  endStream() {
    set({ streaming: false, buffer: '', abortCtrl: null })
  },
}))

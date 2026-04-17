import { create } from 'zustand'

interface StreamState {
  sessionId: string | null
  streaming: boolean
  buffer: string
  pendingUserInput: string | null
  pendingMessage: string | null   // buffer preserved after stop, shown until next refetch
  streamError: string | null
  abortCtrl: AbortController | null
  startStream: (sessionId: string, userInput: string) => AbortController
  appendDelta: (text: string) => void
  endStream: () => void
  stopStream: () => void          // user-initiated stop — preserves buffer as pendingMessage
  clearPending: () => void
  clearPendingUserInput: () => void
  setError: (msg: string) => void
  clearError: () => void
}

function humanizeError(raw: string): string {
  if (/401|unauthorized|api.?key|invalid.?key|incorrect.?api/i.test(raw)) return 'API Key 无效或与 Base URL 不匹配，请检查运行配置'
  if (/403|forbidden/i.test(raw)) return '无访问权限，请检查 API Key'
  if (/429|rate.?limit|too.?many/i.test(raw)) return '请求过于频繁，请稍后重试'
  if (/stream closed unexpectedly/i.test(raw)) return '连接中断，请重试'
  if (/500|internal.?server/i.test(raw)) return `服务器错误：${raw}`
  if (/concurrent_generation/i.test(raw)) return '上一条消息仍在生成中，请稍候'
  return raw
}

export const useStreamStore = create<StreamState>((set, get) => ({
  sessionId: null,
  streaming: false,
  buffer: '',
  pendingUserInput: null,
  pendingMessage: null,
  streamError: null,
  abortCtrl: null,
  startStream(sessionId, userInput) {
    get().abortCtrl?.abort()
    const ctrl = new AbortController()
    set({ sessionId, streaming: true, buffer: '', pendingUserInput: userInput, pendingMessage: null, streamError: null, abortCtrl: ctrl })
    return ctrl
  },
  appendDelta(text) {
    set(s => ({ buffer: s.buffer + text }))
  },
  endStream() {
    // Normal completion — buffer is committed to floors by backend, clear it
    set({ streaming: false, buffer: '', abortCtrl: null })
  },
  stopStream() {
    // User-initiated stop — preserve buffer as pendingMessage so it stays visible
    const { buffer, abortCtrl } = get()
    abortCtrl?.abort()
    set({ streaming: false, buffer: '', pendingMessage: buffer || null, abortCtrl: null })
  },
  clearPending() {
    set({ pendingMessage: null })
  },
  clearPendingUserInput() {
    set({ pendingUserInput: null })
  },
  setError(msg) {
    set({ streamError: humanizeError(msg), streaming: false, buffer: '', abortCtrl: null })
  },
  clearError() {
    set({ streamError: null })
  },
}))

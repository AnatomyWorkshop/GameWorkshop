import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { TurnResponse } from './types'
import { apiFetch } from './client'
import { newTraceId, useApiTraceStore } from '@/stores/apiTrace'

export interface StreamOptions {
  api_key?: string
  base_url?: string
  model?: string
  branch_id?: string
}

export function streamTurn(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
  onDone: (turn: TurnResponse) => void,
  onError: (err: Error) => void,
  signal?: AbortSignal,
  opts?: StreamOptions,
) {
  const params = new URLSearchParams({ input: message })
  if (opts?.api_key) params.set('api_key', opts.api_key)
  if (opts?.base_url) params.set('base_url', opts.base_url)
  if (opts?.model) params.set('model', opts.model)
  if (opts?.branch_id) params.set('branch_id', opts.branch_id)
  let metaReceived = false
  const traceId = newTraceId()
  const started = performance.now()
  useApiTraceStore.getState().push({ id: traceId, ts: Date.now(), method: 'GET', url: `/api/play/sessions/${sessionId}/stream?${params}` })
  fetchEventSource(`/api/play/sessions/${sessionId}/stream?${params}`, {
    method: 'GET',
    signal,
    onmessage(ev) {
      if (ev.event === 'token') {
        onDelta(ev.data)
      } else if (ev.event === 'meta') {
        metaReceived = true
        useApiTraceStore.getState().patch(traceId, { ok: true, status: 200, ms: Math.round(performance.now() - started) })
        try { onDone(JSON.parse(ev.data) as TurnResponse) } catch { onError(new Error('invalid meta')) }
      } else if (ev.event === 'error') {
        useApiTraceStore.getState().patch(traceId, { ok: false, status: 500, ms: Math.round(performance.now() - started), error: ev.data })
        onError(new Error(ev.data))
      }
    },
    onclose() {
      // backend closed connection without meta (e.g. context cancelled) — end stream gracefully
      if (!metaReceived) {
        useApiTraceStore.getState().patch(traceId, { ok: false, status: 499, ms: Math.round(performance.now() - started), error: 'stream closed unexpectedly' })
        onError(new Error('stream closed unexpectedly'))
      }
    },
    onerror(err) {
      useApiTraceStore.getState().patch(traceId, { ok: false, status: 0, ms: Math.round(performance.now() - started), error: err instanceof Error ? err.message : String(err) })
      onError(err instanceof Error ? err : new Error(String(err)))
      throw err // stop retrying
    },
  })
}

export function regenTurn(
  sessionId: string,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  return apiFetch<TurnResponse>(`/play/sessions/${sessionId}/regen`, { method: 'POST', body: '{}' })
    .then(() => onDone())
    .catch((err) => onError(err instanceof Error ? err : new Error(String(err))))
}

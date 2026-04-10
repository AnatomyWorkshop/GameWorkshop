import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { TurnResponse } from './types'
import { apiFetch } from './client'

export function streamTurn(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
  onDone: (turn: TurnResponse) => void,
  onError: (err: Error) => void,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ input: message })
  let metaReceived = false
  fetchEventSource(`/api/play/sessions/${sessionId}/stream?${params}`, {
    method: 'GET',
    signal,
    onmessage(ev) {
      if (ev.event === 'token') {
        onDelta(ev.data)
      } else if (ev.event === 'meta') {
        metaReceived = true
        try { onDone(JSON.parse(ev.data) as TurnResponse) } catch { onError(new Error('invalid meta')) }
      } else if (ev.event === 'error') {
        onError(new Error(ev.data))
      }
    },
    onclose() {
      // backend closed connection without meta (e.g. context cancelled) — end stream gracefully
      if (!metaReceived) onError(new Error('stream closed unexpectedly'))
    },
    onerror(err) {
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

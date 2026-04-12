import { apiFetch } from './client'
import type { Session, Floor, TurnResponse } from './types'

export const sessionsApi = {
  list: (gameId: string) => apiFetch<Session[]>(`/play/sessions?game_id=${gameId}`),
  get: (id: string) => apiFetch<Session>(`/play/sessions/${id}`),
  create: (gameId: string, characterId?: string) =>
    apiFetch<{ session_id: string }>('/play/sessions', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, character_id: characterId }),
    }),
  update: (id: string, patch: { is_public?: boolean; title?: string }) =>
    apiFetch<Session>(`/play/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/play/sessions/${id}`, { method: 'DELETE' }),
  rename: (id: string, title: string) =>
    apiFetch<Session>(`/play/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  variables: (id: string) =>
    apiFetch<Record<string, unknown>>(`/play/sessions/${id}/variables`),
  floors: (id: string, params?: { from?: number; to?: number }) => {
    const q = new URLSearchParams()
    if (params?.from != null) q.set('from', String(params.from))
    if (params?.to != null) q.set('to', String(params.to))
    return apiFetch<Floor[]>(`/play/sessions/${id}/floors?${q}`)
  },
  regen: (id: string) => apiFetch<TurnResponse>(`/play/sessions/${id}/regen`, { method: 'POST', body: '{}' }),
  suggest: (id: string) => apiFetch<{ suggestion: string }>(`/play/sessions/${id}/suggest`, { method: 'POST', body: '{}' }),
  memories: (id: string) => apiFetch<unknown[]>(`/play/sessions/${id}/memories`),
  editFloor: (sessionId: string, floorId: string, content: string) =>
    apiFetch<void>(`/play/sessions/${sessionId}/floors/${floorId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  deleteFloor: (sessionId: string, floorId: string) =>
    apiFetch<void>(`/play/sessions/${sessionId}/floors/${floorId}`, { method: 'DELETE' }),
}

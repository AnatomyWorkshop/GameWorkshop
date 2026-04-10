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
  update: (id: string, patch: { is_public?: boolean }) =>
    apiFetch<Session>(`/play/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  floors: (id: string, params?: { from?: number; to?: number }) => {
    const q = new URLSearchParams()
    if (params?.from != null) q.set('from', String(params.from))
    if (params?.to != null) q.set('to', String(params.to))
    return apiFetch<Floor[]>(`/play/sessions/${id}/floors?${q}`)
  },
  regen: (id: string) => apiFetch<TurnResponse>(`/play/sessions/${id}/regen`, { method: 'POST', body: '{}' }),
}

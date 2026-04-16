import { apiFetch } from './client'
import type { Session, Floor, TurnResponse, PromptPreview } from './types'

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
  floors: (id: string, params?: { from?: number; to?: number; branch_id?: string }) => {
    const q = new URLSearchParams()
    if (params?.from != null) q.set('from', String(params.from))
    if (params?.to != null) q.set('to', String(params.to))
    if (params?.branch_id) q.set('branch_id', params.branch_id)
    return apiFetch<Floor[]>(`/play/sessions/${id}/floors?${q}`)
  },
  promptPreview: (id: string) => apiFetch<PromptPreview>(`/play/sessions/${id}/prompt-preview`),
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
  translate: (sessionId: string, content: string) =>
    apiFetch<{ translation: string }>(`/play/sessions/${sessionId}/translate`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  branches: (id: string) =>
    apiFetch<Array<{ branch_id: string; parent_branch: string; origin_seq: number; floor_count: number; created_at: string }>>(
      `/play/sessions/${id}/branches`,
    ),
  createBranchFromFloor: (sessionId: string, floorId: string) =>
    apiFetch<{ branch_id: string }>(`/play/sessions/${sessionId}/floors/${floorId}/branch`, { method: 'POST', body: '{}' }),
}

import { apiFetch } from './client'
import type { Game, GameListResponse, MergedWorldbookEntry } from './types'

export const gamesApi = {
  list: (params?: { type?: string; tags?: string; sort?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set('type', params.type)
    if (params?.tags) q.set('tags', params.tags)
    if (params?.sort) q.set('sort', params.sort)
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    return apiFetch<GameListResponse>(`/play/games?${q}`)
  },
  get: (slug: string) => apiFetch<Game>(`/play/games/${slug}`),
  worldbook: (gameId: string, userId: string = 'anonymous') =>
    apiFetch<MergedWorldbookEntry[]>(`/users/${userId}/library/${gameId}/worldbook`),
  patchWorldbookEntry: (gameId: string, entryId: string, patch: { content?: string; enabled?: boolean; priority?: number }, userId: string = 'anonymous') =>
    apiFetch<unknown>(`/users/${userId}/library/${gameId}/worldbook/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  createWorldbookEntry: (
    gameId: string,
    body: { content: string; keys?: string[]; enabled?: boolean; constant?: boolean; priority?: number },
    userId: string = 'anonymous',
  ) =>
    apiFetch<unknown>(`/users/${userId}/library/${gameId}/worldbook`, {
      method: 'POST',
      body: JSON.stringify({
        content: body.content,
        keys: body.keys ?? [],
        enabled: body.enabled,
        constant: body.constant,
        priority: body.priority,
      }),
    }),
  deleteWorldbookEntry: (gameId: string, entryId: string, userId: string = 'anonymous') =>
    apiFetch<unknown>(`/users/${userId}/library/${gameId}/worldbook/${entryId}`, { method: 'DELETE' }),
  resetWorldbookOverrides: (gameId: string, userId: string = 'anonymous') =>
    apiFetch<unknown>(`/users/${userId}/library/${gameId}/worldbook`, { method: 'DELETE' }),
}

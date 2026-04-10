import { apiFetch } from './client'
import type { Game, GameListResponse, WorldbookEntry } from './types'

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
  worldbook: (id: string) => apiFetch<WorldbookEntry[]>(`/play/games/worldbook/${id}`),
}

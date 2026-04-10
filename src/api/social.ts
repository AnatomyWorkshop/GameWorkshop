import { apiFetch } from './client'
import type { Comment, GameStats } from './types'

export const socialApi = {
  react: (targetType: 'game' | 'comment' | 'forum_post' | 'forum_reply', targetId: string, reactionType: 'like' | 'favorite') =>
    apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'POST' }),
  unreact: (targetType: string, targetId: string, reactionType: string) =>
    apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'DELETE' }),
  getStats: (gameId: string) =>
    apiFetch<GameStats>(`/social/games/${gameId}/stats`),
  getComments: (gameId: string, cursor?: string) => {
    const q = new URLSearchParams({ sort: 'date_desc', limit: '20' })
    if (cursor) q.set('cursor', cursor)
    return apiFetch<{ comments: Comment[]; next_cursor: string | null }>(`/social/games/${gameId}/comments?${q}`)
  },
}

import { apiFetch } from './client'
import type { Comment, GameStats } from './types'

export interface CommentWithReplies extends Comment {
  replies: Comment[]
}

export const socialApi = {
  react: (targetType: 'game' | 'comment' | 'forum_post' | 'forum_reply', targetId: string, reactionType: 'like' | 'favorite') =>
    apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'POST' }),
  unreact: (targetType: string, targetId: string, reactionType: string) =>
    apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'DELETE' }),
  getStats: (gameId: string) =>
    apiFetch<GameStats>(`/social/games/${gameId}/stats`),
  getComments: (gameId: string, offset = 0) => {
    const q = new URLSearchParams({ sort: 'date_desc', limit: '20', offset: String(offset) })
    return apiFetch<{ total: number; items: CommentWithReplies[] }>(`/social/games/${gameId}/comments?${q}`)
  },
  getMyReactions: (targetType: string, targetId: string) =>
    apiFetch<{ like: boolean; favorite: boolean }>(`/social/reactions/mine/${targetType}/${targetId}`),
}

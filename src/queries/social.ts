import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { socialApi } from '@/api/social'

export const socialKeys = {
  stats: (gameId: string) => ['social', 'stats', gameId] as const,
  comments: (gameId: string) => ['social', 'comments', gameId] as const,
}

export function useGameStats(gameId: string) {
  return useQuery({
    queryKey: socialKeys.stats(gameId),
    queryFn: () => socialApi.getStats(gameId),
    enabled: !!gameId,
  })
}

const COMMENT_PAGE = 20

export function useComments(gameId: string) {
  return useInfiniteQuery({
    queryKey: socialKeys.comments(gameId),
    queryFn: ({ pageParam = 0 }) => socialApi.getComments(gameId, pageParam as number),
    getNextPageParam: (last, pages) => {
      const loaded = pages.length * COMMENT_PAGE
      return loaded < last.total ? loaded : undefined
    },
    initialPageParam: 0,
    enabled: !!gameId,
  })
}

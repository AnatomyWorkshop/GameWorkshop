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

export function useComments(gameId: string) {
  return useInfiniteQuery({
    queryKey: socialKeys.comments(gameId),
    queryFn: ({ pageParam }) => socialApi.getComments(gameId, pageParam as string | undefined),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!gameId,
  })
}

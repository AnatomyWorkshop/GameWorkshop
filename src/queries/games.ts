import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { gamesApi } from '@/api/games'

const PAGE = 20

export const gameKeys = {
  list: (params?: object) => ['games', params] as const,
  detail: (slug: string) => ['games', slug] as const,
  worldbook: (id: string) => ['games', id, 'worldbook'] as const,
}

export function useGameList(params?: { type?: string; tags?: string; sort?: string }) {
  return useInfiniteQuery({
    queryKey: gameKeys.list(params),
    queryFn: ({ pageParam = 0 }) =>
      gamesApi.list({ ...params, limit: PAGE, offset: pageParam as number }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.length * PAGE
      return loaded < last.total ? loaded : undefined
    },
    initialPageParam: 0,
  })
}

export function useGame(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gameKeys.detail(slug),
    queryFn: () => gamesApi.get(slug),
    enabled: (options?.enabled ?? true) && !!slug,
  })
}

export function useWorldbook(gameId: string, enabled: boolean) {
  return useQuery({
    queryKey: gameKeys.worldbook(gameId),
    queryFn: () => gamesApi.worldbook(gameId),
    enabled: enabled && !!gameId,
  })
}

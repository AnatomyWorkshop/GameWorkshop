import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'

export const sessionKeys = {
  list: (gameId: string) => ['sessions', gameId] as const,
  detail: (id: string) => ['sessions', id] as const,
  floors: (id: string) => ['sessions', id, 'floors'] as const,
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionsApi.get(sessionId),
    enabled: !!sessionId,
  })
}

export function useSessionList(gameId: string) {
  return useQuery({
    queryKey: sessionKeys.list(gameId),
    queryFn: () => sessionsApi.list(gameId),
    enabled: !!gameId,
  })
}

export function useFloors(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.floors(sessionId),
    queryFn: () => sessionsApi.floors(sessionId),
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ gameId, characterId }: { gameId: string; characterId?: string }) =>
      sessionsApi.create(gameId, characterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

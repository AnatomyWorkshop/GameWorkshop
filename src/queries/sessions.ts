import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'

export const sessionKeys = {
  list: (gameId: string) => ['sessions', gameId] as const,
  detail: (id: string) => ['sessions', id] as const,
  floors: (id: string, branchId: string) => ['sessions', id, 'floors', branchId] as const,
  promptPreview: (id: string) => ['sessions', id, 'prompt-preview'] as const,
  branches: (id: string) => ['sessions', id, 'branches'] as const,
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

export function useFloors(sessionId: string, branchId: string) {
  return useQuery({
    queryKey: sessionKeys.floors(sessionId, branchId),
    queryFn: () => sessionsApi.floors(sessionId, { branch_id: branchId }),
    enabled: !!sessionId && !!branchId,
  })
}

export function useBranches(sessionId: string) {
  return useQuery({
    queryKey: sessionKeys.branches(sessionId),
    queryFn: () => sessionsApi.branches(sessionId),
    enabled: !!sessionId,
    staleTime: 5_000,
  })
}

export function usePromptPreview(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: sessionKeys.promptPreview(sessionId),
    queryFn: () => sessionsApi.promptPreview(sessionId),
    enabled: !!sessionId && enabled,
    staleTime: 5_000,
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

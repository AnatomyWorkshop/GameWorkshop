const BASE = '/api'

export class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message)
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  const json = await res.json()
  if (json.code !== 0) throw new ApiError(json.code, json.message ?? 'API error')
  return json.data as T
}

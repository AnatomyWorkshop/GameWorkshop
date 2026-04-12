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
  let json: any = null
  try {
    json = await res.json()
  } catch {
    throw new ApiError(res.status, res.statusText || 'API error')
  }

  if (res.ok) {
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code !== 0) throw new ApiError(Number(json.code) || res.status, json.message ?? json.error ?? 'API error')
      return json.data as T
    }
    return json as T
  }

  const msg = (json && typeof json === 'object' && (json.message ?? json.error)) ? (json.message ?? json.error) : (res.statusText || 'API error')
  throw new ApiError(res.status, msg)
}

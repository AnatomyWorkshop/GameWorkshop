const KEY = 'gw_runtime_config'

export interface SlotRuntimeConfig {
  base_url?: string
  api_key?: string
  model_label?: string
  enabled?: boolean
}

export interface RuntimeConfig {
  base_url?: string
  api_key?: string
  model_label?: string
  slots?: Partial<Record<'narrator' | 'director' | 'verifier' | 'memory', SlotRuntimeConfig>>
}

export function getRuntimeConfig(): RuntimeConfig {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function setRuntimeConfig(cfg: RuntimeConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

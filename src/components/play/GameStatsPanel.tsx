import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'
import { X } from 'lucide-react'
import TechStatsModal from './TechStatsModal'

type StatItem = { key: string; icon?: string; label?: string }

interface Props {
  sessionId: string
  displayVars?: string[] // from game.ui_config.display_vars — which vars to show
  items?: StatItem[] // from game.ui_config.stats_bar.items
  floorCount?: number
  lastTokenUsed?: number
  lastError?: string
  onClose: () => void
}

function formatValue(val: unknown): string {
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '是' : '否'
  if (typeof val === 'object') return '…'
  return String(val ?? '')
}

function getByPath(allVars: Record<string, unknown>, path: string): unknown {
  if (path in allVars) return allVars[path]
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return undefined
  let cur: any = allVars
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else return undefined
  }
  return cur
}

function parseKeySpec(raw: string): { path: string; constant?: number } {
  const parts = raw.split('.').filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]
    if (/^-?\d+(\.\d+)?$/.test(last)) {
      return { path: parts.slice(0, -1).join('.'), constant: Number(last) }
    }
  }
  return { path: raw }
}

export default function GameStatsPanel({ sessionId, displayVars, items, floorCount, lastTokenUsed, lastError, onClose }: Props) {
  const [techOpen, setTechOpen] = useState(false)

  const { data: variables } = useQuery({
    queryKey: ['session-variables', sessionId],
    queryFn: () => sessionsApi.variables(sessionId),
    refetchInterval: 5000,
  })

  // Determine which vars to show: use display_vars if provided, else all non-_ vars
  const allVars = variables ?? {}
  const flat: Array<{ key: string; icon?: string; label: string; value: unknown }> =
    items && items.length > 0
      ? items
        .map(it => ({
          key: parseKeySpec(it.key).path,
          icon: it.icon,
          label: it.label ?? it.key,
          value: (() => {
            const spec = parseKeySpec(it.key)
            const v = getByPath(allVars, spec.path)
            return v !== undefined ? v : spec.constant
          })(),
        }))
        .filter(it => it.value !== undefined)
      : []

  const grouped = new Map<string, Array<{ key: string; icon?: string; label: string; value: unknown }>>()
  const singles: Array<{ key: string; icon?: string; label: string; value: unknown }> = []
  for (const it of flat) {
    const parts = it.label.split('.').filter(Boolean)
    if (parts.length >= 2) {
      const group = parts[0]
      const label = parts[1]
      const child = { ...it, label }
      const arr = grouped.get(group) ?? []
      arr.push(child)
      grouped.set(group, arr)
    } else {
      singles.push(it)
    }
  }

  return (
    <>
      <div className="px-3 pt-2 pb-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex items-center gap-2">
                {flat.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)]" />
                ) : (
                  <>
                    {Array.from(grouped.entries()).map(([group, children]) => (
                      <div
                        key={group}
                        className="shrink-0 flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        title={group}
                      >
                        <span className="text-[10px] text-[var(--color-text-muted)]">{group}</span>
                        <span className="opacity-30">|</span>
                        {children.map((c, idx) => (
                          <span key={c.key} className="inline-flex items-center gap-1">
                            {idx > 0 && <span className="opacity-30">·</span>}
                            <span className="text-[10px] text-[var(--color-text-muted)]">{c.label}</span>
                            <span className="font-medium tabular-nums">{formatValue(c.value)}</span>
                          </span>
                        ))}
                      </div>
                    ))}
                    {singles.map(it => (
                      <div
                        key={it.key}
                        className="shrink-0 flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        title={it.label}
                      >
                        {it.icon ? (
                          <span className="text-[10px] text-[var(--color-text-muted)]">{it.icon}</span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-text-muted)]">{it.label}</span>
                        )}
                        <span className="font-medium tabular-nums">{formatValue(it.value)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="收起"
              onClick={onClose}
            >
              <X size={16} />
            </button>

            <button
              type="button"
              onClick={() => setTechOpen(o => !o)}
              className="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              更多 ▸
            </button>
          </div>
        </div>
      </div>

      {techOpen && (
        <TechStatsModal
          sessionId={sessionId}
          floorCount={floorCount}
          lastTokenUsed={lastTokenUsed}
          lastError={lastError}
          onClose={() => setTechOpen(false)}
        />
      )}
    </>
  )
}

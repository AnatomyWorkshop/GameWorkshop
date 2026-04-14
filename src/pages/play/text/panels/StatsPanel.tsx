import { useQuery } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'
import { FloatingPanel } from '@/components/overlay/FloatingPanel'

type StatItem = { key: string; icon?: string; label?: string }

interface Props {
  sessionId: string
  variables?: Record<string, unknown>
  items?: StatItem[]
  onClose: () => void
  style?: React.CSSProperties
}

function formatValue(val: unknown): string {
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '是' : '否'
  if (typeof val === 'object') return '…'
  return String(val ?? '')
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function Progress({ value01 }: { value01: number }) {
  const p = clamp01(value01)
  return (
    <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.round(p * 100)}%`, backgroundColor: 'var(--color-accent)' }}
      />
    </span>
  )
}

function statEmoji(key: string, group?: string): string {
  if (group === '总资产') {
    if (key.includes('金币')) return '🪙'
    if (key.includes('银币')) return '🥈'
    if (key.includes('铜币')) return '🥉'
    return '💰'
  }
  if (group === '声望') return '⭐'
  if (key.includes('存活')) return '⏳'
  if (key.includes('位置') || key.includes('地点')) return '⌖'
  return '•'
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

export default function StatsPanel({ sessionId, variables: variablesOverride, items, onClose, style }: Props) {
  const { data: variables } = useQuery({
    queryKey: ['session-variables', sessionId],
    queryFn: () => sessionsApi.variables(sessionId),
    refetchInterval: 5000,
    enabled: !variablesOverride && sessionId !== 'test',
  })

  const allVars = (variablesOverride ?? variables) ?? {}

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
    <FloatingPanel
      id="stats"
      title="状态栏"
      icon="📊"
      titleHidden
      headerHidden
      closeOnOutsideClick={false}
      closeOnPanelClick
      onClose={onClose}
      style={style}
    >
      <div className="flex flex-col gap-3">
        {flat.length === 0 ? (
          <span className="text-xs text-[var(--color-text-muted)] italic">暂无状态</span>
        ) : (
          <>
            {Array.from(grouped.entries()).map(([group, children]) => {
              const nums = children
                .map(c => (typeof c.value === 'number' ? c.value : undefined))
                .filter((v): v is number => typeof v === 'number')
              const max = nums.length > 0 ? Math.max(...nums) : 0
              return (
              <div key={group} className="flex flex-col gap-1.5">
                <div className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                  {group}
                </div>
                <div className="flex flex-col gap-2">
                  {children.map(c => (
                    <div key={c.key} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{statEmoji(c.label, group)}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)', width: 64 }}>{c.label}</span>
                      {typeof c.value === 'number' && c.label.includes('生命') ? (
                        <Progress value01={c.value / 100} />
                      ) : (
                        <span className="flex-1" />
                      )}
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{formatValue(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )})}
            
            {singles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {singles.map(it => (
                  <div
                    key={it.key}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 bg-[var(--color-bg)] text-xs"
                    style={{ borderColor: 'var(--color-border)' }}
                    title={it.label}
                  >
                    {it.icon ? (
                      <span className="text-[10px] text-[var(--color-text-muted)]">{it.icon}</span>
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)]">{it.label}</span>
                    )}
                    <span className="font-mono text-[var(--color-accent)]">{formatValue(it.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </FloatingPanel>
  )
}

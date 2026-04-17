import { useQuery } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'
import { useDraggable } from '../hooks/useDraggable'
import type { StatItem } from '@/api/types'

interface Props {
  sessionId: string
  variables?: Record<string, unknown>
  items?: StatItem[]
  onClose: () => void
  style?: React.CSSProperties
  draggable?: boolean
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

function Progress({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const p = clamp01(value / max)
  // 未指定颜色时按比例自动着色
  const autoColor = p >= 0.8 ? '#4ade80' : p >= 0.6 ? '#fbbf24' : '#f87171'
  return (
    <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.round(p * 100)}%`, backgroundColor: color ?? autoColor }}
      />
    </span>
  )
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

export default function StatsPanel({ sessionId, variables: variablesOverride, items, onClose, style, draggable = false }: Props) {
  const { data: variables } = useQuery({
    queryKey: ['session-variables', sessionId],
    queryFn: () => sessionsApi.variables(sessionId),
    refetchInterval: 5000,
    enabled: !variablesOverride && sessionId !== 'test',
  })

  const { ref, offset, dragHandleProps } = useDraggable({ id: `stats-${sessionId}`, enabled: draggable })

  const allVars = (variablesOverride ?? variables) ?? {}

  const flat: Array<{ item: StatItem; label: string; value: unknown }> =
    items && items.length > 0
      ? items
        .map(it => ({
          item: it,
          label: it.label ?? it.key,
          value: (() => {
            const spec = parseKeySpec(it.key)
            const v = getByPath(allVars, spec.path)
            return v !== undefined ? v : spec.constant
          })(),
        }))
        .filter(it => it.value !== undefined)
      : []

  // label 中含 "." 的按第一段分组，其余为 singles
  const grouped = new Map<string, Array<{ item: StatItem; label: string; value: unknown }>>()
  const singles: Array<{ item: StatItem; label: string; value: unknown }> = []
  for (const it of flat) {
    const parts = it.label.split('.').filter(Boolean)
    if (parts.length >= 2) {
      const group = parts[0]
      const arr = grouped.get(group) ?? []
      arr.push({ ...it, label: parts[1] })
      grouped.set(group, arr)
    } else {
      singles.push(it)
    }
  }

  return (
    <div
      ref={ref}
      style={{
        ...style,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        width: 280,
        transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)`,
      }}
    >
      {/* Header */}
      <div
        {...dragHandleProps}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          ...dragHandleProps.style,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>📊 状态</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, padding: 2 }}
          aria-label="关闭"
        >×</button>
      </div>

      {/* Content */}
      <div style={{ padding: 12, overflowY: 'auto', maxHeight: 400 }}>
        <div className="flex flex-col gap-3">
          {flat.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)] italic">暂无状态</span>
          ) : (
            <>
              {Array.from(grouped.entries()).map(([group, children]) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
                    {group}
                  </div>
                  <div className="flex flex-col gap-2">
                    {children.map(({ item, label, value }) => (
                      <div key={item.key} className="flex items-center gap-2">
                        {item.icon && (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.icon}</span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)', width: 64 }}>{label}</span>
                        {item.display === 'bar' && typeof value === 'number' ? (
                          <Progress value={value} max={item.bar_max} color={item.bar_color} />
                        ) : (
                          <span className="flex-1" />
                        )}
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {singles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {singles.map(({ item, label, value }) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 bg-[var(--color-bg)] text-xs"
                      style={{ borderColor: 'var(--color-border)' }}
                      title={label}
                    >
                      {item.icon ? (
                        <span className="text-[10px] text-[var(--color-text-muted)]">{item.icon}</span>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
                      )}
                      <span className="font-mono text-[var(--color-accent)]">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

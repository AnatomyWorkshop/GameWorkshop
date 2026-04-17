import type { NarrativeToken } from '@/utils/tokenExtract'
import { useDraggable } from '../hooks/useDraggable'

interface Props {
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
  onClose?: () => void
  style?: React.CSSProperties
  draggable?: boolean
}

function groupVars(variables: Record<string, unknown>) {
  const groups: Record<string, Array<{ key: string; label: string; value: unknown }>> = {}
  for (const [k, v] of Object.entries(variables)) {
    const dot = k.indexOf('.')
    const group = dot > -1 ? k.slice(0, dot) : '基础'
    const label = dot > -1 ? k.slice(dot + 1) : k
    if (!groups[group]) groups[group] = []
    groups[group].push({ key: k, label, value: v })
  }
  return groups
}

export default function CharacterSheet({ variables, onClose, style, draggable = false }: Props) {
  const groups = groupVars(variables)
  const groupNames = Object.keys(groups)
  const { ref, offset, dragHandleProps } = useDraggable({ id: 'character_sheet', enabled: draggable })

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
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>📋 角色属性</span>
        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, padding: 2 }}
            aria-label="关闭"
          >×</button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 12, overflowY: 'auto', maxHeight: 400 }}>
        {groupNames.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无变量数据</p>
        ) : (
          <div className="space-y-3">
            {groupNames.map(group => (
              <div key={group}>
                <p className="text-[10px] uppercase tracking-wider mb-1.5 font-medium"
                   style={{ color: 'var(--color-text-muted)' }}>
                  {group}
                </p>
                <div className="space-y-1">
                  {groups[group].map(({ key, label, value }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

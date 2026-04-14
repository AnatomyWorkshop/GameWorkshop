import type { NarrativeToken } from '@/utils/tokenExtract'

interface Props {
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
}

/** 按 key 前缀（第一个 '.' 之前）分组变量 */
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

export default function CharacterSheet({ variables }: Props) {
  const groups = groupVars(variables)
  const groupNames = Object.keys(groups)

  if (groupNames.length === 0) {
    return (
      <p className="text-xs px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
        暂无变量数据
      </p>
    )
  }

  return (
    <div className="space-y-3 p-3">
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
  )
}

import type { NarrativeToken } from '@/utils/tokenExtract'

interface Props {
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
  displayVars?: string[]
}

function getByPath(vars: Record<string, unknown>, path: string): unknown {
  if (path in vars) return vars[path]
  const parts = path.split('.').filter(Boolean)
  let cur: any = vars
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else return undefined
  }
  return cur
}

function labelFromPath(path: string): string {
  const parts = path.split('.')
  return parts[parts.length - 1]
}

export default function PhoneStatus({ variables, tokens, displayVars }: Props) {
  const phoneTokens = tokens.filter(t => t.placement?.includes('panel:phone'))

  // 如果声明了 display_vars，只展示指定路径；否则展示全部变量
  const varEntries: Array<{ path: string; label: string; value: unknown }> =
    displayVars && displayVars.length > 0
      ? displayVars
          .map(path => ({ path, label: labelFromPath(path), value: getByPath(variables, path) }))
          .filter(e => e.value !== undefined)
      : Object.entries(variables).map(([k, v]) => ({ path: k, label: k, value: v }))

  return (
    <div className="p-3 space-y-3">
      {/* 手机状态栏风格顶部 */}
      <div className="flex items-center justify-between text-[10px]"
           style={{ color: 'var(--color-text-muted)' }}>
        <span>📱</span>
        <span>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Token 内容（叙事提取） */}
      {phoneTokens.length > 0 && (
        <div className="space-y-1.5">
          {phoneTokens.map((t, i) => (
            <div key={i} className="text-xs rounded-lg px-2 py-1.5"
                 style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {t.text}
            </div>
          ))}
        </div>
      )}

      {/* 变量数据 */}
      {varEntries.length > 0 && (
        <div className="space-y-1 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
          {varEntries.map(e => (
            <div key={e.path} className="flex items-center justify-between gap-2">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{e.label}</span>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                {String(e.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {phoneTokens.length === 0 && varEntries.length === 0 && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
          暂无数据
        </p>
      )}
    </div>
  )
}

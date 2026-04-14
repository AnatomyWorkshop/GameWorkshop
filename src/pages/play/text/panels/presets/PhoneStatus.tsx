import type { NarrativeToken } from '@/utils/tokenExtract'

interface Props {
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
}

export default function PhoneStatus({ variables, tokens }: Props) {
  // 展示 placement 包含 "panel:phone" 的 tokens
  const phoneTokens = tokens.filter(t => t.placement?.includes('panel:phone'))

  // 展示所有变量（手机面板展示全部，创作者通过 token_extract_rules 控制内容）
  const varEntries = Object.entries(variables)

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
          {varEntries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                {String(v)}
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

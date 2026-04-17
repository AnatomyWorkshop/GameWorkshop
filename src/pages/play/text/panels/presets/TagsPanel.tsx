import type { NarrativeTagItem } from '@/api/types'
import type { NarrativeToken } from '@/utils/tokenExtract'

interface Props {
  items: NarrativeTagItem[]
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
  onClose: () => void
  style?: React.CSSProperties
  mode?: 'topbar' | 'panel'
}

function getTagValue(
  item: NarrativeTagItem,
  variables: Record<string, unknown>,
  tokens: NarrativeToken[],
): string {
  if (item.source === 'var') {
    const v = variables[item.key ?? '']
    return v != null ? String(v) : '—'
  }
  // source === 'token'
  const match = tokens.find(t => t.type === (item.token_type ?? item.id))
  return match ? match.text : '—'
}



export default function TagsPanel({ items, variables, tokens, onClose, style, mode = 'topbar' }: Props) {
  if (!items || items.length === 0) return null

  return (
    <div
      className="fixed left-0 right-0 z-30 pointer-events-none"
      style={{ top: '44px' }}
    >
      <div className="w-full max-w-[720px] mx-auto pointer-events-auto">
        <div
          className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-none cursor-pointer rounded-none border-b"
          style={{
            height: 44,
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-topbar-bg)',
          }}
          onClick={onClose}
          role="button"
          aria-label="关闭叙事标签"
          title="点击关闭"
        >
          {items.map(item => {
            const value = getTagValue(item, variables, tokens)
            let color = 'var(--color-text)'
            if (item.style === 'gold') color = 'var(--color-em-gold)'
            if (item.style === 'info') color = 'var(--color-em-info)'
            if (item.style === 'muted') color = 'var(--color-text-muted)'

            return (
              <span
                key={item.id}
                className="flex items-center gap-1 shrink-0 text-xs font-medium"
                style={{ color }}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{value}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

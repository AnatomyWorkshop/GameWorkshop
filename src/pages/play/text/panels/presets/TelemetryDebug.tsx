interface Props {
  floorCount: number
  tokenUsed?: number
  modelLabel?: string
  latencyMs?: number
}

export default function TelemetryDebug({ floorCount, tokenUsed, modelLabel, latencyMs }: Props) {
  const rows: Array<{ label: string; value: string }> = [
    { label: '楼层数', value: String(floorCount) },
    { label: 'Token 消耗', value: tokenUsed != null ? String(tokenUsed) : '—' },
    { label: '模型', value: modelLabel || '云端默认' },
    { label: '延迟', value: latencyMs != null ? `${latencyMs} ms` : '—' },
  ]

  return (
    <div className="p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider mb-2 font-medium"
         style={{ color: 'var(--color-text-muted)' }}>
        调试信息
      </p>
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          <span className="text-xs font-medium tabular-nums font-mono" style={{ color: 'var(--color-text)' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

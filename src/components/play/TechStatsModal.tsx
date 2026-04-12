import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi } from '@/api/sessions'
import { X, Brain, Cpu } from 'lucide-react'
import { getRuntimeConfig } from '@/stores/runtime'

interface Props {
  sessionId: string
  floorCount?: number
  lastTokenUsed?: number
  lastError?: string
  onClose: () => void
}

interface Memory {
  id: string
  content: string
  type: string
  importance: number
  fact_key: string
  source_floor: number
  deprecated: boolean
  created_at: string
}

type Tab = 'stats' | 'memory'

const TYPE_LABEL: Record<string, string> = {
  summary: '摘要',
  fact: '事实',
  character: '角色',
  event: '事件',
}

export default function TechStatsModal({ sessionId, floorCount, lastTokenUsed, lastError, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const { model_label } = getRuntimeConfig()

  const { data: memories, isLoading } = useQuery({
    queryKey: ['session-memories', sessionId],
    queryFn: () => sessionsApi.memories(sessionId) as Promise<Memory[]>,
    enabled: tab === 'memory',
  })

  const activeMemories = memories?.filter(m => !m.deprecated) ?? []

  return (
    <div className="px-3 pb-3">
      <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab('stats')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === 'stats' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              <Cpu size={12} /> 技术信息
            </button>
            <button
              type="button"
              onClick={() => setTab('memory')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === 'memory' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              <Brain size={12} /> 记忆
              {activeMemories.length > 0 && (
                <span className="ml-1 text-[10px] bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-1.5 rounded-full">
                  {activeMemories.length}
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {tab === 'stats' && (
            <div className="space-y-3">
              <Row label="楼层数" value={String(floorCount ?? 0)} />
              <Row label="当前模型" value={model_label || '云端默认'} />
              <Row label="最近 Token" value={String(lastTokenUsed ?? 0)} />
              {lastError ? (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">最近错误</p>
                  <p className="text-xs text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                    {lastError}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {tab === 'memory' && (
            <div>
              {isLoading && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">加载中…</p>
              )}
              {!isLoading && activeMemories.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">暂无记忆条目</p>
              )}
              {activeMemories.length > 0 && (
                <div className="space-y-2">
                  {activeMemories.map(m => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                          {TYPE_LABEL[m.type] ?? m.type}
                        </span>
                        {m.fact_key && (
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{m.fact_key}</span>
                        )}
                        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">第 {m.source_floor} 楼</span>
                      </div>
                      <p className="text-xs text-[var(--color-text)] leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-mono text-xs text-[var(--color-accent)]">{value}</span>
    </div>
  )
}

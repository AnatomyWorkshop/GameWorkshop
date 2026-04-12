import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BarChart2, Archive, MoreHorizontal, ArrowLeft, Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Drawer } from 'vaul'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorldbook } from '@/queries/games'
import { useSessionList, useCreateSession } from '@/queries/sessions'
import { sessionsApi } from '@/api/sessions'
import { getRuntimeConfig, setRuntimeConfig, type RuntimeConfig, type SlotRuntimeConfig } from '@/stores/runtime'
import type { Session, WorldbookEntry } from '@/api/types'

interface Props {
  title: string
  sessionId: string
  gameId: string
  onBack: () => void
  onStatsToggle: () => void
}

// ─── WorldbookDrawer ──────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['总纲', '区域', '势力', '角色', '事件']

function entryTitle(entry: WorldbookEntry): string {
  if (entry.comment) {
    const parts = entry.comment.split('/')
    return parts[parts.length - 1].trim() || entry.keys[0] || '词条'
  }
  return entry.keys[0] || '词条'
}

function WorldbookEntry({ entry }: { entry: WorldbookEntry }) {
  const [expanded, setExpanded] = useState(false)
  const title = entryTitle(entry)
  const previewKeys = entry.keys.slice(0, 3)
  const moreKeys = entry.keys.length - 3

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-[var(--color-accent)]/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="mt-0.5 shrink-0 text-[var(--color-text-muted)]">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{title}</span>
            {entry.constant && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">常驻</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {previewKeys.map(k => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-text-muted)]">{k}</span>
            ))}
            {moreKeys > 0 && (
              <span className="text-[10px] text-[var(--color-text-muted)]">+{moreKeys}</span>
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap mt-2">{entry.content}</p>
        </div>
      )}
    </div>
  )
}

function WorldbookDrawer({ gameId }: { gameId: string }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('全部')
  const { data: rawEntries = [] } = useWorldbook(gameId, open)

  // filter out player_visible=false entries
  const entries = rawEntries.filter(e => e.player_visible !== false)

  // build category tabs
  const categoryCounts: Record<string, number> = { '全部': entries.length }
  for (const e of entries) {
    const cat = e.display_category ?? '其他'
    if (cat !== '系统') categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }
  const tabs = ['全部', ...CATEGORY_ORDER.filter(c => categoryCounts[c] > 0),
    ...Object.keys(categoryCounts).filter(c => c !== '全部' && !CATEGORY_ORDER.includes(c) && c !== '系统')]

  const visible = activeTab === '全部'
    ? entries
    : entries.filter(e => (e.display_category ?? '其他') === activeTab)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger asChild>
        <button
          className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-30"
          aria-label="设定/世界书"
          disabled={!gameId}
          title={!gameId ? '需要后端返回 game_id 才能查看世界书' : undefined}
        >
          <BookOpen size={18} />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)] shrink-0">
            <Drawer.Title className="font-semibold text-sm mb-3">世界书</Drawer.Title>
            <Drawer.Description className="sr-only">查看游戏世界书词条</Drawer.Description>
            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tab}{tab !== '全部' ? '' : ` ${entries.length}`}
                  {tab !== '全部' && categoryCounts[tab] ? ` ${categoryCounts[tab]}` : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visible.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">暂无词条</p>
            )}
            {visible.map(e => (
              <WorldbookEntry key={e.id} entry={e} />
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ─── ArchiveDrawer ────────────────────────────────────────────────────────────

function ArchiveDrawer({ gameId, currentSessionId }: { gameId: string; currentSessionId: string }) {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: sessions = [], refetch } = useSessionList(gameId)
  const create = useCreateSession()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const deleteMut = useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: (_, id) => {
      refetch()
      qc.invalidateQueries({ queryKey: ['sessions', gameId] })
      if (id === currentSessionId) {
        setOpen(false)
        nav(`/games/${gameId}`, { replace: true })
      }
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => sessionsApi.rename(id, title),
    onSuccess: () => { refetch(); setRenamingId(null) },
  })

  function switchSession(id: string) {
    setOpen(false)
    if (id !== currentSessionId) nav(`/play/${id}`, { replace: true })
  }

  async function handleNew() {
    const result = await create.mutateAsync({ gameId })
    setOpen(false)
    nav(`/play/${result.session_id}`)
  }

  function startRename(s: Session) {
    setRenamingId(s.id)
    setRenameValue(s.title || '')
  }

  function commitRename(id: string) {
    if (renameValue.trim()) renameMut.mutate({ id, title: renameValue.trim() })
    else setRenamingId(null)
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger asChild>
        <button className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" aria-label="存档">
          <Archive size={18} />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <Drawer.Title className="font-semibold text-sm">存档</Drawer.Title>
            <Drawer.Description className="sr-only">查看与管理当前游戏的存档</Drawer.Description>
            <button
              onClick={handleNew}
              disabled={create.isPending}
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              <Plus size={14} /> 新存档
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sessions.length === 0 && <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">暂无存档</p>}
            {sessions.map(s => (
              <div
                key={s.id}
                className={`flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-accent)]/5 transition-colors ${s.id === currentSessionId ? 'border-l-2 border-[var(--color-accent)]' : ''}`}
              >
                {renamingId === s.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      autoFocus
                      className="flex-1 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 outline-none"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(s.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                    <button onClick={() => commitRename(s.id)} className="text-[var(--color-accent)]"><Check size={14} /></button>
                    <button onClick={() => setRenamingId(null)} className="text-[var(--color-text-muted)]"><X size={14} /></button>
                  </div>
                ) : (
                  <button className="flex-1 text-left" onClick={() => switchSession(s.id)}>
                    <p className={`text-sm truncate ${s.id === currentSessionId ? 'text-[var(--color-accent)]' : ''}`}>
                      {s.title || '未命名存档'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {new Date(s.updated_at).toLocaleDateString('zh-CN')} · {s.floor_count} 楼
                    </p>
                  </button>
                )}
                {renamingId !== s.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startRename(s)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" aria-label="重命名">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`删除存档"${s.title || '未命名存档'}"？`)) deleteMut.mutate(s.id) }}
                      className="p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                      aria-label="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TextSessionTopBar({ title, sessionId, gameId, onBack, onStatsToggle }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [cfg, setCfg] = useState<RuntimeConfig>(getRuntimeConfig)
  const [saved, setSaved] = useState(false)
  const nav = useNavigate()
  const { model_label } = getRuntimeConfig()

  function handleSave() {
    setRuntimeConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function slotValue(slot: 'narrator' | 'director' | 'verifier' | 'memory'): SlotRuntimeConfig {
    return cfg.slots?.[slot] ?? {}
  }

  function updateSlot(slot: 'narrator' | 'director' | 'verifier' | 'memory', patch: Partial<SlotRuntimeConfig>) {
    setCfg(c => ({
      ...c,
      slots: {
        ...(c.slots ?? {}),
        [slot]: { ...(c.slots?.[slot] ?? {}), ...patch },
      },
    }))
  }

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b shrink-0"
         style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-topbar-bg)' }}>
      <button
        className="p-1.5 rounded transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        onClick={onBack}
        aria-label="返回"
      >
        <ArrowLeft size={18} />
      </button>

      <span className="flex-1 text-center font-medium text-sm truncate px-2 min-w-0"
            style={{ color: 'var(--color-text)' }}>{title}</span>

      <WorldbookDrawer gameId={gameId} />

      {/* Stats toggle — inline overlay in MessageList */}
      <button
        className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        onClick={onStatsToggle}
        aria-label="游戏状态"
      >
        <BarChart2 size={18} />
      </button>

      <ArchiveDrawer gameId={gameId} currentSessionId={sessionId} />

      <div className="relative">
        <button
          className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => setMoreOpen(o => !o)}
          aria-label="更多"
        >
          <MoreHorizontal size={18} />
        </button>
        {moreOpen && (
          <div className="absolute top-full right-0 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-20 py-1">
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-accent)]/10 transition-colors"
              onClick={() => { setConfigOpen(true); setMoreOpen(false) }}
            >
              <span className="text-[var(--color-text-muted)] text-xs block">当前模型</span>
              <span className="truncate">{model_label || '云端默认'}</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent)]/10 transition-colors"
              onClick={() => { setMoreOpen(false); nav('/library') }}
            >
              去个人库
            </button>
          </div>
        )}
      </div>

      <Drawer.Root open={configOpen} onOpenChange={setConfigOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
              <Drawer.Title className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                模型配置
              </Drawer.Title>
              <Drawer.Description className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                配置当前会话的默认模型（后续可扩展为按引擎组件分配不同模型）
              </Drawer.Description>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>API Base URL</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                  placeholder="https://api.openai.com/v1"
                  value={cfg.base_url ?? ''}
                  onChange={e => setCfg(c => ({ ...c, base_url: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>API Key</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                  placeholder="sk-..."
                  value={cfg.api_key ?? ''}
                  onChange={e => setCfg(c => ({ ...c, api_key: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>模型</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                  placeholder="gpt-4o / glm-4-flash / …"
                  value={cfg.model_label ?? ''}
                  onChange={e => setCfg(c => ({ ...c, model_label: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  高级：按引擎组件指定模型
                </p>
                <div className="space-y-3">
                  {(['narrator', 'director', 'verifier', 'memory'] as const).map(slot => {
                    const v = slotValue(slot)
                    const title = slot === 'narrator' ? '叙事者' : slot === 'director' ? '导演' : slot === 'verifier' ? '校验器' : '记忆'
                    return (
                      <div key={slot} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{title}</span>
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{slot}</span>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                            placeholder="API Base URL（可空，继承默认）"
                            value={v.base_url ?? ''}
                            onChange={e => updateSlot(slot, { base_url: e.target.value })}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                          />
                          <input
                            type="password"
                            className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                            placeholder="API Key（可空，继承默认）"
                            value={v.api_key ?? ''}
                            onChange={e => updateSlot(slot, { api_key: e.target.value })}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                          />
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                            placeholder="模型（可空，继承默认）"
                            value={v.model_label ?? ''}
                            onChange={e => updateSlot(slot, { model_label: e.target.value })}
                            onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                onClick={handleSave}
              >
                {saved ? '已保存' : '保存'}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArrowLeft, Bug, MoreHorizontal } from 'lucide-react'
import { Drawer } from 'vaul'
import { useQueryClient } from '@tanstack/react-query'
import { getRuntimeConfig } from '@/stores/runtime'
import PanelSwitcherMenu from './PanelSwitcherMenu'
import type { FloatingPanelDecl } from '@/api/types'
import { useWorldbook } from '@/queries/games'
import { usePromptPreview } from '@/queries/sessions'
import { gamesApi } from '@/api/games'
import { gameKeys } from '@/queries/games'
import { useApiTraceStore } from '@/stores/apiTrace'

interface Props {
  title: string
  subtitle?: string
  sessionId: string
  gameId: string
  onBack: () => void
  floatingPanels?: FloatingPanelDecl[]
  onTogglePanel: (id: string) => void
  isPanelOpen: (id: string) => boolean
  branchId?: string
  branches?: string[]
  onBranchChange?: (branchId: string) => void
}

export default function TextPlayTopBar({
  title,
  subtitle,
  sessionId,
  gameId,
  onBack,
  floatingPanels = [],
  onTogglePanel,
  isPanelOpen,
  branchId,
  branches,
  onBranchChange,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [panelsOpen, setPanelsOpen] = useState(false)
  const [titleVisible, setTitleVisible] = useState(true)
  const [worldbookOpen, setWorldbookOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [wbQuery, setWbQuery] = useState('')
  const [wbSort, setWbSort] = useState<'category' | 'key'>('category')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState('')
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newKeys, setNewKeys] = useState('')
  const [newContent, setNewContent] = useState('')
  const nav = useNavigate()
  const qc = useQueryClient()
  const runtimeCfg = getRuntimeConfig()
  const { model_label } = runtimeCfg

  const worldbookQ = useWorldbook(gameId, worldbookOpen && !!gameId && sessionId !== 'test')
  const promptPreviewQ = usePromptPreview(sessionId, debugOpen && sessionId !== 'test')
  const apiTraceItems = useApiTraceStore((s) => s.items)

  const worldbookEntries = useMemo(() => {
    const q = wbQuery.trim().toLowerCase()
    const entries = worldbookQ.data ?? []
    if (!q) return entries
    return entries.filter((e) => {
      const keys = (e.keys ?? []).join(' ').toLowerCase()
      const cat = (e.display_category ?? '').toLowerCase()
      const comment = (e.comment ?? '').toLowerCase()
      const content = (e.content ?? '').toLowerCase()
      return keys.includes(q) || cat.includes(q) || comment.includes(q) || content.includes(q)
    })
  }, [worldbookQ.data, wbQuery])

  const worldbookGroups = useMemo(() => {
    const entries = worldbookEntries
    const byCat = new Map<string, typeof entries>()
    for (const e of entries) {
      const cat = (e.display_category ?? '未分类') || '未分类'
      const list = byCat.get(cat)
      if (list) list.push(e)
      else byCat.set(cat, [e])
    }
    const groups = Array.from(byCat.entries())
    if (wbSort === 'key') {
      for (const [, list] of groups) {
        list.sort((a, b) => (a.keys?.[0] ?? '').localeCompare(b.keys?.[0] ?? ''))
      }
    }
    groups.sort((a, b) => a[0].localeCompare(b[0]))
    return groups
  }, [worldbookEntries, wbSort])

  function openSettings() {
    setMoreOpen(false)
    window.dispatchEvent(new CustomEvent('gw:settings'))
  }

  return (
    <div data-overlay-exempt="true">
      <div
        className="w-full max-w-[720px] mx-auto flex items-center gap-1 px-2 py-2 border-b"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-topbar-bg)',
        }}
      >
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

        <button
          type="button"
          className="flex-1 relative text-center font-semibold text-[15px] truncate px-2 min-w-0 select-none"
          style={{ color: 'var(--color-text)' }}
          onClick={() => setTitleVisible(v => !v)}
          aria-label="切换标题显示"
          title="点击切换显示/隐藏"
        >
          <span className={`transition-opacity duration-200 ${titleVisible ? 'opacity-100' : 'opacity-0'}`}>{title}</span>
          {!titleVisible && (
            <span className="absolute inset-0 flex items-center justify-center text-sm opacity-60" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle ?? ''}
            </span>
          )}
        </button>

        <PanelSwitcherMenu
          floatingPanels={floatingPanels}
          onTogglePanel={onTogglePanel}
          isPanelOpen={isPanelOpen}
          open={panelsOpen}
          onOpenChange={(o) => {
            if (o) setMoreOpen(false)
            setPanelsOpen(o)
          }}
        />

        {/* topbar 面板图标按钮已移入 PanelSwitcherMenu 下拉菜单，此处不再渲染独立按钮 */}

        <button
          type="button"
          className="p-1.5 rounded transition-colors"
          style={{ color: worldbookOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          aria-label="世界书"
          title="世界书"
          onClick={() => {
            setMoreOpen(false)
            setPanelsOpen(false)
            setDebugOpen(false)
            setWorldbookOpen(true)
          }}
        >
          <span className="text-sm leading-none">📖</span>
        </button>

        <button
          type="button"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="存档"
          title="存档"
          onClick={() => {
            setMoreOpen(false)
            setPanelsOpen(false)
            setSaveOpen(true)
          }}
        >
          <Archive size={18} />
        </button>

        <button
          type="button"
          className="p-1.5 rounded transition-colors"
          style={{ color: debugOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          aria-label="Debug"
          title="Debug"
          onClick={() => {
            setMoreOpen(false)
            setPanelsOpen(false)
            setWorldbookOpen(false)
            setDebugOpen(true)
          }}
        >
          <Bug size={18} />
        </button>

        {/* 更多选项 */}
        <div className="relative" data-overlay-exempt="true" style={{ zIndex: 70 }}>
          <button
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={() => {
              setPanelsOpen(false)
              setMoreOpen(o => !o)
            }}
            aria-label="更多"
          >
            <MoreHorizontal size={18} />
          </button>
          {moreOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-[70] py-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-accent)]/10 transition-colors"
                onClick={openSettings}
              >
                <span className="text-[var(--color-text-muted)] text-xs block">当前模型</span>
                <span className="truncate" style={{ color: 'var(--color-text)' }}>{model_label || '云端默认'}</span>
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

        <Drawer.Root open={worldbookOpen} onOpenChange={(o) => { setWorldbookOpen(o); if (!o) { setWbQuery(''); setEditingId(null); setDraftContent('') } }} direction="right">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40" />
            <Drawer.Content
              className="fixed right-0 top-12 bottom-0 w-80 z-50 flex flex-col border-l border-[var(--color-border)]"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                <Drawer.Title className="font-semibold text-sm">世界书</Drawer.Title>
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto gw-chat-scroll">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-md text-xs border transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    disabled={creating}
                    onClick={async () => {
                      const content = newContent.trim()
                      const keys = newKeys.split(/[,，]/).map(s => s.trim()).filter(Boolean)
                      if (!content) return
                      setCreating(true)
                      try {
                        await gamesApi.createWorldbookEntry(gameId, { content, keys, enabled: true, priority: 0 })
                        await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                        setNewKeys('')
                        setNewContent('')
                      } finally {
                        setCreating(false)
                      }
                    }}
                  >
                    新增词条
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-md text-xs border transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    onClick={async () => {
                      await gamesApi.resetWorldbookOverrides(gameId)
                      await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                    }}
                  >
                    重置覆盖
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    placeholder="新增词条关键词（逗号分隔）"
                    value={newKeys}
                    onChange={(e) => setNewKeys(e.target.value)}
                  />
                  <textarea
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    rows={4}
                    placeholder="新增词条内容"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    placeholder="搜索词条 / 分类 / 内容…"
                    value={wbQuery}
                    onChange={(e) => setWbQuery(e.target.value)}
                  />
                  <select
                    className="px-2 py-2 text-xs rounded-lg border outline-none"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    value={wbSort}
                    onChange={(e) => setWbSort(e.target.value as typeof wbSort)}
                  >
                    <option value="category">按分类</option>
                    <option value="key">按关键词</option>
                  </select>
                </div>

                {sessionId === 'test' ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Mock 页面暂无世界书数据
                  </div>
                ) : worldbookQ.isLoading ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    加载中…
                  </div>
                ) : worldbookQ.isError ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    获取失败（当前为可编辑世界书，需要后端启用 /users/:id/library/:game_id/worldbook）
                  </div>
                ) : worldbookGroups.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    暂无词条
                  </div>
                ) : (
                  <div className="space-y-3">
                    {worldbookGroups.map(([cat, entries]) => (
                      <div key={cat} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="px-3 py-2 text-xs" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                          {cat} <span className="opacity-60">({entries.length})</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                          {entries.map((e) => (
                            <details key={e.id} className="px-3 py-2">
                              <summary className="cursor-pointer select-none">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                      {(e.keys && e.keys.length > 0) ? e.keys.join(' / ') : '（未命名词条）'}
                                    </div>
                                    {e.comment && (
                                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                        {e.comment}
                                      </div>
                                    )}
                                    <div className="text-[11px] mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                                      <span>enabled: {e.enabled === false ? 'false' : 'true'}</span>
                                      <span>priority: {e.priority ?? 0}</span>
                                      {e.is_overridden && <span>override</span>}
                                      {e.is_new && <span>new</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-2 py-1 rounded-md text-[11px] border"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                                    onClick={(ev) => {
                                      ev.preventDefault()
                                      ev.stopPropagation()
                                      setEditingId(e.id)
                                      setDraftContent(e.content ?? '')
                                    }}
                                  >
                                    编辑
                                  </button>
                                </div>
                              </summary>

                              <div className="mt-2 flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  <input
                                    type="checkbox"
                                    checked={e.enabled !== false}
                                    onChange={async (ev) => {
                                      await gamesApi.patchWorldbookEntry(gameId, e.id, { enabled: ev.target.checked })
                                      await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                                    }}
                                  />
                                  启用
                                </label>
                                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  priority
                                  <input
                                    type="number"
                                    className="w-20 px-2 py-1 rounded-md border text-xs outline-none"
                                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                                    defaultValue={e.priority ?? 0}
                                    onBlur={async (ev) => {
                                      const v = Number(ev.target.value || 0)
                                      await gamesApi.patchWorldbookEntry(gameId, e.id, { priority: v })
                                      await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                                    }}
                                  />
                                </label>
                                {(e.is_overridden || e.is_new) && (
                                  <button
                                    type="button"
                                    className="ml-auto px-2 py-1 rounded-md text-[11px] border"
                                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                                    onClick={async () => {
                                      await gamesApi.deleteWorldbookEntry(gameId, e.id)
                                      await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                                    }}
                                  >
                                    {e.is_new ? '删除' : '恢复'}
                                  </button>
                                )}
                              </div>

                              {editingId === e.id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                                    rows={8}
                                    value={draftContent}
                                    onChange={(ev) => setDraftContent(ev.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className="flex-1 py-2 rounded-lg border text-sm"
                                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                      onClick={() => { setEditingId(null); setDraftContent('') }}
                                      disabled={savingEntryId === e.id}
                                    >
                                      取消
                                    </button>
                                    <button
                                      type="button"
                                      className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                                      disabled={savingEntryId === e.id}
                                      onClick={async () => {
                                        setSavingEntryId(e.id)
                                        try {
                                          await gamesApi.patchWorldbookEntry(gameId, e.id, { content: draftContent })
                                          await qc.invalidateQueries({ queryKey: gameKeys.worldbook(gameId) })
                                          setEditingId(null)
                                          setDraftContent('')
                                        } finally {
                                          setSavingEntryId(null)
                                        }
                                      }}
                                    >
                                      保存
                                    </button>
                                  </div>
                                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                    当前为匿名编辑（user_id=anonymous），后续接入登录后会写入个人覆盖表
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs mt-2 whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                                  {e.content}
                                </div>
                              )}
                            </details>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Drawer.Root open={debugOpen} onOpenChange={setDebugOpen} direction="right">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40" />
            <Drawer.Content
              className="fixed right-0 top-12 bottom-0 w-80 z-50 flex flex-col border-l border-[var(--color-border)]"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                <Drawer.Title className="font-semibold text-sm">Debug</Drawer.Title>
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto gw-chat-scroll">
                <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>游玩过程请求路径（最近 50 条）</div>
                  <div className="space-y-1">
                    {apiTraceItems.slice(0, 12).map((it) => (
                      <div key={it.id} className="text-[11px] flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                        <span className="opacity-70 w-10">{it.method}</span>
                        <span className="truncate flex-1" style={{ color: 'var(--color-text-muted)' }}>{it.url}</span>
                        <span className="opacity-70 w-10 text-right">{it.status ?? ''}</span>
                      </div>
                    ))}
                    {apiTraceItems.length === 0 && (
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>暂无记录</div>
                    )}
                  </div>
                </div>

                {sessionId === 'test' ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Mock 页面暂无 Debug 数据
                  </div>
                ) : promptPreviewQ.isLoading ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    加载中…
                  </div>
                ) : promptPreviewQ.isError ? (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    获取失败（可能是 session 已失效，或后端未开启 prompt-preview）
                  </div>
                ) : promptPreviewQ.data ? (
                  <>
                    <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                        est_tokens: <span style={{ color: 'var(--color-text-muted)' }}>{promptPreviewQ.data.est_tokens}</span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                        worldbook_hits: <span style={{ color: 'var(--color-text-muted)' }}>{promptPreviewQ.data.worldbook_hits}</span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                        preset_hits: <span style={{ color: 'var(--color-text-muted)' }}>{promptPreviewQ.data.preset_hits}</span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                        block_count: <span style={{ color: 'var(--color-text-muted)' }}>{promptPreviewQ.data.block_count}</span>
                      </div>
                    </div>

                    <button
                      className="w-full py-2 rounded-lg border text-sm transition-colors hover:border-[var(--color-text-muted)]"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      onClick={async () => {
                        const text = JSON.stringify(promptPreviewQ.data, null, 2)
                        await navigator.clipboard.writeText(text)
                      }}
                    >
                      复制 Prompt Preview JSON
                    </button>

                    <details className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <summary className="cursor-pointer select-none text-sm" style={{ color: 'var(--color-text)' }}>
                        显示详细 Prompt 内容
                      </summary>
                      <div className="space-y-2 mt-3">
                        {promptPreviewQ.data.messages.map((m, idx) => (
                          <div key={idx} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                            <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                              {m.role}
                            </div>
                            <div className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                ) : (
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <Drawer.Root open={saveOpen} onOpenChange={setSaveOpen} direction="right">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40" />
            <Drawer.Content
              className="fixed right-0 top-12 bottom-0 w-80 z-50 flex flex-col border-l border-[var(--color-border)]"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                <Drawer.Title className="font-semibold text-sm">存档</Drawer.Title>
              </div>
              {branchId && branches && onBranchChange && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Branch</span>
                    <select
                      value={branchId}
                      onChange={(e) => onBranchChange(e.target.value)}
                      className="px-2 py-1 rounded border bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                占位：后续在这里做存档列表 / 导出 / 导入
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </div>
  )
}

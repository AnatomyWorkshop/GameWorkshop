import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Upload, Trash2, Download, Loader2 } from 'lucide-react'
import { Drawer } from 'vaul'
import { getRuntimeConfig, setRuntimeConfig, type RuntimeConfig } from '@/stores/runtime'
import { sessionsApi } from '@/api/sessions'
import type { Game } from '@/api/types'

const LIB_KEY = 'gw_library'

interface LibItem {
  game: Game
  source: 'catalog' | 'local'
  importedAt: string
  lastPlayedAt?: string
}

function getLibrary(): LibItem[] {
  try { return JSON.parse(localStorage.getItem(LIB_KEY) ?? '[]') } catch { return [] }
}

function removeFromLibrary(gameId: string) {
  const items = getLibrary().filter(i => i.game.id !== gameId)
  localStorage.setItem(LIB_KEY, JSON.stringify(items))
}

function addToLibrary(game: Game, source: 'catalog' | 'local') {
  const items = getLibrary().filter(i => i.game.id !== game.id)
  items.unshift({ game, source, importedAt: new Date().toISOString() })
  localStorage.setItem(LIB_KEY, JSON.stringify(items))
}

function updateLastPlayed(gameId: string) {
  const items = getLibrary()
  const item = items.find(i => i.game.id === gameId)
  if (item) {
    item.lastPlayedAt = new Date().toISOString()
    localStorage.setItem(LIB_KEY, JSON.stringify(items))
  }
}

function fallbackGradient(id: string) {
  const h = id.charCodeAt(0) * 137 % 360
  return `linear-gradient(135deg, hsl(${h},60%,40%), hsl(${(h + 60) % 360},60%,30%))`
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// ── LLM 配置抽屉 ──────────────────────────────────────────────────────────────

function ConfigDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [cfg, setCfg] = useState<RuntimeConfig>(getRuntimeConfig)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setRuntimeConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col"
          style={{ background: 'var(--color-surface)' }}>
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
            <Drawer.Title className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              运行配置
            </Drawer.Title>
            <Drawer.Description className="sr-only">配置模型与运行参数</Drawer.Description>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              留空则使用云端公用模型（内测免费）
            </p>

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
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function MyLibraryPage() {
  const nav = useNavigate()
  const [items, setItems] = useState<LibItem[]>(getLibrary)
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 点击游戏条目 → 继续游玩（最近存档）或自动创建新存档
  const handlePlay = useCallback(async (game: Game) => {
    if (navigatingId) return
    setNavigatingId(game.id)
    try {
      const sessions = await sessionsApi.list(game.id)
      if (sessions && sessions.length > 0) {
        // 按 updated_at 降序取最新
        const sorted = [...sessions].sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        updateLastPlayed(game.id)
        setItems(getLibrary())
        nav(`/play/${sorted[0].id}`)
      } else {
        // 无存档，自动创建
        const res = await sessionsApi.create(game.id)
        updateLastPlayed(game.id)
        setItems(getLibrary())
        nav(`/play/${res.session_id}`)
      }
    } catch {
      // 如果 API 失败（比如后端未启动），尝试跳详情页
      nav(`/games/${game.slug}`)
    } finally {
      setNavigatingId(null)
    }
  }, [navigatingId, nav])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportError('')
    setImporting(true)

    try {
      if (file.name.endsWith('.png')) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/create/cards/import', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.code !== 0) throw new Error(json.error ?? 'import failed')
        const d = json.data
        if (d.type === 'gw_game') {
          const game: Game = {
            id: d.template_id,
            slug: d.slug,
            title: d.title,
            type: 'text',
            short_desc: '',
            notes: '',
            cover_url: `/covers/${d.slug}.png`,
            author_id: 'local',
            play_count: 0,
            like_count: 0,
            favorite_count: 0,
            ui_config: null,
            created_at: new Date().toISOString(),
          }
          addToLibrary(game, 'local')
          setItems(getLibrary())
        } else {
          setImportError('暂不支持 ST 角色卡 PNG，请使用 GW 游戏包 PNG')
        }
      } else {
        const text = await file.text()
        const raw = JSON.parse(text)
        const data = raw.data ?? raw
        const id = `local_${Date.now()}`
        const game: Game = {
          id,
          slug: id,
          title: data.name ?? data.title ?? file.name.replace(/\.json$/, ''),
          type: 'text',
          short_desc: data.description ?? data.short_desc ?? '',
          notes: data.personality ?? data.notes ?? '',
          cover_url: '',
          author_id: 'local',
          play_count: 0,
          like_count: 0,
          favorite_count: 0,
          ui_config: null,
          created_at: new Date().toISOString(),
        }
        addToLibrary(game, 'local')
        setItems(getLibrary())
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  function handleDelete(e: React.MouseEvent, gameId: string) {
    e.stopPropagation()
    removeFromLibrary(gameId)
    setItems(getLibrary())
  }

  function handleExport(e: React.MouseEvent, game: Game) {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = `/api/create/templates/${game.id}/export`
    a.download = `${game.slug ?? game.id}.json`
    a.click()
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}>
          我的游戏
        </h2>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json,.png" className="hidden" onChange={handleFileChange} />
          <button
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload size={14} />
            {importing ? '导入中…' : '导入'}
          </button>

          {/* ··· 菜单 */}
          <div className="relative">
            <button
              className="p-1.5 rounded-lg border transition-colors"
              style={{ borderColor: menuOpen ? 'var(--color-accent)' : 'var(--color-border)', color: menuOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              onClick={() => setMenuOpen(v => !v)}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border py-1 z-40 shadow-lg"
                     style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <button
                    className="w-full text-left px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--color-text)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => { setMenuOpen(false); setConfigOpen(true) }}
                  >
                    运行配置
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {importError && <p className="text-xs text-red-400 mb-3">{importError}</p>}

      {/* 游戏列表 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            还没有游戏
          </p>
          <div className="flex gap-3">
            <button
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              onClick={() => nav('/')}
            >
              去公共游戏库逛逛
            </button>
            <button
              className="text-sm px-4 py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              onClick={() => fileRef.current?.click()}
            >
              导入本地游戏包
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(({ game, source, importedAt, lastPlayedAt }) => {
            const isNavigating = navigatingId === game.id
            return (
              <div
                key={game.id}
                className="group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)'
                  e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => handlePlay(game)}
              >
                {/* 封面缩略图 */}
                <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                  {game.cover_url
                    ? <img src={game.cover_url} alt={game.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full" style={{ background: fallbackGradient(game.id) }} />
                  }
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                      {game.title}
                    </p>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                      {source === 'local' ? '本地' : '公共库'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {lastPlayedAt
                      ? `${timeAgo(lastPlayedAt)} 游玩`
                      : `${new Date(importedAt).toLocaleDateString('zh-CN')} 导入`
                    }
                  </p>
                </div>

                {/* 加载指示 */}
                {isNavigating && (
                  <Loader2 size={16} className="shrink-0 animate-spin" style={{ color: 'var(--color-accent)' }} />
                )}

                {/* 操作按钮（hover 显示） */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 rounded-md transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    onClick={e => handleExport(e, game)}
                    title="导出"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded-md transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    onClick={e => handleDelete(e, game.id)}
                    title="移除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LLM 配置抽屉 */}
      <ConfigDrawer open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  )
}

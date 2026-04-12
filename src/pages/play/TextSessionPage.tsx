import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFloors, useSession } from '@/queries/sessions'
import { useGame } from '@/queries/games'
import MessageList from '@/components/chat/MessageList'
import ChatInput from '@/components/chat/ChatInput'
import TextSessionTopBar from '@/components/play/TextSessionTopBar'
import GameStatsPanel from '@/components/play/GameStatsPanel'
import { useStreamStore } from '@/stores/stream'
import { getRuntimeConfig } from '@/stores/runtime'
import { applyTheme, clearTheme, DEFAULT_THEME } from '@/styles/themes'
import type { TurnResponse } from '@/api/types'

export default function TextSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const sessionQ = useSession(sessionId!)
  const session = sessionQ.data
  const { data: game } = useGame(session?.game_id ?? '', { enabled: !!session?.game_id })
  const { data: floors = [], refetch } = useFloors(sessionId!)
  const { streaming, buffer, pendingMessage, clearPending, streamError, clearError } = useStreamStore()
  const [lastOptions, setLastOptions] = useState<string[]>([])
  const [statsOpen, setStatsOpen] = useState(false)

  const uiCfg = game?.ui_config
  const inputMode = uiCfg?.input_mode ?? 'free'
  const placeholder = uiCfg?.input_placeholder ?? '输入你的行动…'
  const title = sessionQ.isError ? '未连接后端' : (game?.title ?? '加载中…')
  const displayVars = uiCfg?.display_vars
  const [styleOverride, setStyleOverride] = useState<'prose' | 'bubble' | null>(null)
  const messageStyle = styleOverride ?? (uiCfg?.message_style ?? 'prose')

  const runtimeCfg = getRuntimeConfig()
  const streamOpts = {
    api_key: runtimeCfg.api_key,
    base_url: runtimeCfg.base_url,
    model: runtimeCfg.model_label,
  }

  // ── 主题加载：主题预设 → color_scheme 覆盖 ──────────────────────────────────
  useEffect(() => {
    if (!game) return
    const el = document.documentElement
    const themeName = uiCfg?.theme ?? DEFAULT_THEME

    // 1. 应用主题预设（设置所有变量 + data-gw-theme 属性）
    applyTheme(themeName, el)

    // 2. color_scheme 覆盖（创作者自定义，优先级最高）
    const cs = uiCfg?.color_scheme
    if (cs) {
      if (cs.bg)          el.style.setProperty('--color-bg', cs.bg)
      if (cs.surface)     el.style.setProperty('--color-surface', cs.surface)
      if (cs.border)      el.style.setProperty('--color-border', cs.border)
      if (cs.text)        el.style.setProperty('--color-text', cs.text)
      if (cs.text_muted)  el.style.setProperty('--color-text-muted', cs.text_muted)
      if (cs.accent) {
        el.style.setProperty('--color-accent', cs.accent)
        el.style.setProperty('--color-user-text', cs.accent)
        el.style.setProperty('--color-user-border', cs.accent)
        el.style.setProperty('--color-user-bubble', cs.accent)
      }
      if (cs.user_text)   el.style.setProperty('--color-user-text', cs.user_text)
      if (cs.user_border) el.style.setProperty('--color-user-border', cs.user_border)
      if (cs.topbar_bg)   el.style.setProperty('--color-topbar-bg', cs.topbar_bg)
    }

    // 3. 自定义字体
    if (uiCfg?.font) el.style.setProperty('--font-prose', uiCfg.font)

    return () => clearTheme(el)
  }, [game, uiCfg])

  // ── 清除 pending message ────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingMessage && floors.length > 0) clearPending()
  }, [floors, pendingMessage, clearPending])

  useEffect(() => {
    const key = 'gw_message_style'
    const saved = localStorage.getItem(key)
    if (saved === 'prose' || saved === 'bubble') setStyleOverride(saved)

    const handler = (e: Event) => {
      const v = (e as CustomEvent<string>).detail
      if (v === 'prose' || v === 'bubble') setStyleOverride(v)
    }
    window.addEventListener('gw:style', handler)
    return () => window.removeEventListener('gw:style', handler)
  }, [])

  function handleTurnDone(turn?: TurnResponse) {
    setLastOptions(turn?.options ?? [])
    refetch()
  }

  function handleChoose(choice: string) {
    setLastOptions([])
    window.dispatchEvent(new CustomEvent('gw:choose', { detail: choice }))
  }

  function handleRetry() {
    clearError()
    import('@/api/sessions').then(({ sessionsApi }) => {
      sessionsApi.regen(sessionId!).then(() => refetch()).catch(() => {})
    })
  }

  const streamingBuffer = streaming ? buffer : (pendingMessage ?? null)
  const lastTokenUsed = floors.length > 0 ? floors[floors.length - 1]?.token_used : undefined

  return (
    <div className="flex flex-col h-screen overflow-hidden"
         style={{ background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-prose)' }}>
      <TextSessionTopBar
        title={title}
        sessionId={sessionId!}
        gameId={session?.game_id ?? ''}
        onBack={() => nav(-1)}
        onStatsToggle={() => setStatsOpen(o => !o)}
      />
      {statsOpen && (
        <div className="shrink-0 sticky top-0 z-20" style={{ background: 'var(--color-bg)' }}>
          <GameStatsPanel
            sessionId={sessionId!}
            displayVars={displayVars}
            items={uiCfg?.stats_bar?.items}
            floorCount={floors.length}
            lastTokenUsed={lastTokenUsed}
            lastError={streamError ?? undefined}
            onClose={() => setStatsOpen(false)}
          />
        </div>
      )}
      <MessageList
        floors={floors}
        sessionId={sessionId}
        messageStyle={messageStyle}
        streamingBuffer={streamingBuffer}
        lastOptions={streaming ? [] : lastOptions}
        onChoose={handleChoose}
        onFloorEdited={() => refetch()}
        onFloorDeleted={() => refetch()}
      />
      {streamError && (
        <div className="mx-4 mb-2 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <span className="flex-1" style={{ color: '#f87171' }}>{streamError}</span>
          <button onClick={handleRetry}
            className="text-xs rounded px-2 py-1 transition-colors"
            style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
            重试
          </button>
          <button onClick={clearError}
            className="text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}>
            ✕
          </button>
        </div>
      )}
      <ChatInput
        key={sessionId}
        sessionId={sessionId!}
        inputMode={inputMode}
        placeholder={placeholder}
        streamOpts={streamOpts}
        onTurnDone={handleTurnDone}
      />
    </div>
  )
}

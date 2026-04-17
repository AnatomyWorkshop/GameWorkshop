import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBranches, useFloors, usePromptPreview, useSession } from '@/queries/sessions'
import { useGame } from '@/queries/games'
import MessageList from './chat/MessageList'
import ChatInput from './chat/ChatInput'
import TextPlayTopBar from './components/TextPlayTopBar'
import PanelsHost from './panels/PanelsHost'
import { useStreamStore } from '@/stores/stream'
import { getRuntimeConfig } from '@/stores/runtime'
import { applyTheme, clearTheme, DEFAULT_THEME } from '@/styles/themes'
import { extractChoiceOptions, extractTokens } from '@/utils/tokenExtract'
import { runRegexPipeline } from '@/utils/regexPipeline'
import type { Floor, Game, TurnResponse, UIConfig } from '@/api/types'
import type { NarrativeToken } from '@/utils/tokenExtract'
import { usePanels } from './hooks/usePanels'

function getThemePreset(uiCfg?: UIConfig | null): NonNullable<UIConfig['theme_preset']> {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('gw_theme_preset') : null
  if (stored === 'default-dark' || stored === 'gothic' || stored === 'soft-fantasy' || stored === 'cyberpunk' || stored === 'parchment' || stored === 'minimal') return stored
  return uiCfg?.theme_preset ?? uiCfg?.theme ?? DEFAULT_THEME
}

export default function TextPlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const isTest = sessionId === 'test'

  if (isTest) {
    return <TextPlayPageMock sessionId="test" onBack={() => nav(-1)} />
  }

  return <TextPlayPageReal sessionId={sessionId!} onBack={() => nav(-1)} />
}

function TextPlayPageReal({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [branchId, setBranchId] = useState('main')
  const sessionQ = useSession(sessionId)
  const session = sessionQ.data
  const { data: game } = useGame(session?.game_id ?? '', { enabled: !!session?.game_id })
  const { data: branches = [], refetch: refetchBranches } = useBranches(sessionId)
  const { data: floors = [], refetch } = useFloors(sessionId, branchId)
  const { streaming, buffer, pendingUserInput, pendingMessage, clearPending, clearPendingUserInput, streamError, clearError } = useStreamStore()
  const openingPreviewQ = usePromptPreview(sessionId, branchId === 'main' && floors.length === 0 && !streaming)
  const [lastOptions, setLastOptions] = useState<string[]>([])
  
  // 初始化变量和 token（如果 API 有带回最后状态则优先，否则为空）
  const [variables, setVariables] = useState<Record<string, unknown>>({})
  const [narrativeTokens, setNarrativeTokens] = useState<NarrativeToken[]>([])

  // 从 floors 计算初始化 token 与 vars，在真实场景中可以从最新 floor 的 page_vars 读取
  useEffect(() => {
    if (floors.length > 0) {
      const lastFloor = floors[floors.length - 1]
      if (lastFloor.page_vars) {
        setVariables(lastFloor.page_vars)
      }
      // 对于 A 类标签，可以从最后的 assistant 消息中提取（如果有）
      const lastMsg = lastFloor.messages[lastFloor.messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && game?.ui_config?.token_extract_rules) {
        const { tokens } = extractTokens(lastMsg.content, game.ui_config.token_extract_rules)
        setNarrativeTokens(tokens)
      }
    }
  }, [floors, game?.ui_config?.token_extract_rules])

  const uiCfg = game?.ui_config
  const inputMode = uiCfg?.input_mode ?? 'free'
  const placeholder = uiCfg?.input_placeholder ?? '输入你的行动…'
  const title = sessionQ.isError ? '未连接后端' : (game?.title ?? '加载中…')
  const messageStyle: 'prose' = 'prose'

  // runtimeCfg 放进 state，保存配置后通过 gw:runtime 事件触发更新
  const [runtimeCfg, setRuntimeCfg] = useState(getRuntimeConfig)
  useEffect(() => {
    function onRuntimeChange() { setRuntimeCfg(getRuntimeConfig()) }
    window.addEventListener('gw:runtime', onRuntimeChange)
    return () => window.removeEventListener('gw:runtime', onRuntimeChange)
  }, [])

  const streamOpts = {
    api_key:  runtimeCfg.api_key,
    base_url: runtimeCfg.base_url,
    model:    runtimeCfg.model_label,
    branch_id: branchId,
  }

  const { panels: panelStates, togglePanel, closePanel, isPanelOpen } = usePanels()

  // 方案 A：检测 sessionStorage 里的开局配置消息，自动发送
  useEffect(() => {
    if (floors.length > 0 || streaming) return
    const key = `gw_setup_${sessionId}`
    const msg = sessionStorage.getItem(key)
    if (!msg) return
    sessionStorage.removeItem(key)
    // 等 ChatInput 挂载并注册 gw:choose 监听后再触发（下一个 tick）
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gw:choose', { detail: msg }))
    }, 0)
  }, [sessionId, floors.length, streaming])
  const streamingBuffer = streaming ? buffer : (pendingMessage ?? null)
  const openingAssistant = branchId === 'main' && floors.length === 0 ? (openingPreviewQ.data?.messages.find((m) => m.role === 'assistant')?.content ?? '') : ''
  const uiFloors: Floor[] =
    floors.length > 0
      ? floors
      : openingAssistant
        ? [{
            id: 'opening',
            seq: 0,
            status: 'committed',
            created_at: new Date().toISOString(),
            messages: [{ role: 'assistant', content: openingAssistant }],
            token_used: 0,
          } as any]
        : []

  useEffect(() => {
    if (!uiCfg?.first_options || uiCfg.first_options.length === 0) return
    if (lastOptions.length > 0) return
    if (streaming || streamingBuffer != null || pendingUserInput) return
    const hasUser = floors.some((f) => f.messages.some((m) => m.role === 'user'))
    if (hasUser) return
    setLastOptions(uiCfg.first_options)
  }, [uiCfg?.first_options, lastOptions.length, streaming, pendingUserInput, floors, streamingBuffer])

  // ── 主题加载：主题预设 → color_scheme 覆盖 ──────────────────────────────────
  useEffect(() => {
    if (!game) return
    const el = document.documentElement
    const themeName = getThemePreset(uiCfg)
    applyTheme(themeName, el)
    const cs = uiCfg?.color_scheme
    if (cs) {
      if (cs.bg) el.style.setProperty('--color-bg', cs.bg)
      if (cs.bg_image) el.style.setProperty('background', cs.bg_image)
      else if (cs.bg) el.style.setProperty('background', cs.bg)
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
      if (cs.quote) el.style.setProperty('--color-quote', cs.quote)
      if (cs.user_text)   el.style.setProperty('--color-user-text', cs.user_text)
      if (cs.user_border) el.style.setProperty('--color-user-border', cs.user_border)
      if (cs.topbar_bg)   el.style.setProperty('--color-topbar-bg', cs.topbar_bg)
    }
    if (uiCfg?.font) el.style.setProperty('--font-prose', uiCfg.font)
    return () => clearTheme(el)
  }, [game, uiCfg])

  // ── 清除 pending message ────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingMessage && floors.length > 0) clearPending()
  }, [floors, pendingMessage, clearPending])

  useEffect(() => {
    if (!pendingUserInput) return
    const needle = pendingUserInput.trim()
    if (!needle) {
      clearPendingUserInput()
      return
    }
    const exists = floors.some((f) => f.messages.some((m) => m.role === 'user' && m.content.trim() === needle))
    if (exists) clearPendingUserInput()
  }, [floors, pendingUserInput, clearPendingUserInput])

  useEffect(() => {
    function onTheme() {
      const el = document.documentElement
      applyTheme(getThemePreset(uiCfg), el)
    }
    window.addEventListener('gw:theme', onTheme)
    return () => {
      window.removeEventListener('gw:theme', onTheme)
    }
  }, [uiCfg])

  function handleTurnDone(turn?: TurnResponse) {
    let opts = turn?.options ?? []
    if (opts.length === 0 && turn?.narrative) {
      const extracted = extractChoiceOptions(turn.narrative).choices
      if (extracted.length > 0) opts = extracted
    }
    setLastOptions(opts)
    if (turn?.variables) setVariables(turn.variables as Record<string, unknown>)
    if (turn?.narrative && uiCfg?.token_extract_rules?.length) {
      const cleaned = runRegexPipeline(turn.narrative, uiCfg.regex_profiles ?? [], 'extract')
      const { tokens } = extractTokens(cleaned, uiCfg.token_extract_rules)
      setNarrativeTokens(tokens)
    }
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

  async function handleForkFromFloor(floorId: string) {
    if (!confirm('从这条消息创建新 Branch？（不会切换分支）')) return
    try {
      const { sessionsApi } = await import('@/api/sessions')
      await sessionsApi.createBranchFromFloor(sessionId, floorId)
      await refetchBranches()
    } catch {
    }
  }
  const lastTokenUsed = floors.length > 0 ? floors[floors.length - 1]?.token_used : undefined

  if (sessionQ.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ color: 'var(--color-text)' }}>
        加载中…
      </div>
    )
  }

  if (sessionQ.isError || !session) {
    return (
      <div className="h-screen flex flex-col" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
        <div className="w-full max-w-[720px] mx-auto px-4 py-4">
          <button
            className="px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            onClick={onBack}
          >
            返回
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="text-base font-medium mb-2">会话不存在或后端未连接</div>
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              可能原因：重新 seed 后旧 session 被清理；或后端未运行在 8080。
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col relative"
         style={{ color: 'var(--color-text)', fontFamily: 'var(--font-prose)' }}>

      <TextPlayTopBar
        title={title}
        subtitle={uiCfg?.subtitle ?? game?.short_desc ?? undefined}
        sessionId={sessionId}
        gameId={session?.game_id ?? ''}
        onBack={onBack}
        floatingPanels={uiCfg?.floating_panels?.panels ?? []}
        onTogglePanel={togglePanel}
        isPanelOpen={isPanelOpen}
        branchId={branchId}
        branches={['main', ...branches.filter((b) => b.branch_id !== 'main').map((b) => b.branch_id)]}
        onBranchChange={(bid) => {
          setLastOptions([])
          setBranchId(bid)
        }}
      />

      <div className="relative overflow-hidden flex-1 min-h-0">
        <div className="h-full min-h-0 w-full max-w-[720px] mx-auto flex flex-col">
          <div className="h-full min-h-0 flex flex-col">
          <MessageList
            floors={uiFloors}
            sessionId={sessionId}
            messageStyle={messageStyle}
            characters={uiCfg?.characters ?? undefined}
            avatarMode={uiCfg?.avatar_mode ?? 'none'}
            optimisticUserMessage={pendingUserInput}
            streamingBuffer={streamingBuffer}
            lastOptions={streaming ? [] : lastOptions}
            regexProfiles={uiCfg?.regex_profiles}
            onChoose={handleChoose}
            onForkFromFloor={handleForkFromFloor}
            onFloorEdited={() => refetch()}
            onFloorDeleted={() => refetch()}
          />
          </div>
        </div>

        <PanelsHost
          panels={uiCfg?.floating_panels?.panels ?? []}
          narrativeTagItems={uiCfg?.narrative_tags?.items ?? []}
          statsItems={uiCfg?.stats_bar?.items ?? []}
          variables={variables}
          tokens={narrativeTokens}
          floorCount={floors.length}
          tokenUsed={lastTokenUsed}
          modelLabel={getRuntimeConfig().model_label ?? undefined}
          sessionId={sessionId}
          panelStates={panelStates}
          onClosePanel={closePanel}
          streamDone={!streaming}
        />
      </div>

      <div className="shrink-0 w-full max-w-[720px] mx-auto">
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
          sessionId={sessionId}
          inputMode={inputMode}
          placeholder={placeholder}
          streamOpts={streamOpts}
          onTurnDone={handleTurnDone}
        />
      </div>
    </div>
  )
}

function TextPlayPageMock({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const [variables, setVariables] = useState<Record<string, unknown>>({
    '生命值': 78,
    '存活天数': 3,
    '当前位置': '临湖宅邸',
    '总资产.金币': 12,
    '总资产.银币': 3,
    '总资产.铜币': 7,
    '声望.温莎': 5,
  })
  const [narrativeTokens] = useState<NarrativeToken[]>([
    { type: 'time', text: '临湖宅邸·2025年5月11日·星期日·18:15', style: 'gold', placement: ['top_bar'] },
  ] as NarrativeToken[])

  const game = React.useMemo<Game>(() => {
    const defaultTheme = getThemePreset(null)
    return {
      id: 'test-game',
      slug: 'test',
      title: 'Text 游玩页（测试）',
      type: 'text',
      short_desc: '本地 mock 数据，不依赖后端',
      notes: '',
      cover_url: '',
      author_id: 'anonymous',
      play_count: 0,
      like_count: 0,
      favorite_count: 0,
      tags: [],
      ui_config: buildMockUIConfig(defaultTheme),
      created_at: new Date().toISOString(),
    }
  }, [])

  const uiCfg = game.ui_config ?? undefined
  const inputMode = uiCfg?.input_mode ?? 'free'
  const placeholder = uiCfg?.input_placeholder ?? '输入你的行动…'
  const title = game.title
  const messageStyle: 'prose' = 'prose'

  const { panels: panelStates, togglePanel, closePanel, isPanelOpen } = usePanels(['stats', 'tags'])

  useEffect(() => {
    const el = document.documentElement
    const themeName = getThemePreset(uiCfg)
    applyTheme(themeName, el)
    const cs = uiCfg?.color_scheme
    if (cs) {
      if (cs.bg) el.style.setProperty('--color-bg', cs.bg)
      if (cs.bg_image) el.style.setProperty('background', cs.bg_image)
      else if (cs.bg) el.style.setProperty('background', cs.bg)
      if (cs.surface) el.style.setProperty('--color-surface', cs.surface)
      if (cs.border) el.style.setProperty('--color-border', cs.border)
      if (cs.text) el.style.setProperty('--color-text', cs.text)
      if (cs.text_muted) el.style.setProperty('--color-text-muted', cs.text_muted)
      if (cs.accent) {
        el.style.setProperty('--color-accent', cs.accent)
        el.style.setProperty('--color-user-text', cs.accent)
        el.style.setProperty('--color-user-border', cs.accent)
        el.style.setProperty('--color-user-bubble', cs.accent)
      }
      if (cs.quote) el.style.setProperty('--color-quote', cs.quote)
      if (cs.user_text) el.style.setProperty('--color-user-text', cs.user_text)
      if (cs.user_border) el.style.setProperty('--color-user-border', cs.user_border)
      if (cs.topbar_bg) el.style.setProperty('--color-topbar-bg', cs.topbar_bg)
    }
    if (uiCfg?.font) el.style.setProperty('--font-prose', uiCfg.font)
    return () => clearTheme(el)
  }, [uiCfg])

  useEffect(() => {
    function onTheme() {
      const el = document.documentElement
      applyTheme(getThemePreset(uiCfg), el)
    }
    window.addEventListener('gw:theme', onTheme)
    return () => {
      window.removeEventListener('gw:theme', onTheme)
    }
  }, [uiCfg])

  const floors = buildMockFloors(sessionId)
  const lastTokenUsed = floors.length > 0 ? floors[floors.length - 1]?.token_used : undefined

  return (
    <div className="h-screen overflow-hidden flex flex-col relative"
         style={{ color: 'var(--color-text)', fontFamily: 'var(--font-prose)' }}>

      <TextPlayTopBar
        title={title}
        sessionId={sessionId}
        gameId=""
        onBack={onBack}
        floatingPanels={uiCfg?.floating_panels?.panels ?? []}
        onTogglePanel={togglePanel}
        isPanelOpen={isPanelOpen}
      />

      <div className="relative overflow-hidden flex-1 min-h-0">
        <div className="h-full min-h-0 w-full max-w-[720px] mx-auto flex flex-col">
          <div className="h-full min-h-0 flex flex-col">
          <MessageList
            floors={floors}
            sessionId={sessionId}
            messageStyle={messageStyle}
            streamingBuffer={null}
            lastOptions={['继续靠近', '先观察周围', '转身离开']}
            onChoose={(choice) => {
              setVariables(v => ({ ...v, '上一选择': choice }))
            }}
            onFloorEdited={() => {}}
            onFloorDeleted={() => {}}
          />
          </div>
        </div>

        <PanelsHost
          panels={uiCfg?.floating_panels?.panels ?? []}
          narrativeTagItems={uiCfg?.narrative_tags?.items ?? []}
          statsItems={uiCfg?.stats_bar?.items ?? []}
          variables={variables}
          tokens={narrativeTokens}
          floorCount={floors.length}
          tokenUsed={lastTokenUsed}
          modelLabel={getRuntimeConfig().model_label ?? undefined}
          sessionId={sessionId}
          panelStates={panelStates}
          onClosePanel={closePanel}
        />
      </div>

      <div className="shrink-0 w-full max-w-[720px] mx-auto">
        <ChatInputMock
          inputMode={inputMode}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

function ChatInputMock({ inputMode, placeholder }: { inputMode: UIConfig['input_mode']; placeholder: string }) {
  const isChoiceOnly = inputMode === 'choice_only'
  const isCommand = inputMode === 'command'
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function setTheme(theme: NonNullable<UIConfig['theme_preset']>) {
    localStorage.setItem('gw_theme_preset', theme)
    window.dispatchEvent(new CustomEvent('gw:theme', { detail: theme }))
  }

  useEffect(() => {
    if (!menuOpen && !themeOpen) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, themeOpen])

  return (
    <div
      ref={ref}
      className="relative border-t px-3 py-2 flex items-end gap-2 shrink-0"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {!isChoiceOnly && (
        <div className="relative shrink-0">
          <button
            className="w-8 h-8 flex items-center justify-center transition-colors rounded-lg text-[var(--color-text-muted)]"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="选项"
            style={{
              color: 'var(--color-text-muted)',
              borderColor: 'transparent',
              backgroundColor: 'transparent',
            }}
          >
            ☰
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border shadow-xl z-20 overflow-hidden"
                 style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>操作</div>
              <div className="px-3 py-2 flex gap-2">
                <MiniMenuButton label="AI 帮答" onClick={() => { setMenuOpen(false) }} />
                <MiniMenuButton label="重新生成" onClick={() => { setMenuOpen(false) }} />
                <MiniMenuButton label="主题" onClick={() => { setMenuOpen(false); setThemeOpen(true) }} />
              </div>
            </div>
          )}

          {themeOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-xl z-20 overflow-hidden"
                 style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>主题切换</div>
              <MenuSection title="主题">
                <MiniMenuButton label="深蓝默认" onClick={() => { setTheme('default-dark'); setThemeOpen(false) }} />
                <MiniMenuButton label="哥特暗黑" onClick={() => { setTheme('gothic'); setThemeOpen(false) }} />
                <MiniMenuButton label="柔幻奇境" onClick={() => { setTheme('soft-fantasy'); setThemeOpen(false) }} />
                <MiniMenuButton label="赛博朋克" onClick={() => { setTheme('cyberpunk'); setThemeOpen(false) }} />
                <MiniMenuButton label="羊皮纸卷" onClick={() => { setTheme('parchment'); setThemeOpen(false) }} />
                <MiniMenuButton label="极简纯粹" onClick={() => { setTheme('minimal'); setThemeOpen(false) }} />
              </MenuSection>
            </div>
          )}
        </div>
      )}

      {!isChoiceOnly && (
        <textarea
          className={`flex-1 resize-none px-3 py-2 text-sm outline-none min-h-[36px] leading-5 border transition-colors rounded-lg ${isCommand ? 'font-mono' : ''}`}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          rows={1}
          placeholder={placeholder}
          value=""
          readOnly
        />
      )}

      {!isChoiceOnly && (
        <button
          className="shrink-0 w-8 h-8 flex items-center justify-center text-white disabled:opacity-50 transition-colors rounded-lg bg-[var(--color-accent)]"
          type="button"
          disabled
          aria-label="发送"
        >
          →
        </button>
      )}
    </div>
  )
}

function buildMockUIConfig(defaultTheme: NonNullable<UIConfig['theme_preset']> = 'default-dark'): UIConfig {
  return {
    theme_preset: defaultTheme,
    layout_preset: 'novel-column',
    theme: defaultTheme,
    message_style: 'prose',
    input_mode: 'free',
    input_placeholder: '输入（测试页：不发送请求）…',
    color_scheme: {
      bg: '#050B18',
      bg_image: 'linear-gradient(135deg, #06112E 0%, #030712 60%, #041028 100%)',
      surface: 'rgba(10, 22, 48, 0.62)',
      border: 'rgba(96, 165, 250, 0.18)',
      text: 'rgba(255, 255, 255, 0.96)',
      text_muted: 'rgba(191, 219, 254, 0.72)',
      accent: '#60A5FA',
      quote: '#38BDF8',
      user_text: '#93C5FD',
      user_border: '#60A5FA',
      topbar_bg: 'rgba(3, 7, 18, 0.5)',
    },
    stats_bar: {
      items: [
        { key: '生命值', icon: '❤' },
        { key: '存活天数', icon: '⏳' },
        { key: '当前位置', icon: '⌖' },
        { key: '总资产.金币', label: '总资产.金币', icon: '◈' },
        { key: '总资产.银币', label: '总资产.银币', icon: '◈' },
        { key: '总资产.铜币', label: '总资产.铜币', icon: '◈' },
        { key: '声望.温莎', label: '声望.温莎' },
      ],
    },
    narrative_tags: {
      items: [
        { id: 'time', source: 'token', token_type: 'time', style: 'gold' },
        { id: 'loc', source: 'var', key: '当前位置', style: 'muted' },
      ],
    },
    floating_panels: {
      panels: [
        { id: '技术面板', type: 'preset', preset: 'telemetry_debug', launcher: { icon: '🧪', placement: 'topbar' } },
      ],
    },
    token_extract_rules: [
      { tag: 'time', style: 'gold', placement: ['top_bar'] },
    ],
  }
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-t first:border-t-0" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function MiniMenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="px-2.5 py-1 rounded-md text-xs border transition-colors hover:bg-[var(--color-accent)]/10"
      style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function buildMockFloors(sessionId: string): Floor[] {
  const now = new Date()
  const t0 = new Date(now.getTime() - 1000 * 60 * 6).toISOString()
  const t1 = new Date(now.getTime() - 1000 * 60 * 4).toISOString()
  const t2 = new Date(now.getTime() - 1000 * 60 * 2).toISOString()

  return [
    {
      id: 'floor-0',
      session_id: sessionId,
      seq: 0,
      branch_id: 'main',
      status: 'committed',
      active_page_id: 'page-0',
      messages: [
        {
          role: 'assistant',
          content: '## 临湖宅邸\n\n“欢迎来到临湖宅邸。”\n\n雾气像缓慢的潮水漫过长廊，煤油灯在玻璃罩里轻轻颤动。\n\n- 你听见远处木地板轻微的回响\n- 空气里有药草与煤烟的残味',
        },
      ],
      page_vars: {},
      token_used: 0,
      created_at: t0,
    },
    {
      id: 'floor-1',
      session_id: sessionId,
      seq: 1,
      branch_id: 'main',
      status: 'committed',
      active_page_id: 'page-1',
      messages: [
        { role: 'user', content: '我推开门，先看一眼客厅。' },
        {
          role: 'assistant',
          content: '你听见木门的铰链发出细小的呻吟。客厅里没有人，壁炉里却残留着温热的灰。\n\n[[say|侍从|维克托|夫人说，她今晚不见客。]]\n\n你注意到壁炉台面上有一道不自然的擦拭痕迹，像是有人刻意隐藏了 `某个符号`。',
        },
      ],
      page_vars: {},
      token_used: 382,
      created_at: t1,
    },
    {
      id: 'floor-2',
      session_id: sessionId,
      seq: 2,
      branch_id: 'main',
      status: 'committed',
      active_page_id: 'page-2',
      messages: [
        { role: 'user', content: '我靠近壁炉，伸手摸一下灰烬的温度。' },
        {
          role: 'assistant',
          content: '灰烬还暖，像有人刚离开不久。你指尖沾到一点黑，空气里有淡淡的药草味。\n\n你隐约意识到：这里的“空”也许是被刻意安排出来的。\n\n---\n\n**提示**：这个测试页用于调 UI，未来这里会支持更丰富的声明式渲染。',
        },
      ],
      page_vars: {},
      token_used: 417,
      created_at: t2,
    },
  ]
}

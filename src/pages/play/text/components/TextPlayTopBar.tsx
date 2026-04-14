import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Drawer } from 'vaul'
import { getRuntimeConfig, setRuntimeConfig, type RuntimeConfig } from '@/stores/runtime'
import PanelSwitcherMenu from './PanelSwitcherMenu'
import type { FloatingPanelDecl } from '@/api/types'

interface Props {
  title: string
  sessionId: string
  gameId: string
  onBack: () => void
  statsAvailable?: boolean
  floatingPanels?: FloatingPanelDecl[]
  onTogglePanel: (id: string) => void
  isPanelOpen: (id: string) => boolean
}

export default function TextPlayTopBar({
  title,
  sessionId,
  gameId,
  onBack,
  statsAvailable = true,
  floatingPanels = [],
  onTogglePanel,
  isPanelOpen,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [panelsOpen, setPanelsOpen] = useState(false)
  const [titleVisible, setTitleVisible] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [cfg, setCfg] = useState<RuntimeConfig>(getRuntimeConfig)
  const nav = useNavigate()
  const { model_label } = getRuntimeConfig()

  function handleSave() {
    setRuntimeConfig(cfg)
    setConfigOpen(false)
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
          className="flex-1 relative text-center font-medium text-sm truncate px-2 min-w-0 select-none"
          style={{ color: 'var(--color-text)' }}
          onClick={() => setTitleVisible(v => !v)}
          aria-label="切换标题显示"
          title="点击切换显示/隐藏"
        >
          <span className={`transition-opacity duration-200 ${titleVisible ? 'opacity-100' : 'opacity-0'}`}>{title}</span>
          {!titleVisible && (
            <span className="absolute inset-0 flex items-center justify-center text-xs opacity-60" style={{ color: 'var(--color-text-muted)' }}>
              第二标题（或隐藏）
            </span>
          )}
        </button>

        <button
          type="button"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="世界书（占位）"
          title="世界书（占位）"
          onClick={() => {
            setMoreOpen(false)
            setPanelsOpen(false)
          }}
        >
          <span className="text-sm leading-none">📖</span>
        </button>

        {/* 面板选择菜单 */}
        <PanelSwitcherMenu
          statsAvailable={statsAvailable}
          floatingPanels={floatingPanels}
          onTogglePanel={onTogglePanel}
          isPanelOpen={isPanelOpen}
          open={panelsOpen}
          onOpenChange={(o) => {
            if (o) setMoreOpen(false)
            setPanelsOpen(o)
          }}
        />

        <button
          type="button"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="存档（占位）"
          title="存档（占位）"
          onClick={() => {
            setMoreOpen(false)
            setPanelsOpen(false)
          }}
        >
          <span className="text-sm leading-none">⧉</span>
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
                onClick={() => { setConfigOpen(true); setMoreOpen(false) }}
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

        {/* 配置抽屉 */}
        <Drawer.Root open={configOpen} onOpenChange={setConfigOpen} direction="right">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40" />
            <Drawer.Content
              className="fixed right-0 top-12 bottom-0 w-80 z-50 flex flex-col border-l border-[var(--color-border)]"
              style={{ backgroundColor: 'var(--color-bg)' }}
            >
              <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
                <Drawer.Title className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  模型配置
                </Drawer.Title>
                <Drawer.Description className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  配置当前会话的默认模型
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
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>模型标识 (Model)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    placeholder="gpt-4o"
                    value={cfg.model_label ?? ''}
                    onChange={e => setCfg(c => ({ ...c, model_label: e.target.value }))}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    className="flex-1 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm transition-colors hover:border-[var(--color-text-muted)]"
                    style={{ color: 'var(--color-text)' }}
                    onClick={() => setConfigOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm transition-opacity hover:opacity-90"
                    onClick={handleSave}
                  >
                    保存
                  </button>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </div>
  )
}

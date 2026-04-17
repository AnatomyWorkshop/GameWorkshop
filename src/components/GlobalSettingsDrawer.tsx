import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import { getRuntimeConfig, setRuntimeConfig, type RuntimeConfig, type SlotRuntimeConfig } from '@/stores/runtime'

// ── Provider 预设 ─────────────────────────────────────────────────────────────

const PROVIDERS = [
  { label: 'DeepSeek',  base_url: 'https://api.deepseek.com/v1',                            model: 'deepseek-chat' },
  { label: 'OpenAI',    base_url: 'https://api.openai.com/v1',                              model: 'gpt-4o' },
  { label: 'Gemini',    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  { label: 'Anthropic', base_url: 'https://api.anthropic.com/v1',                           model: 'claude-sonnet-4-6' },
  { label: 'Ollama',    base_url: 'http://localhost:11434/v1',                               model: 'llama3' },
]

// ── 槽位元数据（内测阶段仅展示，不生效）────────────────────────────────────────

const FUTURE_SLOTS = [
  { key: 'director', label: '剧情导演', desc: '分析玩家行为、决定剧情走向' },
  { key: 'verifier', label: '变量校验', desc: '校验 UpdateState 变量合法性' },
  { key: 'memory',   label: '记忆压缩', desc: '长对话摘要，后端定时触发' },
] as const

type FutureSlotKey = typeof FUTURE_SLOTS[number]['key']

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function GlobalSettingsDrawer() {
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState<RuntimeConfig>(getRuntimeConfig)
  const [saved, setSaved] = useState(false)
  const [slotsExpanded, setSlotsExpanded] = useState(false)

  useEffect(() => {
    function onOpen() {
      setCfg(getRuntimeConfig())
      setOpen(true)
    }
    window.addEventListener('gw:settings', onOpen)
    return () => window.removeEventListener('gw:settings', onOpen)
  }, [])

  function handleSave() {
    setRuntimeConfig(cfg)
    window.dispatchEvent(new CustomEvent('gw:runtime'))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function setFutureSlot(key: FutureSlotKey, val: SlotRuntimeConfig) {
    setCfg(c => ({ ...c, slots: { ...c.slots, [key]: val } }))
  }

  const isConfigured = !!(cfg.api_key && cfg.base_url)
  const statusLabel = cfg.model_label
    ? cfg.model_label
    : isConfigured ? '已配置（无模型名）' : '未配置'

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[200]" />
        <Drawer.Content
          className="fixed right-0 top-0 bottom-0 w-[360px] z-[201] flex flex-col border-l"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <Drawer.Title className="flex-1 font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              模型配置
            </Drawer.Title>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto gw-chat-scroll p-4 flex flex-col gap-4">

            {/* 说明 */}
            <div className="text-[11px] px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)' }}>
              内测阶段所有游戏均使用此处配置的模型。后端未配置 LLM Profile 时，前端传入的 Key 作为 fallback 生效。
            </div>

            {/* 主配置 */}
            <div>
              <div className="text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                <span>API 配置</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] border"
                  style={{
                    borderColor: isConfigured ? 'var(--color-accent)' : 'var(--color-border)',
                    color: isConfigured ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Provider 快捷选择 */}
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDERS.map(p => {
                    const active = cfg.base_url === p.base_url
                    return (
                      <button
                        key={p.label}
                        type="button"
                        className="px-2.5 py-1 rounded-md text-xs border transition-colors"
                        style={{
                          borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                          color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          backgroundColor: active ? 'var(--color-accent)10' : 'transparent',
                        }}
                        onClick={() => setCfg(c => ({ ...c, base_url: p.base_url, model_label: p.model }))}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>API Base URL</label>
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
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>API Key</label>
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
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Model</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                    placeholder="deepseek-chat"
                    value={cfg.model_label ?? ''}
                    onChange={e => setCfg(c => ({ ...c, model_label: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </div>
              </div>
            </div>

            {/* Agent 槽位（折叠，内测不生效） */}
            <div>
              <button
                type="button"
                className="w-full flex items-center gap-2 text-xs font-medium mb-1 text-left"
                style={{ color: 'var(--color-text-muted)' }}
                onClick={() => setSlotsExpanded(v => !v)}
              >
                <span className="flex-1">Agent 槽位配置</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  内测暂不生效
                </span>
                <span className="text-[10px]">{slotsExpanded ? '▲' : '▼'}</span>
              </button>

              {slotsExpanded && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="text-[11px] px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)' }}>
                    需要后端 LLM Profile 绑定支持（<code className="text-[10px]">llm_profile_bindings</code> 表）。内测阶段所有槽位均 fallback 到上方 API 配置，此处设置不会生效。
                  </div>
                  {FUTURE_SLOTS.map(s => {
                    const slotVal = cfg.slots?.[s.key] ?? {}
                    const slotEnabled = slotVal.enabled ?? false
                    return (
                      <div key={s.key} className="rounded-lg border overflow-hidden opacity-60" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: 'var(--color-surface)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{s.label}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</div>
                          </div>
                          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                            <div
                              className="relative w-8 h-4 rounded-full transition-colors"
                              style={{ backgroundColor: slotEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}
                            >
                              <div
                                className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                                style={{ transform: slotEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                              />
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={slotEnabled}
                                onChange={e => setFutureSlot(s.key, { ...slotVal, enabled: e.target.checked })}
                              />
                            </div>
                          </label>
                        </div>
                        {slotEnabled && (
                          <div className="px-3 py-3 flex flex-col gap-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex flex-wrap gap-1.5">
                              {PROVIDERS.map(p => (
                                <button
                                  key={p.label}
                                  type="button"
                                  className="px-2 py-0.5 rounded text-[11px] border transition-colors"
                                  style={{
                                    borderColor: slotVal.base_url === p.base_url ? 'var(--color-accent)' : 'var(--color-border)',
                                    color: slotVal.base_url === p.base_url ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                  }}
                                  onClick={() => setFutureSlot(s.key, { ...slotVal, base_url: p.base_url, model_label: p.model })}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                              placeholder="Base URL（留空继承主配置）"
                              value={slotVal.base_url ?? ''}
                              onChange={e => setFutureSlot(s.key, { ...slotVal, base_url: e.target.value || undefined })}
                            />
                            <input
                              type="password"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                              placeholder="API Key（留空继承主配置）"
                              value={slotVal.api_key ?? ''}
                              onChange={e => setFutureSlot(s.key, { ...slotVal, api_key: e.target.value || undefined })}
                            />
                            <input
                              type="text"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
                              placeholder="Model（留空继承主配置）"
                              value={slotVal.model_label ?? ''}
                              onChange={e => setFutureSlot(s.key, { ...slotVal, model_label: e.target.value || undefined })}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t flex gap-3" style={{ borderColor: 'var(--color-border)' }}>
            <button
              className="flex-1 py-2 rounded-lg border text-sm transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              onClick={() => setOpen(false)}
            >
              取消
            </button>
            <button
              className="flex-1 py-2 rounded-lg text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onClick={handleSave}
            >
              {saved ? '已保存 ✓' : '保存'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

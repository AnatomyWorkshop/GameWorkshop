import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Sparkles, RotateCcw, Palette } from 'lucide-react'
import { streamTurn, type StreamOptions } from '@/api/sse'
import { sessionsApi } from '@/api/sessions'
import { useStreamStore } from '@/stores/stream'
import type { TurnResponse, UIConfig } from '@/api/types'

interface Props {
  sessionId: string
  inputMode?: UIConfig['input_mode']
  placeholder?: string
  componentSkin?: UIConfig['component_skin']
  streamOpts?: StreamOptions
  onTurnDone: (turn?: TurnResponse) => void
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

export default function ChatInput({ sessionId, inputMode = 'free', placeholder = '输入你的行动…', componentSkin = 'minimal-chrome', streamOpts, onTurnDone }: Props) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { streaming, startStream, appendDelta, endStream, stopStream, setError } = useStreamStore()

  useEffect(() => {
    const handler = (e: Event) => send((e as CustomEvent<string>).detail)
    window.addEventListener('gw:choose', handler)
    return () => window.removeEventListener('gw:choose', handler)
  }, [streaming])

  useEffect(() => {
    if (!menuOpen && !themeOpen) return
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, themeOpen])

  function send(msg?: string) {
    const content = (msg ?? text).trim()
    if (!content || streaming) return
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const ctrl = startStream(sessionId, content)
    streamTurn(
      sessionId, content,
      appendDelta,
      (turn) => { onTurnDone(turn); endStream() },
      (err) => setError(err.message),
      ctrl.signal,
      streamOpts,
    )
  }

  async function handleRegen() {
    setMenuOpen(false)
    if (streaming) return
    try {
      const turn = await sessionsApi.regen(sessionId)
      onTurnDone(turn)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleSuggest() {
    if (streaming || suggesting) return
    setSuggesting(true)
    try {
      const { suggestion } = await sessionsApi.suggest(sessionId)
      setText(suggestion)
      if (textareaRef.current) {
        textareaRef.current.focus()
        autoResize(textareaRef.current)
      }
    } catch { /* ignore */ } finally {
      setSuggesting(false)
    }
  }

  function setTheme(theme: NonNullable<UIConfig['theme_preset']>) {
    localStorage.setItem('gw_theme_preset', theme)
    window.dispatchEvent(new CustomEvent('gw:theme', { detail: theme }))
  }

  const isChoiceOnly = inputMode === 'choice_only'
  const isCommand = inputMode === 'command'
  const glassSkin = componentSkin === 'glass-ornament'

  return (
    <div
      className={`relative border-t px-3 py-2 flex items-end gap-2 shrink-0 ${glassSkin ? 'rounded-t-2xl border-x border-b-0 shadow-[0_-12px_32px_rgba(15,23,42,0.18)]' : ''}`}
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: glassSkin ? 'rgba(255,255,255,0.03)' : 'var(--color-bg)',
        backdropFilter: glassSkin ? 'blur(12px)' : undefined,
        WebkitBackdropFilter: glassSkin ? 'blur(12px)' : undefined,
      }}
    >
      {!isChoiceOnly && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            className={`w-8 h-8 flex items-center justify-center transition-colors ${glassSkin ? 'rounded-xl border' : 'rounded-lg text-[var(--color-text-muted)]'}`}
            onClick={() => { setThemeOpen(false); setMenuOpen(o => !o) }}
            aria-label="选项"
            style={{
              color: 'var(--color-text-muted)',
              borderColor: glassSkin ? 'rgba(255,255,255,0.08)' : 'transparent',
              backgroundColor: glassSkin ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}
          >
            <span className="text-[15px] leading-none">☰</span>
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border shadow-xl z-20 overflow-hidden"
                 style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                操作
              </div>
              <div className="px-3 py-2 flex gap-2">
                <PrimaryMenuButton
                  icon={<Sparkles size={14} />}
                  label="AI 帮答"
                  onClick={() => { handleSuggest(); setMenuOpen(false) }}
                  disabled={suggesting || streaming}
                />
                <PrimaryMenuButton
                  icon={<RotateCcw size={14} />}
                  label="重新生成"
                  onClick={() => { handleRegen(); setMenuOpen(false) }}
                  disabled={streaming}
                />
                <PrimaryMenuButton
                  icon={<Palette size={14} />}
                  label="主题"
                  onClick={() => { setMenuOpen(false); setThemeOpen(true) }}
                  disabled={false}
                />
              </div>
            </div>
          )}

          {themeOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-xl z-20 overflow-hidden"
                 style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                主题切换
              </div>
              <MenuSection title="主题">
                <MiniMenuButton label="深蓝默认" onClick={() => { setTheme('default-dark'); setThemeOpen(false) }} />
                <MiniMenuButton label="哥特暗黑" onClick={() => { setTheme('gothic'); setThemeOpen(false) }} />
                <MiniMenuButton label="柔幻奇境" onClick={() => { setTheme('soft-fantasy'); setThemeOpen(false) }} />
                <MiniMenuButton label="赛博朋克" onClick={() => { setTheme('cyberpunk'); setThemeOpen(false) }} />
                <MiniMenuButton label="羊皮纸" onClick={() => { setTheme('parchment'); setThemeOpen(false) }} />
                <MiniMenuButton label="极简" onClick={() => { setTheme('minimal'); setThemeOpen(false) }} />
              </MenuSection>
            </div>
          )}
        </div>
      )}

      {!isChoiceOnly && (
        <textarea
          ref={textareaRef}
          className={`flex-1 resize-none px-3 py-2 text-[15px] font-medium outline-none min-h-[36px] leading-6 border transition-colors ${glassSkin ? 'rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'rounded-lg'} ${isCommand ? 'font-mono' : ''}`}
          style={{
            backgroundColor: glassSkin ? 'rgba(255,255,255,0.04)' : 'var(--color-surface)',
            borderColor: glassSkin ? 'rgba(255,255,255,0.08)' : 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          rows={1}
          placeholder={placeholder}
          value={text}
          onChange={e => { setText(e.target.value); autoResize(e.target) }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          disabled={streaming}
        />
      )}

      {!isChoiceOnly && (
        <button
          className={`shrink-0 w-8 h-8 flex items-center justify-center text-white disabled:opacity-50 transition-colors ${glassSkin ? 'rounded-xl shadow-[0_8px_24px_rgba(15,23,42,0.22)]' : 'rounded-lg bg-[var(--color-accent)]'}`}
          onClick={streaming ? stopStream : () => send()}
          disabled={!streaming && !text.trim()}
          aria-label={streaming ? '停止' : '发送'}
          style={{
            background: glassSkin ? 'linear-gradient(135deg, var(--color-accent) 0%, rgba(255,255,255,0.18) 100%)' : undefined,
          }}
        >
          {streaming ? '⏹' : '→'}
        </button>
      )}
    </div>
  )
}

function PrimaryMenuButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-40"
      style={{
        color: 'var(--color-text)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'rgba(255,255,255,0.02)',
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'
      }}
    >
      <span className="w-5 h-5 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
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

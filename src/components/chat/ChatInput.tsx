import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Sparkles, Paintbrush, RotateCcw } from 'lucide-react'
import { streamTurn, type StreamOptions } from '@/api/sse'
import { sessionsApi } from '@/api/sessions'
import { useStreamStore } from '@/stores/stream'
import type { TurnResponse, UIConfig } from '@/api/types'

interface Props {
  sessionId: string
  inputMode?: UIConfig['input_mode']
  placeholder?: string
  streamOpts?: StreamOptions
  onTurnDone: (turn?: TurnResponse) => void
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

export default function ChatInput({ sessionId, inputMode = 'free', placeholder = '输入你的行动…', streamOpts, onTurnDone }: Props) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
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
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function send(msg?: string) {
    const content = (msg ?? text).trim()
    if (!content || streaming) return
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const ctrl = startStream(sessionId)
    streamTurn(
      sessionId, content,
      appendDelta,
      (turn) => { endStream(); onTurnDone(turn) },
      (err) => setError(err.message),
      ctrl.signal,
      streamOpts,
    )
  }

  async function handleRegen() {
    setMenuOpen(false)
    if (streaming) return
    try {
      await sessionsApi.regen(sessionId)
      onTurnDone()
    } catch { /* ignore */ }
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

  function toggleStyle() {
    const key = 'gw_message_style'
    const current = localStorage.getItem(key) === 'bubble' ? 'bubble' : 'prose'
    const next = current === 'prose' ? 'bubble' : 'prose'
    localStorage.setItem(key, next)
    window.dispatchEvent(new CustomEvent('gw:style', { detail: next }))
  }

  const isChoiceOnly = inputMode === 'choice_only'
  const isCommand = inputMode === 'command'

  return (
    <div className="relative border-t px-3 py-2 flex items-end gap-2 shrink-0"
         style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
      {!isChoiceOnly && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="选项"
          >
            ☰
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-20 overflow-hidden">
              <div className="py-1">
                <MenuItem
                  icon={<Sparkles size={14} />}
                  label="AI 帮答"
                  onClick={() => { handleSuggest(); setMenuOpen(false) }}
                  disabled={suggesting || streaming}
                />
                <MenuItem
                  icon={<Paintbrush size={14} />}
                  label="风格选择"
                  onClick={() => { toggleStyle(); setMenuOpen(false) }}
                  disabled={streaming}
                />
                <MenuItem
                  icon={<RotateCcw size={14} />}
                  label="重新生成"
                  onClick={() => { handleRegen(); setMenuOpen(false) }}
                  disabled={streaming}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!isChoiceOnly && (
        <textarea
          ref={textareaRef}
          className={`flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none min-h-[36px] leading-5 border transition-colors ${isCommand ? 'font-mono' : ''}`}
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-50 transition-colors"
          onClick={streaming ? stopStream : () => send()}
          disabled={!streaming && !text.trim()}
          aria-label={streaming ? '停止' : '发送'}
        >
          {streaming ? '⏹' : '→'}
        </button>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-40"
      style={{ color: 'var(--color-text)' }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

import { useState, useRef, useEffect } from 'react'
import { streamTurn } from '@/api/sse'
import { sessionsApi } from '@/api/sessions'
import { useStreamStore } from '@/stores/stream'
import type { TurnResponse, UIConfig } from '@/api/types'

interface Props {
  sessionId: string
  inputMode?: UIConfig['input_mode']
  onTurnDone: (turn?: TurnResponse) => void
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 96) + 'px'
}

export default function ChatInput({ sessionId, inputMode = 'free', onTurnDone }: Props) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { streaming, abortCtrl, startStream, appendDelta, endStream } = useStreamStore()

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    const ctrl = startStream(sessionId)
    streamTurn(
      sessionId, content,
      appendDelta,
      (turn) => { endStream(); onTurnDone(turn) },
      () => endStream(),
      ctrl.signal,
    )
  }

  async function handleRegen() {
    setMenuOpen(false)
    if (streaming) return
    try {
      await sessionsApi.regen(sessionId)
      onTurnDone()
    } catch {
      // ignore
    }
  }

  const isChoiceOnly = inputMode === 'choice_only'
  const isCommand = inputMode === 'command'

  return (
    <div className="relative border-t border-[var(--color-border)] px-3 py-2 flex items-end gap-2 shrink-0">
      {/* [☰] 左侧菜单按钮 — choice_only 时隐藏 */}
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
            <div className="absolute bottom-full left-0 mb-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-20 py-1">
              <button
                onClick={handleRegen}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-accent)]/10 transition-colors"
              >
                ↺ 重新生成
              </button>
              <button
                disabled
                title="Phase 2"
                className="w-full text-left px-3 py-2 text-sm opacity-40 cursor-not-allowed"
              >
                ✨ AI 帮答
              </button>
              <button
                disabled
                title="Phase 2"
                className="w-full text-left px-3 py-2 text-sm opacity-40 cursor-not-allowed"
              >
                🔧 创作者调试
              </button>
            </div>
          )}
        </div>
      )}

      {/* textarea 中间 — choice_only 时隐藏 */}
      {!isChoiceOnly && (
        <textarea
          ref={textareaRef}
          className={`flex-1 resize-none rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm outline-none min-h-[36px] leading-5 ${isCommand ? 'font-mono' : ''}`}
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); autoResize(e.target) }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={streaming}
          style={{ height: '36px' }}
        />
      )}

      {/* [→ / ⏹] 右侧按钮 — choice_only 时隐藏 */}
      {!isChoiceOnly && (
        <button
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-50 transition-colors"
          onClick={streaming ? () => abortCtrl?.abort() : () => send()}
          disabled={!streaming && !text.trim()}
          aria-label={streaming ? '停止' : '发送'}
        >
          {streaming ? '⏹' : '→'}
        </button>
      )}
    </div>
  )
}

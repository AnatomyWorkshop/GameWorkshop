import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { Trash2, Languages, Paintbrush, Volume2, Flag } from 'lucide-react'
import type { FloorMessage } from '@/api/types'

interface Props {
  message: FloorMessage
  isFirstMes?: boolean
  messageStyle?: 'prose' | 'bubble'
  componentSkin?: 'minimal-chrome' | 'glass-ornament'
  floorId?: string
  sessionId?: string
  /** Floor 创建时间 ISO string */
  createdAt?: string
  /** 回合序号（按消息计数；first_mes 为 0） */
  turnNumber?: number
  choices?: string[]
  onChoose?: (choice: string) => void
  onEdited?: (floorId: string, newContent: string) => void
  onDeleted?: (floorId: string) => void
}

// ── Markdown 组件（prose 模式，借鉴 v0-dev）──────────────────────────────────
function renderQuoted(children?: React.ReactNode) {
  if (children == null) return children
  const arr = Array.isArray(children) ? children : [children]
  return arr.map((node, idx) => {
    if (typeof node !== 'string') return <span key={idx}>{node}</span>
    const s = node
    const parts: React.ReactNode[] = []
    const re = /“[^”]+”/g
    let last = 0
    for (let m = re.exec(s); m; m = re.exec(s)) {
      if (m.index > last) parts.push(s.slice(last, m.index))
      parts.push(
        <span key={`${idx}-${m.index}`} style={{ color: 'var(--color-quote, var(--color-accent))' }}>
          {m[0]}
        </span>
      )
      last = m.index + m[0].length
    }
    if (last < s.length) parts.push(s.slice(last))
    return <span key={idx}>{parts}</span>
  })
}

function preprocessNarrative(raw: string): string {
  return raw
    .replace(/<em\s+class=["']gold["']>([\s\S]*?)<\/em>/gi, '<span class="gw-em-gold">$1</span>')
    .replace(/<em\s+class=["']danger["']>([\s\S]*?)<\/em>/gi, '<span class="gw-em-danger">$1</span>')
    .replace(/<em\s+class=["']info["']>([\s\S]*?)<\/em>/gi, '<span class="gw-em-info">$1</span>')
    .replace(/<aside>([\s\S]*?)<\/aside>/gi, '<div class="gw-aside">$1</div>')
    .replace(/<quote>([\s\S]*?)<\/quote>/gi, '<div class="gw-quote">$1</div>')
}

const GW_SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema as any).attributes,
    span: [...(((defaultSchema as any).attributes?.span ?? []) as any[]), 'className'],
    div: [...(((defaultSchema as any).attributes?.div ?? []) as any[]), 'className'],
  },
  clobberPrefix: 'gw-',
}

export const ProseComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-[var(--prose-line-height)] mb-2.5 last:mb-0 text-sm"
       style={{ color: 'var(--color-text)' }}>
      {renderQuoted(children)}
    </p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: 'var(--color-quote, var(--color-accent))' }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ color: 'var(--color-text-muted)' }}>{children}</em>
  ),
  blockquote: () => null,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded text-xs"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--color-quote, var(--color-accent))' }}>
      {children}
    </code>
  ),
  hr: () => (
    <hr className="my-3 border-0 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold mb-3 mt-0" style={{ color: 'var(--color-text)' }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-semibold mb-2 mt-4" style={{ color: 'var(--color-text)' }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: 'var(--color-text)' }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2.5 space-y-1 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2.5 space-y-1 text-sm">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ color: 'var(--color-text)' }}>{children}</li>
  ),
}

function splitSayBlocks(raw: string): Array<{ type: 'md'; text: string } | { type: 'say'; name: string; subtitle?: string; text: string }> {
  const out: Array<{ type: 'md'; text: string } | { type: 'say'; name: string; subtitle?: string; text: string }> = []
  // Support both [[say|name|text]] and [[say|name|subtitle|text]]
  const re = /\[\[say\|([^|\]]+)(?:\|([^|\]]+))?\|([\s\S]*?)\]\]/g
  let last = 0
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    if (m.index > last) out.push({ type: 'md', text: raw.slice(last, m.index) })
    if (m[2] && m[3]) {
      // 3 groups matched: [[say|name|subtitle|text]]
      out.push({ type: 'say', name: m[1].trim(), subtitle: m[2].trim(), text: m[3].trim() })
    } else {
      // 2 groups matched: [[say|name|text]], where m[2] is actually the text
      out.push({ type: 'say', name: m[1].trim(), text: (m[2] || m[3]).trim() })
    }
    last = m.index + m[0].length
  }
  if (last < raw.length) out.push({ type: 'md', text: raw.slice(last) })
  return out.filter(p => (p.type === 'md' ? p.text.trim().length > 0 : true))
}

function SayLine({ name, subtitle, text }: { name: string; subtitle?: string; text: string }) {
  const initials = name.slice(0, 1)
  return (
    <div className="flex items-start gap-3 my-2">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--color-accent)' }}
          aria-label={name}
          title={name}
        >
          {initials}
        </div>
        {subtitle && (
          <div className="text-[9px] whitespace-nowrap opacity-60 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div
        className="px-3 py-2 rounded-lg text-sm leading-[var(--prose-line-height)]"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--color-text)' }}
      >
        {renderQuoted(text)}
      </div>
    </div>
  )
}

// ── 时间格式化 ────────────────────────────────────────────────────────────────

function formatMetaTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

// ── 更多菜单 ──────────────────────────────────────────────────────────────────

interface MoreMenuProps {
  onDelete?: () => void
}

function MoreMenu({ onDelete }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  return (
    <span ref={ref} className="inline-flex items-center gap-1">
      <MiniAction icon={<Paintbrush size={14} />} title="Generate Image" disabled />

      {!open && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="inline-flex items-center justify-center h-4 w-4 p-0 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
        title="Message Actions"
        aria-label="Message Actions"
      >
        <span className="text-[10px] leading-none">···</span>
      </button>
      )}

      {open && (
        <span className="inline-flex items-center gap-1">
          <MiniAction icon={<Languages size={14} />} title="Translate message" disabled />
          <MiniAction icon={<Volume2 size={14} />} title="Narrate" disabled />
          <MiniAction icon={<Flag size={14} />} title="Bookmark" disabled />
          {onDelete ? (
            <MiniAction icon={<Trash2 size={14} />} title="Delete" danger onClick={() => { onDelete(); setOpen(false) }} />
          ) : (
            <MiniAction icon={<Trash2 size={14} />} title="Delete" danger disabled />
          )}
        </span>
      )}
    </span>
  )
}

function MiniAction({ icon, title, onClick, disabled, danger }: { icon: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="h-4 w-4 rounded flex items-center justify-center transition-colors disabled:opacity-40"
      style={{
        color: danger ? '#f87171' : 'var(--color-text-muted)',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {icon}
    </button>
  )
}

// ── 元数据行 ──────────────────────────────────────────────────────────────────

interface MetaLineProps {
  createdAt?: string
  turnNumber?: number
  isUser: boolean
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

function MetaLine({ createdAt, turnNumber, isUser, canEdit, canDelete, onEdit, onDelete }: MetaLineProps) {
  const time = formatMetaTime(createdAt)
  return (
    <div className="flex items-center gap-1.5 text-[10px] group/meta"
         style={{ color: 'var(--color-text-muted)' }}>
      {time && <span className="opacity-40 group-hover/meta:opacity-60 transition-opacity">{time}</span>}
      {turnNumber != null && (
        <>
          <span className="opacity-25">|</span>
          <span className="opacity-40 group-hover/meta:opacity-60 transition-opacity">#{turnNumber}</span>
        </>
      )}
      <span className="opacity-25">|</span>
      {/* ··· 更多菜单 */}
      <span className="opacity-40 hover:opacity-80 transition-opacity">
        <MoreMenu
          onDelete={canDelete ? onDelete : undefined}
        />
      </span>
    </div>
  )
}

// ── 编辑框 ────────────────────────────────────────────────────────────────────

function EditBox({ value, onChange, onCommit, onCancel }: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.focus()
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [])
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none leading-relaxed"
        style={{ backgroundColor: 'var(--color-input-bg)', borderColor: 'var(--color-accent)', color: 'var(--color-text)' }}
        value={value}
        onChange={e => { onChange(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommit() } if (e.key === 'Escape') onCancel() }}
      />
      <div className="flex gap-2 mt-1 justify-end">
        <button onClick={onCancel} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>取消</button>
        <button onClick={onCommit} className="text-xs" style={{ color: 'var(--color-accent)' }}>确认</button>
      </div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isFirstMes,
  messageStyle = 'prose',
  floorId,
  sessionId,
  createdAt,
  turnNumber,
  choices,
  onChoose,
  onEdited,
  onDeleted,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const isUser = message.role === 'user'
  const canEdit = isUser && !!floorId && !!sessionId && !!onEdited
  const canDelete = !!floorId && !!sessionId && !!onDeleted

  async function commitEdit() {
    const trimmed = editValue.trim()
    if (!trimmed || !floorId || !sessionId) { setEditing(false); return }
    const { sessionsApi } = await import('@/api/sessions')
    await sessionsApi.editFloor(sessionId, floorId, trimmed).catch(() => {})
    setEditing(false)
    onEdited?.(floorId, trimmed)
  }

  async function handleDelete() {
    if (!floorId || !sessionId) return
    if (!confirm('删除这条消息？')) return
    const { sessionsApi } = await import('@/api/sessions')
    await sessionsApi.deleteFloor(sessionId, floorId).catch(() => {})
    onDeleted?.(floorId)
  }

  const metaLine = (
    <div className="mt-1 select-none">
      <MetaLine
        createdAt={createdAt}
        turnNumber={turnNumber}
        isUser={isUser}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => { setEditValue(message.content); setEditing(true) }}
        onDelete={handleDelete}
      />
    </div>
  )

  const showInlineChoices = !editing && !isUser && choices && choices.length > 0 && onChoose
  void messageStyle

  // ── first_mes：沉浸式渐入，无 UI 标签，无元数据行 ──
  if (isFirstMes) {
    return (
      <div className="px-4 pt-10 pb-4 gw-first-mes" style={{ fontFamily: 'var(--font-prose)' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, GW_SANITIZE_SCHEMA]]}
          components={ProseComponents}
        >
          {preprocessNarrative(message.content)}
        </ReactMarkdown>
        {!editing && metaLine}
      </div>
    )
  }

  void messageStyle

  return (
    <div className="px-4 py-1.5 flex flex-col">
      {editing ? (
        <EditBox value={editValue} onChange={setEditValue} onCommit={commitEdit} onCancel={() => setEditing(false)} />
      ) : isUser ? (
        <div className="pl-3 border-l-2" style={{ borderColor: 'var(--color-user-border)' }}>
          <p className="text-sm whitespace-pre-wrap leading-[var(--prose-line-height)]"
             style={{ color: 'var(--color-user-text)', fontFamily: 'var(--font-prose)' }}>
            {message.content}
          </p>
        </div>
      ) : (
        <div
          className=""
          style={{
            fontFamily: 'var(--font-prose)',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          }}
        >
          {splitSayBlocks(message.content).map((part, idx) => {
            if (part.type === 'say') return <SayLine key={`say-${idx}`} name={part.name} subtitle={part.subtitle} text={part.text} />
            return (
              <ReactMarkdown
                key={`md-${idx}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, GW_SANITIZE_SCHEMA]]}
                components={ProseComponents}
              >
                {preprocessNarrative(part.text)}
              </ReactMarkdown>
            )
          })}
          {showInlineChoices && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {choices!.map((c) => (
                <button
                  key={c}
                  className="px-3 py-1 text-sm transition-colors rounded-full border"
                  style={{
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--color-accent)'
                  }}
                  onClick={() => onChoose!(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!editing && metaLine}
    </div>
  )
}

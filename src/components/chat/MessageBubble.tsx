import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FloorMessage } from '@/api/types'

interface Props {
  message: FloorMessage
  isFirstMes?: boolean
}

export default function MessageBubble({ message, isFirstMes }: Props) {
  if (isFirstMes) {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className="w-[90%] italic border border-white/20 rounded-lg px-4 py-3 text-center bg-transparent text-sm leading-relaxed text-[var(--color-text-muted)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  const isUser = message.role === 'user'
  return (
    <div className={`flex px-4 py-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isUser ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)]'}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
    </div>
  )
}

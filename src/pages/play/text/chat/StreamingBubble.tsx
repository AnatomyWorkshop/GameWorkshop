import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProseComponents } from './MessageBubble'

interface Props {
  content: string
  messageStyle?: 'prose' | 'bubble'
}

export default function StreamingBubble({ content, messageStyle = 'prose' }: Props) {
  if (messageStyle === 'prose') {
    return (
      <div className="px-4 py-1.5" style={{ fontFamily: 'var(--font-prose)' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={ProseComponents}>
          {content}
        </ReactMarkdown>
        <span className="inline-block w-[2px] h-[0.9em] align-middle ml-0.5 animate-pulse"
              style={{ background: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex px-4 py-1.5 justify-start">
      <div className="max-w-[75%] px-4 py-2 text-sm"
           style={{ borderRadius: 'var(--bubble-radius)', background: 'var(--color-ai-bubble)', color: 'var(--color-text)', fontFamily: 'var(--font-prose)' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={ProseComponents}>
          {content}
        </ReactMarkdown>
        <span className="inline-block w-[2px] h-[0.9em] align-middle ml-0.5 animate-pulse"
              style={{ background: 'var(--color-text-muted)' }} />
      </div>
    </div>
  )
}

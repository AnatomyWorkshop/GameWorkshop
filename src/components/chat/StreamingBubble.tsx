import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props { content: string }

export default function StreamingBubble({ content }: Props) {
  return (
    <div className="flex px-4 py-2 justify-start">
      <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-[var(--color-surface)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        <span className="inline-block w-[2px] h-[1em] bg-current align-middle ml-0.5 animate-pulse" />
      </div>
    </div>
  )
}

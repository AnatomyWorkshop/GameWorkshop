import { useRef, useEffect } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { Floor, FloorMessage } from '@/api/types'
import MessageBubble from './MessageBubble'
import StreamingBubble from './StreamingBubble'

interface Props {
  floors: Floor[]
  streamingBuffer: string | null
  lastOptions?: string[]
  onChoose?: (choice: string) => void
}

export default function MessageList({ floors, streamingBuffer, lastOptions, onChoose }: Props) {
  const ref = useRef<VirtuosoHandle>(null)

  const messages: Array<{ key: string; msg: FloorMessage; globalIndex: number }> = []
  let globalIndex = 0
  for (const floor of floors) {
    for (let i = 0; i < floor.messages.length; i++) {
      messages.push({ key: `${floor.id}-${i}`, msg: floor.messages[i], globalIndex })
      globalIndex++
    }
  }

  const totalItems = messages.length + (streamingBuffer != null ? 1 : 0)

  useEffect(() => {
    ref.current?.scrollToIndex({ index: totalItems - 1, behavior: 'smooth' })
  }, [totalItems])

  return (
    <Virtuoso
      ref={ref}
      className="flex-1"
      totalCount={totalItems}
      itemContent={(index) => {
        if (index < messages.length) {
          const { key, msg, globalIndex: gi } = messages[index]
          const isFirstMes = gi === 0 && msg.role === 'assistant'
          const isLast = index === messages.length - 1
          return (
            <div key={key}>
              <MessageBubble message={msg} isFirstMes={isFirstMes} />
              {isLast && streamingBuffer == null && lastOptions && lastOptions.length > 0 && onChoose && (
                <ChoiceButtonsInline choices={lastOptions} onChoose={onChoose} />
              )}
              {isLast && streamingBuffer == null && msg.role === 'assistant' && (
                <div className="flex justify-end pr-4 pb-1 opacity-30 text-xs select-none">1/1</div>
              )}
            </div>
          )
        }
        return <StreamingBubble content={streamingBuffer ?? ''} />
      }}
    />
  )
}

function ChoiceButtonsInline({ choices, onChoose }: { choices: string[]; onChoose: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {choices.map((c) => (
        <button
          key={c}
          className="rounded-full border border-[var(--color-accent)] text-[var(--color-accent)] px-3 py-1 text-sm hover:bg-[var(--color-accent)] hover:text-white transition-colors"
          onClick={() => onChoose(c)}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

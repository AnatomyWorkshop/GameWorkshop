import { useRef, useEffect } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { Floor, FloorMessage } from '@/api/types'
import MessageBubble from './MessageBubble'
import StreamingBubble from './StreamingBubble'

interface Props {
  floors: Floor[]
  sessionId?: string
  messageStyle?: 'prose' | 'bubble'
  componentSkin?: 'minimal-chrome' | 'glass-ornament'
  streamingBuffer: string | null
  header?: React.ReactNode
  lastOptions?: string[]
  onChoose?: (choice: string) => void
  onFloorEdited?: (floorId: string, newContent: string) => void
  onFloorDeleted?: (floorId: string) => void
}

interface FlatMessage {
  key: string
  msg: FloorMessage
  floorId: string
  floorSeq: number
  createdAt: string
  globalIndex: number
  isLastInFloor: boolean
}

export default function MessageList({ floors, sessionId, messageStyle = 'prose', componentSkin = 'minimal-chrome', streamingBuffer, header, lastOptions, onChoose, onFloorEdited, onFloorDeleted }: Props) {
  const ref = useRef<VirtuosoHandle>(null)

  const messages: FlatMessage[] = []
  let globalIndex = 0
  for (const floor of floors) {
    for (let i = 0; i < floor.messages.length; i++) {
      messages.push({
        key: `${floor.id}-${i}`,
        msg: floor.messages[i],
        floorId: floor.id,
        floorSeq: floor.seq,
        createdAt: floor.created_at,
        globalIndex,
        isLastInFloor: i === floor.messages.length - 1,
      })
      globalIndex++
    }
  }

  const totalItems = messages.length + (streamingBuffer != null ? 1 : 0)

  useEffect(() => {
    ref.current?.scrollToIndex({ index: totalItems - 1, behavior: 'smooth' })
  }, [totalItems])

  const components = {
    Header: () => (
      header ? (
        <div className="sticky top-0 z-10" style={{ background: 'var(--color-bg)' }}>
          {header}
        </div>
      ) : null
    ),
    EmptyPlaceholder: () => (
      header ? (
        <div className="pb-2" />
      ) : (
        <div className="px-4 py-8 text-xs text-[var(--color-text-muted)]">
          暂无消息
        </div>
      )
    ),
  } as const

  return (
    <Virtuoso
      ref={ref}
      className="h-full min-h-0 gw-chat-scroll"
      components={components}
      totalCount={totalItems}
      itemContent={(index) => {
        if (index < messages.length) {
          const { key, msg, floorId, floorSeq, createdAt, globalIndex: gi, isLastInFloor } = messages[index]
          const isFirstMes = gi === 0 && msg.role === 'assistant'
          const isLast = index === messages.length - 1
          const inlineChoices = isLast && isLastInFloor && streamingBuffer == null && lastOptions && lastOptions.length > 0 && onChoose ? lastOptions : undefined

          return (
            <div key={key}>
              <MessageBubble
                message={msg}
                isFirstMes={isFirstMes}
                messageStyle={messageStyle}
                floorId={floorId}
                sessionId={sessionId}
                createdAt={createdAt}
                turnNumber={gi}
                componentSkin={componentSkin}
                choices={inlineChoices}
                onChoose={onChoose}
                onEdited={onFloorEdited}
                onDeleted={onFloorDeleted}
              />
            </div>
          )
        }
        return <StreamingBubble content={streamingBuffer ?? ''} messageStyle={messageStyle} />
      }}
    />
  )
}

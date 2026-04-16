import { useRef, useEffect } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { Floor, FloorMessage, RegexProfileRef } from '@/api/types'
import MessageBubble from './MessageBubble'
import StreamingBubble from './StreamingBubble'

interface Props {
  floors: Floor[]
  sessionId?: string
  messageStyle?: 'prose' | 'bubble'
  componentSkin?: 'minimal-chrome' | 'glass-ornament'
  characters?: Record<string, { avatar_url: string; color?: string }>
  avatarMode?: 'none' | 'script'
  choiceColumns?: number
  optimisticUserMessage?: string | null
  streamingBuffer: string | null
  header?: React.ReactNode
  lastOptions?: string[]
  /** 游戏包声明的正则替换表，透传给 MessageBubble */
  regexProfiles?: RegexProfileRef[]
  onChoose?: (choice: string) => void
  onForkFromFloor?: (floorId: string) => void
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

export default function MessageList({ floors, sessionId, messageStyle = 'prose', componentSkin = 'minimal-chrome', characters, avatarMode = 'none', choiceColumns, optimisticUserMessage, streamingBuffer, header, lastOptions, regexProfiles, onChoose, onForkFromFloor, onFloorEdited, onFloorDeleted }: Props) {
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

  const totalItems = messages.length + (optimisticUserMessage ? 1 : 0) + (streamingBuffer != null ? 1 : 0)

  useEffect(() => {
    ref.current?.scrollToIndex({ index: totalItems - 1, behavior: 'smooth' })
  }, [totalItems])

  useEffect(() => {
    if (streamingBuffer == null) return
    ref.current?.scrollToIndex({ index: totalItems - 1, behavior: 'auto' })
  }, [streamingBuffer, totalItems])

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
      followOutput="smooth"
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
                regexProfiles={regexProfiles}
                onChoose={onChoose}
                onForkFromFloor={onForkFromFloor}
                onEdited={onFloorEdited}
                onDeleted={onFloorDeleted}
                characters={characters}
                avatarMode={avatarMode}
                choiceColumns={choiceColumns}
              />
            </div>
          )
        }
        const optimisticIndex = messages.length
        if (optimisticUserMessage && index === optimisticIndex) {
          return (
            <MessageBubble
              message={{ role: 'user', content: optimisticUserMessage }}
              isFirstMes={false}
              messageStyle={messageStyle}
              floorId="optimistic"
              sessionId={sessionId}
              createdAt={new Date().toISOString()}
              turnNumber={messages.length}
              componentSkin={componentSkin}
              characters={characters}
              avatarMode={avatarMode}
              choiceColumns={choiceColumns}
            />
          )
        }
        return <StreamingBubble content={streamingBuffer ?? ''} messageStyle={messageStyle} />
      }}
    />
  )
}

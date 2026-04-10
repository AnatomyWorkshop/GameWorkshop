import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFloors, useSession } from '@/queries/sessions'
import { useGame } from '@/queries/games'
import MessageList from '@/components/chat/MessageList'
import ChatInput from '@/components/chat/ChatInput'
import TopBar from '@/components/play/TopBar'
import { useStreamStore } from '@/stores/stream'
import type { TurnResponse } from '@/api/types'

export default function PlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const { data: session } = useSession(sessionId!)
  const { data: game } = useGame(session?.game_id ?? '', { enabled: !!session?.game_id })
  const { data: floors = [], refetch } = useFloors(sessionId!)
  const { streaming, buffer } = useStreamStore()
  const [lastOptions, setLastOptions] = useState<string[]>([])

  const inputMode = game?.ui_config?.input_mode ?? 'free'
  const title = game?.title ?? '加载中…'

  useEffect(() => {
    const cs = game?.ui_config?.color_scheme
    if (!cs) return
    const el = document.documentElement
    if (cs.bg) el.style.setProperty('--theme-bg', cs.bg)
    if (cs.text) el.style.setProperty('--theme-text', cs.text)
    if (cs.accent) el.style.setProperty('--theme-accent', cs.accent)
    return () => {
      el.style.removeProperty('--theme-bg')
      el.style.removeProperty('--theme-text')
      el.style.removeProperty('--theme-accent')
    }
  }, [game?.ui_config])

  function handleTurnDone(turn?: TurnResponse) {
    setLastOptions(turn?.options ?? [])
    refetch()
  }

  function handleChoose(choice: string) {
    setLastOptions([])
    window.dispatchEvent(new CustomEvent('gw:choose', { detail: choice }))
  }

  return (
    <div className="gw-theme flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <TopBar title={title} onBack={() => nav(-1)} />
      <MessageList
        floors={floors}
        streamingBuffer={streaming ? buffer : null}
        lastOptions={streaming ? [] : lastOptions}
        onChoose={handleChoose}
      />
      <ChatInput sessionId={sessionId!} inputMode={inputMode} onTurnDone={handleTurnDone} />
    </div>
  )
}

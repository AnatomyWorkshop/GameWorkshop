import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCreateSession } from '@/queries/sessions'
import { socialApi } from '@/api/social'
import type { Game, Session } from '@/api/types'
import SetupFormModal from '@/pages/play/text/panels/gamePresets/SetupFormModal'

const LIB_KEY = 'gw_library'

function addToLibrary(game: Game) {
  try {
    const items: unknown[] = JSON.parse(localStorage.getItem(LIB_KEY) ?? '[]')
    if (items.some((i: unknown) => (i as { game: Game }).game.id === game.id)) return
    items.unshift({ game, source: 'catalog', importedAt: new Date().toISOString() })
    localStorage.setItem(LIB_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

interface Props { game: Game; sessions: Session[] }

export default function ActionBar({ game, sessions }: Props) {
  const nav = useNavigate()
  const create = useCreateSession()
  const latest = sessions[0]
  const setupFields = game.ui_config?.setup_fields

  const { data: myReactions } = useQuery({
    queryKey: ['reactions', 'mine', 'game', game.id],
    queryFn: () => socialApi.getMyReactions('game', game.id),
  })

  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [likeCount, setLikeCount] = useState(game.like_count)
  const [favCount, setFavCount] = useState(game.favorite_count)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    if (myReactions) {
      setLiked(myReactions.like)
      setFavorited(myReactions.favorite)
    }
  }, [myReactions])

  async function handleStart() {
    // 有 setup_fields 时弹出配置表单，否则直接开始
    if (setupFields && setupFields.length > 0) {
      setShowSetup(true)
    } else {
      await doCreateAndNavigate()
    }
  }

  async function doCreateAndNavigate(setupMessage?: string) {
    const result = await create.mutateAsync({ gameId: game.id })
    addToLibrary(game)
    if (setupMessage) {
      sessionStorage.setItem(`gw_setup_${result.session_id}`, setupMessage)
    }
    nav(`/play/${result.session_id}`)
  }

  async function handleSetupConfirm(message: string) {
    // doCreateAndNavigate 内部会 nav() 跳转，组件随即卸载，无需再 setShowSetup
    await doCreateAndNavigate(message)
  }

  async function handleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount(c => c + (next ? 1 : -1))
    try {
      if (next) await socialApi.react('game', game.id, 'like')
      else await socialApi.unreact('game', game.id, 'like')
    } catch {
      setLiked(!next)
      setLikeCount(c => c + (next ? -1 : 1))
    }
  }

  async function handleFavorite() {
    const next = !favorited
    setFavorited(next)
    setFavCount(c => c + (next ? 1 : -1))
    try {
      if (next) await socialApi.react('game', game.id, 'favorite')
      else await socialApi.unreact('game', game.id, 'favorite')
    } catch {
      setFavorited(!next)
      setFavCount(c => c + (next ? -1 : 1))
    }
  }

  const hasSession = sessions.length > 0

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            onClick={handleLike}
          >
            👍 <span>{likeCount}</span>
          </button>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] opacity-40 cursor-not-allowed" disabled title="暂未开放">
            🪙
          </button>
          <button
            className={`flex items-center gap-1 text-sm transition-colors ${favorited ? 'text-yellow-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            onClick={handleFavorite}
          >
            ⭐ <span>{favCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasSession && (
            <button
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
              onClick={() => nav(`/play/${latest.id}`)}
            >
              ↺ 继续
            </button>
          )}
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white font-semibold text-sm disabled:opacity-50"
            onClick={handleStart}
            disabled={create.isPending}
          >
            {create.isPending ? '创建中…' : hasSession ? '＋ 新存档' : '▶ 开始游玩'}
          </button>
        </div>
      </div>

      {showSetup && setupFields && (
        <SetupFormModal
          gameTitle={game.title}
          fields={setupFields}
          formTitle={game.ui_config?.setup_form_title}
          messageHeader={game.ui_config?.setup_message_header}
          confirmLabel={game.ui_config?.setup_confirm_label}
          onConfirm={handleSetupConfirm}
          onCancel={() => setShowSetup(false)}
          loading={create.isPending}
        />
      )}
    </>
  )
}

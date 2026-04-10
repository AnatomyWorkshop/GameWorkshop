import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCreateSession } from '@/queries/sessions'
import { socialApi } from '@/api/social'
import { gamesApi } from '@/api/games'
import type { Game, Session } from '@/api/types'

interface Props { game: Game; sessions: Session[] }

function slugPrefix(slug: string) {
  return slug.replace(/-v\d+$/, '').replace(/-(beta|choice|free|command)$/, '')
}

export default function ActionBar({ game, sessions }: Props) {
  const nav = useNavigate()
  const create = useCreateSession()
  const latest = sessions[0]
  const [showPopover, setShowPopover] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favCount, setFavCount] = useState(game.favorite_count)
  const [likeCount, setLikeCount] = useState(game.like_count)
  const [liked, setLiked] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const isText = game.type === 'text'
  const prefix = slugPrefix(game.slug)

  const { data: allGamesData } = useQuery({
    queryKey: ['games', 'version-list', prefix],
    queryFn: () => gamesApi.list({ limit: 50 }),
    enabled: showPopover && isText,
  })

  const versions = allGamesData?.games.filter(g => slugPrefix(g.slug) === prefix) ?? []

  useEffect(() => {
    if (!showPopover) return
    function handler(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) setShowPopover(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopover])

  async function handleImport(target: Game) {
    setShowPopover(false)
    const result = await create.mutateAsync({ gameId: target.id })
    nav(`/play/${result.session_id}`)
  }

  async function handleImportClick() {
    if (!isText) {
      const result = await create.mutateAsync({ gameId: game.id })
      nav(`/play/${result.session_id}`)
      return
    }
    // For text games: check versions first (optimistic: show popover, direct import if only one)
    setShowPopover(true)
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

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* 左侧：点赞 + 投币(disabled) + 收藏 */}
      <div className="flex items-center gap-3 flex-1">
        <button
          className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          onClick={handleLike}
        >
          👍 <span>{likeCount}</span>
        </button>
        <button
          className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] opacity-40 cursor-not-allowed"
          disabled
          title="暂未开放"
        >
          🪙
        </button>
        <button
          className={`flex items-center gap-1 text-sm transition-colors ${favorited ? 'text-yellow-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          onClick={handleFavorite}
        >
          ⭐ <span>{favCount}</span>
        </button>
      </div>

      {/* 右侧：继续 + 导入/开始游玩 */}
      <div className="flex items-center gap-2 relative" ref={popoverRef}>
        {latest && (
          <button
            className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
            onClick={() => nav(`/play/${latest.id}`)}
          >
            ↺ 继续
          </button>
        )}
        <button
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white font-semibold text-sm disabled:opacity-50"
          onClick={handleImportClick}
          disabled={create.isPending}
        >
          {create.isPending ? '创建中…' : isText ? '⬇ 导入' : '▶ 开始游玩'}
        </button>

        {/* 版本选择弹窗（仅 text 游戏） */}
        {showPopover && isText && (
          <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl z-10">
            <p className="text-xs text-[var(--color-text-muted)] mb-2 px-1">选择版本</p>
            {versions.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] px-1 py-1">加载中…</p>
            )}
            {versions.map(v => (
              <button
                key={v.id}
                onClick={() => handleImport(v)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[var(--color-accent)]/10 truncate"
              >
                {v.slug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

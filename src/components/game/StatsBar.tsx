import type { Game, GameStats } from '@/api/types'

interface Props { game: Game; stats?: GameStats }

export default function StatsBar({ game, stats }: Props) {
  return (
    <div className="flex gap-4 text-sm text-[var(--color-text-muted)] mb-4">
      <span>{game.play_count.toLocaleString()} 次游玩</span>
      <span>{game.favorite_count.toLocaleString()} 收藏</span>
      {stats && <span>{stats.comment_count.toLocaleString()} 评论</span>}
    </div>
  )
}

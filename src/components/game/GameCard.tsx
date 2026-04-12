import { Heart } from 'lucide-react'
import type { Game } from '@/api/types'

const TYPE_LABEL: Record<string, string> = { text: 'T', light: 'L', rich: 'R' }

function fallbackGradient(id: string) {
  const h = id.charCodeAt(0) * 137 % 360
  return `linear-gradient(135deg, hsl(${h},50%,25%), hsl(${(h + 60) % 360},50%,18%))`
}

interface Props {
  game: Game
  onClick: (game: Game) => void
}

export default function GameCard({ game, onClick }: Props) {
  return (
    <div
      className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{ backgroundColor: 'var(--color-surface)' }}
      onClick={() => onClick(game)}
    >
      {/* 封面区 2:3 竖版 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full" style={{ background: fallbackGradient(game.id) }} />
        )}
        {/* 类型徽章 */}
        <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          {TYPE_LABEL[game.type] ?? game.type}
        </span>
        {/* hover 遮罩 + 简介 */}
        {game.short_desc && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
            <p className="text-xs text-white/90 line-clamp-3 leading-relaxed">{game.short_desc}</p>
          </div>
        )}
      </div>
      {/* 信息区 */}
      <div className="px-3 py-2.5">
        <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {game.title}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {game.author_id ? game.author_id.slice(0, 8) : '匿名'}
          </p>
          {game.like_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              <Heart size={10} />
              {game.like_count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

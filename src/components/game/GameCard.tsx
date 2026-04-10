import type { Game } from '@/api/types'

const TYPE_LABEL: Record<string, string> = { text: 'T', light: 'L', rich: 'R' }

function fallbackGradient(id: string) {
  const h = id.charCodeAt(0) * 137 % 360
  return `linear-gradient(135deg, hsl(${h},60%,40%), hsl(${(h + 60) % 360},60%,30%))`
}

interface Props {
  game: Game
  onClick: (game: Game) => void
}

export default function GameCard({ game, onClick }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors"
      onClick={() => onClick(game)}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {game.cover_url
          ? <img src={game.cover_url} alt={game.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: fallbackGradient(game.id) }} />
        }
        <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded bg-black/50 text-white leading-none">
          {TYPE_LABEL[game.type] ?? game.type}
        </span>
      </div>
      <div className="p-3">
        <p className="font-semibold truncate">{game.title}</p>
        {game.short_desc && <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mt-1">{game.short_desc}</p>}
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{game.play_count} 次游玩</p>
      </div>
    </div>
  )
}

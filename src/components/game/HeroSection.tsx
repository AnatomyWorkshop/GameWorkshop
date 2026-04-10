import type { Game } from '@/api/types'

function fallbackGradient(id: string) {
  const h = id.charCodeAt(0) * 137 % 360
  return `linear-gradient(135deg, hsl(${h},60%,40%), hsl(${(h + 60) % 360},60%,30%))`
}

const TYPE_LABEL: Record<string, string> = { text: '文字', light: '轻量', rich: '视觉小说' }

interface Props { game: Game }

export default function HeroSection({ game }: Props) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4">
      {game.cover_url
        ? <img src={game.cover_url} alt={game.title} className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ background: fallbackGradient(game.id) }} />
      }
      {/* 渐变遮罩 */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end gap-2">
          <h1 className="text-white text-xl font-bold flex-1 leading-tight">{game.title}</h1>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
            {TYPE_LABEL[game.type] ?? game.type}
          </span>
        </div>
        {game.short_desc && <p className="text-white/70 text-sm mt-1 line-clamp-2">{game.short_desc}</p>}
      </div>
    </div>
  )
}

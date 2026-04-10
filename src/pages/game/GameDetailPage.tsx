import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '@/queries/games'
import { useSessionList } from '@/queries/sessions'
import { useGameStats } from '@/queries/social'
import HeroSection from '@/components/game/HeroSection'
import ActionBar from '@/components/game/ActionBar'
import StatsBar from '@/components/game/StatsBar'
import CommentCore from '@/components/social/CommentCore'

type Tab = 'overview' | 'comments'

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: game, isLoading } = useGame(slug!)
  const { data: sessions = [] } = useSessionList(game?.id ?? '')
  const { data: stats } = useGameStats(game?.id ?? '')
  const [tab, setTab] = useState<Tab>('overview')

  if (isLoading) return <div className="text-center py-20">加载中…</div>
  if (!game) return <div className="text-center py-20">游戏不存在</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <HeroSection game={game} />
      <ActionBar game={game} sessions={sessions} />
      <StatsBar game={game} stats={stats} />

      {/* TabNav */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {(['overview', 'comments'] as Tab[]).map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-text-muted)]'}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? '概述' : '评论'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          {game.notes || game.short_desc || '暂无介绍'}
        </div>
      )}
      {tab === 'comments' && <CommentCore gameId={game.id} />}
    </div>
  )
}

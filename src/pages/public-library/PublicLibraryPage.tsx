import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameList } from '@/queries/games'
import GameCard from '@/components/game/GameCard'
import type { Game } from '@/api/types'

const TYPE_FILTERS = ['全部', 'T', 'L', 'R'] as const
const TAG_FILTERS = ['全部', '悬疑', '恋爱', '校园', '奇幻', '科幻', '经营', '恐怖', '轻松'] as const

export default function PublicLibraryPage() {
  const nav = useNavigate()
  const [typeFilter, setTypeFilter] = useState<string>('全部')
  const [tagFilter, setTagFilter] = useState<string>('全部')

  const typeParam = typeFilter === '全部' ? undefined : typeFilter.toLowerCase()
  const tagsParam = tagFilter === '全部' ? undefined : tagFilter

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useGameList({
    type: typeParam,
    tags: tagsParam,
  })
  const games = data?.pages.flatMap(p => p.games) ?? []

  return (
    <div>
      {/* 筛选区 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {TYPE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
            style={typeFilter === f
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }
            }
            onMouseEnter={e => { if (typeFilter !== f) e.currentTarget.style.color = 'var(--color-text)' }}
            onMouseLeave={e => { if (typeFilter !== f) e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        {TAG_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTagFilter(f)}
            className="px-3 py-1 rounded-full text-xs transition-all duration-150"
            style={tagFilter === f
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
            onMouseEnter={e => { if (tagFilter !== f) e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onMouseLeave={e => { if (tagFilter !== f) e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 游戏网格 */}
      {games.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {games.map((g: Game) => (
            <GameCard key={g.id} game={g} onClick={() => nav(`/games/${g.slug}`)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {typeFilter !== '全部' || tagFilter !== '全部'
              ? '没有找到匹配的游戏，试试其他筛选条件'
              : '暂无游戏'}
          </p>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            {isFetchingNextPage ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  )
}

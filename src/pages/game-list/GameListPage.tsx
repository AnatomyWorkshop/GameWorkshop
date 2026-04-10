import { useNavigate } from 'react-router-dom'
import { useGameList } from '@/queries/games'
import GameCard from '@/components/game/GameCard'
import type { Game } from '@/api/types'

export default function GameListPage() {
  const nav = useNavigate()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useGameList()
  const games = data?.pages.flatMap(p => p.games) ?? []

  function handleGameClick(game: Game) {
    nav(`/games/${game.slug}`)
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map(g => <GameCard key={g.id} game={g} onClick={handleGameClick} />)}
      </div>
      {hasNextPage && (
        <button
          className="mt-6 mx-auto block px-6 py-2 rounded bg-[var(--color-accent)] text-white"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '加载中…' : '加载更多'}
        </button>
      )}
    </div>
  )
}

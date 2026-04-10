import { useComments } from '@/queries/social'

interface Props { gameId: string }

export default function CommentCore({ gameId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useComments(gameId)
  const comments = data?.pages.flatMap(p => p.comments) ?? []

  if (isLoading) return <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">加载评论…</div>
  if (!comments.length) return <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">暂无评论</div>

  return (
    <div>
      {comments.map(c => (
        <div key={c.id} className="py-3 border-b border-[var(--color-border)] last:border-0">
          <p className="text-sm">{c.content}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{new Date(c.created_at).toLocaleDateString('zh-CN')}</p>
        </div>
      ))}
      {hasNextPage && (
        <button
          className="w-full py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '加载中…' : '加载更多评论'}
        </button>
      )}
    </div>
  )
}

import { useState } from 'react'

interface Props {
  title: string
  onBack: () => void
}

export default function TopBar({ title, onBack }: Props) {
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] shrink-0">
      <button
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none p-1"
        onClick={onBack}
        aria-label="返回"
      >
        ←
      </button>
      <button
        disabled
        title="个人游戏库（即将上线）"
        className="p-1 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed text-sm"
      >
        📚
      </button>
      <span className="flex-1 text-center font-medium text-sm truncate">{title}</span>
      <button
        disabled
        title="世界书（即将上线）"
        className="p-1 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed text-sm"
      >
        🌍
      </button>
      <button
        disabled
        title="游戏数据（即将上线）"
        className="p-1 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed text-sm"
      >
        📊
      </button>
      <div className="relative">
        <button
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm"
          onClick={() => setArchiveOpen(o => !o)}
          aria-label="存档"
        >
          ···
        </button>
        {archiveOpen && (
          <div className="absolute top-full right-0 mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-20 py-1">
            <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">暂无存档</p>
          </div>
        )}
      </div>
    </div>
  )
}

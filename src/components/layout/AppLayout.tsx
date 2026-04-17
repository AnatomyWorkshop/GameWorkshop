import { Outlet, NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="h-14 border-b border-[var(--color-border)] flex items-center px-6 gap-6 shrink-0">
        <span className="font-bold text-lg">GameWorkshop</span>
        <nav className="flex gap-1 flex-1">
          {([['/', '公共游戏库'], ['/library', '我的游戏库']] as const).map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm transition-colors ${isActive ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          aria-label="模型配置"
          title="模型配置"
          onClick={() => window.dispatchEvent(new CustomEvent('gw:settings'))}
        >
          <Settings size={18} />
        </button>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

import { Outlet, NavLink } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="h-14 border-b border-[var(--color-border)] flex items-center px-6 gap-6 shrink-0">
        <span className="font-bold text-lg">GameWorkshop</span>
        <nav className="flex gap-1">
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
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

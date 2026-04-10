import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="h-14 border-b border-[var(--color-border)] flex items-center px-6 gap-4">
        <a href="/" className="font-bold text-lg">GameWorkshop</a>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

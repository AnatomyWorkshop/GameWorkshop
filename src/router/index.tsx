import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'

const GameList = lazy(() => import('@/pages/game-list/GameListPage'))
const GameDetail = lazy(() => import('@/pages/game/GameDetailPage'))
const Play = lazy(() => import('@/pages/play/PlayPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Suspense fallback={null}><GameList /></Suspense> },
      { path: 'games/:slug', element: <Suspense fallback={null}><GameDetail /></Suspense> },
    ],
  },
  // Play page is full-screen, outside AppLayout
  { path: 'play/:sessionId', element: <Suspense fallback={null}><Play /></Suspense> },
])

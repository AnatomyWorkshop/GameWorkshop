import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'

const PublicLibrary = lazy(() => import('@/pages/public-library/PublicLibraryPage'))
const GameDetail = lazy(() => import('@/pages/game/GameDetailPage'))
const TextSession = lazy(() => import('@/pages/play/text/TextPlayPage'))
const MyLibrary = lazy(() => import('@/pages/my-library/MyLibraryPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Suspense fallback={null}><PublicLibrary /></Suspense> },
      { path: 'games/:slug', element: <Suspense fallback={null}><GameDetail /></Suspense> },
      { path: 'library', element: <Suspense fallback={null}><MyLibrary /></Suspense> },
    ],
  },
  // TextSessionPage is full-screen, outside AppLayout
  { path: 'play/:sessionId', element: <Suspense fallback={null}><TextSession /></Suspense> },
])

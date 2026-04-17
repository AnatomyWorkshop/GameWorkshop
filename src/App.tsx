import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router'
import GlobalSettingsDrawer from '@/components/GlobalSettingsDrawer'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <GlobalSettingsDrawer />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        duration={1200}
        toastOptions={{
          style: { fontFamily: 'var(--font-prose, Inter, system-ui, sans-serif)', fontSize: '13px' },
        }}
      />
    </QueryClientProvider>
  )
}

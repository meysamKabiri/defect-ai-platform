import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from '@/app/store'
import { router } from '@/app/router/router'
import { SessionBootstrap } from '@/app/providers/SessionBootstrap'
import { ThemeProvider } from '@/providers/theme/ThemeProvider'

export function AppProviders() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
      </ThemeProvider>
    </Provider>
  )
}

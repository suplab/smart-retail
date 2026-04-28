import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

// Only configure Amplify when real Cognito env vars are provided.
// In local dev / demo mode the useAuth hook falls back to mock auth.
const cognitoPoolId  = import.meta.env.VITE_COGNITO_USER_POOL_ID  as string | undefined
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID     as string | undefined

if (cognitoPoolId && cognitoClientId) {
  // Dynamic import so the Amplify bundle is excluded from the demo build
  void import('aws-amplify').then(({ Amplify }) => {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId:       cognitoPoolId,
          userPoolClientId: cognitoClientId,
          loginWith: { email: true },
        },
      },
    })
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           60_000,  // 60 s — matches ARS Cache-Control max-age
      retry:               2,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} position="bottom" />}
    </QueryClientProvider>
  </React.StrictMode>,
)

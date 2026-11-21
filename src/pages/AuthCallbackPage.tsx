import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Alert, Button, Stack } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { FullPageSpinner } from '@/components/FullPageStatus'
import { useAuth } from '@/hooks/useAuth'
import { oidc } from '@/services/oidc'

// The code is single use: StrictMode's second effect must reuse the first exchange.
let exchange: { search: string; result: ReturnType<typeof oidc.complete> } | null = null

function complete(search: string) {
  if (exchange?.search !== search) exchange = { search, result: oidc.complete(search) }
  return exchange.result
}

/** /auth/callback: authentik sends the browser back here with the code. */
export function AuthCallbackPage() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const { acceptToken } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    complete(search)
      .then(async ({ accessToken, returnTo }) => {
        await acceptToken(accessToken)
        if (live) navigate(returnTo, { replace: true })
      })
      .catch((err: unknown) => live && setError(err instanceof Error ? err.message : 'Não foi possível entrar.'))
    return () => {
      live = false
    }
  }, [search, acceptToken, navigate])

  if (!error) return <FullPageSpinner />
  return (
    <AuthLayout title="Entrar">
      <Stack spacing={2.5}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/login', { replace: true })}>
          Entrar de novo
        </Button>
      </Stack>
    </AuthLayout>
  )
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Alert, Button, Stack } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { oidc } from '@/services/oidc'
import { leaveTo } from '@/utils/leave'

/** /login with authentik: straight to its login, back to the page that asked for it. */
export function AuthentikLogin() {
  const { notice } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // A session that just ended says why first; the button goes on from there.
    if (notice) return
    let live = true
    oidc
      .loginUrl(from)
      .then((url) => live && leaveTo(url))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [from, notice])

  const go = () => void oidc.loginUrl(from).then(leaveTo, () => setFailed(true))

  return (
    <AuthLayout title="Entrar" subtitle="Use sua conta do trem para acessar os serviços do servidor.">
      <Stack spacing={2.5}>
        {notice && <Alert severity="info">{notice}</Alert>}
        {failed && <Alert severity="error">Não foi possível abrir o login. Tente de novo.</Alert>}
        <Button variant="contained" size="large" onClick={go} loading={!notice && !failed}>
          Entrar
        </Button>
      </Stack>
    </AuthLayout>
  )
}

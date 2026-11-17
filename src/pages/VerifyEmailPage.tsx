import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { authApi } from '@/services/authApi'
import { clearEmailToken, peekEmailToken } from '@/utils/emailLinks'

type State = { kind: 'checking' } | { kind: 'done'; message: string } | { kind: 'failed'; message: string }

export function VerifyEmailPage() {
  const [state, setState] = useState<State>(() =>
    peekEmailToken('verify-email')
      ? { kind: 'checking' }
      : { kind: 'failed', message: 'Abra o link que enviamos por e-mail para confirmar o cadastro.' },
  )
  const started = useRef(false)

  useEffect(() => {
    const token = peekEmailToken('verify-email')
    // The token is single use: StrictMode's second effect must not send it again.
    if (!token || started.current) return
    started.current = true
    authApi
      .verifyEmail(token)
      .then((res) => setState({ kind: 'done', message: res.message }))
      .catch((err: unknown) =>
        setState({ kind: 'failed', message: err instanceof Error ? err.message : 'Link inválido ou expirado' }),
      )
      .finally(() => clearEmailToken('verify-email'))
  }, [])

  return (
    <AuthLayout title="Confirmação de e-mail">
      {state.kind === 'checking' && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="status">
          <CircularProgress size={20} />
          <Typography>Confirmando…</Typography>
        </Stack>
      )}
      {state.kind === 'done' && (
        <Stack spacing={2.5}>
          <Alert severity="success">{state.message}</Alert>
          <Typography variant="body2" color="text.secondary">
            O administrador aprova a conta e libera os serviços. Até lá, o login avisa que o cadastro aguarda
            aprovação.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained">
            Ir para o login
          </Button>
        </Stack>
      )}
      {state.kind === 'failed' && (
        <Stack spacing={2.5}>
          <Alert severity="error">{state.message}</Alert>
          <Typography variant="body2" color="text.secondary">
            O link vale por 24 horas e funciona uma vez. Se ele expirou, faça o cadastro de novo com o mesmo e-mail
            para receber outro.
          </Typography>
          <Button component={RouterLink} to="/register" variant="outlined">
            Voltar ao cadastro
          </Button>
        </Stack>
      )}
    </AuthLayout>
  )
}

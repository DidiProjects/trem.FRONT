import { useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { useCountdown } from '@/hooks/useCountdown'
import { useForm } from '@/hooks/useForm'
import { authApi } from '@/services/authApi'
import { ApiError } from '@/services/http'
import { emailSchema } from '@/utils/validation'

const RESEND_WAIT_SECONDS = 60

export function ForgotPasswordPage() {
  const form = useForm({ email: '' }, emailSchema)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useCountdown()

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    setError(null)
    if (!form.check()) return
    setBusy(true)
    try {
      await authApi.forgotPassword(form.values.email.trim().toLowerCase())
      setSent(true)
      setWait(RESEND_WAIT_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o link.')
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Esqueci a senha"
      subtitle={sent ? undefined : 'Informe o e-mail da conta. Enviamos um link para criar uma senha nova.'}
      footer={
        <Link component={RouterLink} to="/login">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <Stack spacing={2.5}>
          <Alert severity="success">
            Se houver uma conta ativa com <strong>{form.values.email.trim()}</strong>, o link chega em instantes.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            O link vale por 60 minutos e funciona uma vez. Não chegou? Confira o spam ou peça outro.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="outlined" onClick={() => void submit()} disabled={wait > 0} loading={busy}>
            {wait > 0 ? `Reenviar em ${wait} s` : 'Reenviar link'}
          </Button>
        </Stack>
      ) : (
        <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField {...form.field('email')} label="E-mail" type="email" autoComplete="email" autoFocus />
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={wait > 0}>
            {wait > 0 ? `Aguarde ${wait} s` : 'Enviar link'}
          </Button>
        </Stack>
      )}
    </AuthLayout>
  )
}

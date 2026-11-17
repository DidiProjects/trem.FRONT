import { useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import MarkEmailRead from '@mui/icons-material/MarkEmailRead'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordChecklist } from '@/components/PasswordChecklist'
import { PasswordField } from '@/components/PasswordField'
import { useCountdown } from '@/hooks/useCountdown'
import { useForm } from '@/hooks/useForm'
import { authApi } from '@/services/authApi'
import { ApiError } from '@/services/http'
import { fieldErrorsOf } from '@/utils/apiErrors'
import { registerSchema } from '@/utils/validation'

const RESEND_WAIT_SECONDS = 60

export function RegisterPage() {
  const form = useForm({ username: '', email: '', password: '', confirm: '' }, registerSchema)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useCountdown()
  const [resent, setResent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!form.check()) return
    setBusy(true)
    try {
      const email = form.values.email.trim().toLowerCase()
      await authApi.register(form.values.username.trim(), email, form.values.password)
      setSentTo(email)
      setWait(RESEND_WAIT_SECONDS)
    } catch (err) {
      const fields = fieldErrorsOf(err)
      if (fields) form.setServerErrors(fields)
      else setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!sentTo) return
    setError(null)
    try {
      await authApi.resendVerification(sentTo)
      setResent(true)
      setWait(RESEND_WAIT_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reenviar.')
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Confira seu e-mail"
        footer={
          <Link component={RouterLink} to="/login">
            Voltar para o login
          </Link>
        }
      >
        <Stack spacing={2.5} sx={{ alignItems: 'flex-start' }}>
          <MarkEmailRead color="primary" sx={{ fontSize: 40 }} />
          <Typography>
            Se o cadastro puder seguir, enviamos um link de confirmação para <strong>{sentTo}</strong>. Ele vale por 24
            horas.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Depois da confirmação, o administrador aprova a conta e libera os serviços. Até lá, o login avisa que o
            cadastro aguarda aprovação.
          </Typography>
          {resent && <Alert severity="success">Enviamos de novo. Confira também a caixa de spam.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="outlined" onClick={resend} disabled={wait > 0}>
            {wait > 0 ? `Reenviar em ${wait} s` : 'Reenviar e-mail'}
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="O cadastro passa por confirmação de e-mail e aprovação do administrador."
      footer={
        <>
          Já tem conta?{' '}
          <Link component={RouterLink} to="/login">
            Entrar
          </Link>
        </>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          {...form.field('username')}
          label="Usuário"
          autoComplete="username"
          autoFocus
          slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false, maxLength: 50 } }}
        />
        <TextField {...form.field('email')} label="E-mail" type="email" autoComplete="email" />
        <PasswordField {...form.field('password')} label="Senha" autoComplete="new-password" />
        <PasswordChecklist password={form.values.password} username={form.values.username} email={form.values.email} />
        <PasswordField {...form.field('confirm')} label="Confirme a senha" autoComplete="new-password" />
        <Button type="submit" variant="contained" size="large" loading={busy} disabled={wait > 0}>
          {wait > 0 ? `Aguarde ${wait} s` : 'Criar conta'}
        </Button>
      </Stack>
    </AuthLayout>
  )
}

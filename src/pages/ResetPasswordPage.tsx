import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router'
import { Alert, Button, Link, Stack } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordChecklist } from '@/components/PasswordChecklist'
import { PasswordField } from '@/components/PasswordField'
import { useForm } from '@/hooks/useForm'
import { authApi } from '@/services/authApi'
import { ApiError } from '@/services/http'
import { clearEmailToken, peekEmailToken } from '@/utils/emailLinks'
import { fieldErrorsOf } from '@/utils/apiErrors'
import { newPasswordSchema } from '@/utils/validation'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [token] = useState(() => peekEmailToken('reset-password'))
  const form = useForm({ current: '', password: '', confirm: '' }, newPasswordSchema())
  const [error, setError] = useState<string | null>(null)
  const [linkDead, setLinkDead] = useState(!token)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!token || !form.check()) return
    setBusy(true)
    try {
      await authApi.resetPassword(token, form.values.password)
      clearEmailToken('reset-password')
      navigate('/login', { replace: true, state: { message: 'Senha redefinida. Entre com a senha nova.' } })
    } catch (err) {
      const fields = fieldErrorsOf(err)
      if (fields) form.setServerErrors(fields)
      else if (err instanceof ApiError && err.status === 400) {
        clearEmailToken('reset-password')
        setLinkDead(true)
      } else setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.')
    } finally {
      setBusy(false)
    }
  }

  if (linkDead) {
    return (
      <AuthLayout title="Link inválido ou expirado">
        <Stack spacing={2.5}>
          <Alert severity="warning">
            O link de redefinição vale por 60 minutos e funciona uma vez. Peça um novo para continuar.
          </Alert>
          <Button component={RouterLink} to="/forgot-password" variant="contained">
            Pedir novo link
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Criar senha nova"
      subtitle="Ao salvar, todas as sessões abertas da conta são encerradas."
      footer={
        <Link component={RouterLink} to="/login">
          Voltar para o login
        </Link>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <PasswordField {...form.field('password')} label="Senha nova" autoComplete="new-password" autoFocus />
        <PasswordChecklist password={form.values.password} />
        <PasswordField {...form.field('confirm')} label="Confirme a senha nova" autoComplete="new-password" />
        <Button type="submit" variant="contained" size="large" loading={busy}>
          Salvar senha
        </Button>
      </Stack>
    </AuthLayout>
  )
}

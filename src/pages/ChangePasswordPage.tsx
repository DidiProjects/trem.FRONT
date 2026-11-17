import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Stack } from '@mui/material'
import { useSnackbar } from 'notistack'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordChecklist } from '@/components/PasswordChecklist'
import { PasswordField } from '@/components/PasswordField'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from '@/hooks/useForm'
import { ApiError } from '@/services/http'
import { fieldErrorsOf } from '@/utils/apiErrors'
import { newPasswordSchema } from '@/utils/validation'

export function ChangePasswordPage() {
  const { user, status, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const forced = status === 'must-change-password'
  const username = user?.username ?? ''
  const email = user?.email ?? ''
  const form = useForm(
    { current: '', password: '', confirm: '' },
    newPasswordSchema({ username, email, requireCurrent: true }),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!form.check()) return
    setBusy(true)
    try {
      await changePassword(form.values.current, form.values.password)
      enqueueSnackbar('Senha alterada', { variant: 'success' })
      navigate('/', { replace: true })
    } catch (err) {
      const fields = fieldErrorsOf(err)
      if (fields) form.setServerErrors(fields)
      else if (err instanceof ApiError && err.status === 401 && err.message === 'Senha atual incorreta') {
        form.setServerErrors({ current: err.message })
      } else setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={forced ? 'Defina sua senha' : 'Alterar senha'}
      subtitle={
        forced
          ? 'Você entrou com uma senha provisória. Crie a sua para continuar.'
          : 'As outras sessões abertas da conta serão encerradas.'
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {/* Lets password managers attach the new password to the right account. */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <PasswordField
          {...form.field('current')}
          label={forced ? 'Senha provisória' : 'Senha atual'}
          autoComplete="current-password"
          autoFocus
        />
        <PasswordField {...form.field('password')} label="Senha nova" autoComplete="new-password" />
        <PasswordChecklist password={form.values.password} username={username} email={email} />
        <PasswordField {...form.field('confirm')} label="Confirme a senha nova" autoComplete="new-password" />
        <Button type="submit" variant="contained" size="large" loading={busy}>
          Salvar senha
        </Button>
        {forced ? (
          <Button onClick={() => void logout()} color="inherit">
            Sair
          </Button>
        ) : (
          <Button onClick={() => navigate(-1)} color="inherit">
            Cancelar
          </Button>
        )}
      </Stack>
    </AuthLayout>
  )
}

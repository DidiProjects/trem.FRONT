import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordField } from '@/components/PasswordField'
import { useAuth } from '@/hooks/useAuth'
import { useCountdown } from '@/hooks/useCountdown'
import { useForm } from '@/hooks/useForm'
import { ApiError } from '@/services/http'
import { loginSchema, recoverySchema, totpSchema } from '@/utils/validation'

const WRONG_CODE = 'Código inválido'

type Step ={ kind: 'credentials' } | { kind: 'mfa'; mfaToken: string; recovery: boolean }

interface LocationState {
  from?: string
  message?: string
}

function errorText(error: unknown, wait: number): string {
  if (error instanceof ApiError && error.status === 429) return `Muitas tentativas. Tente de novo em ${wait} s.`
  return error instanceof Error ? error.message : 'Não foi possível entrar.'
}

export function LoginPage() {
  const { login, verifyMfa, notice, clearNotice, pendingMfa, clearPendingMfa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const [step, setStep] = useState<Step>(() =>
    pendingMfa ? { kind: 'mfa', mfaToken: pendingMfa.mfaToken, recovery: false } : { kind: 'credentials' },
  )
  const [info, setInfo] = useState<string | null>(pendingMfa?.message ?? state.message ?? notice)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useCountdown()
  const codeRef = useRef<HTMLInputElement>(null)

  const credentials = useForm({ username: '', password: '' }, loginSchema)
  const mfaForm = useForm({ code: '' }, step.kind === 'mfa' && step.recovery ? recoverySchema : totpSchema)

  useEffect(() => {
    // Both were taken into this page's state: they belong to this visit only.
    clearPendingMfa()
    clearNotice()
  }, [clearPendingMfa, clearNotice])

  useEffect(() => {
    if (step.kind === 'mfa') codeRef.current?.focus()
  }, [step])

  const fail = (err: unknown) => {
    if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter)
    setError(err)
  }

  const done = () => navigate(state.from && state.from !== '/login' ? state.from : '/', { replace: true })

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!credentials.check()) return
    setBusy(true)
    try {
      const result = await login(credentials.values.username.trim(), credentials.values.password)
      if (result.kind === 'mfa') {
        setInfo(null)
        setStep({ kind: 'mfa', mfaToken: result.mfaToken, recovery: false })
      } else done()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (event?: FormEvent) => {
    event?.preventDefault()
    if (step.kind !== 'mfa') return
    setError(null)
    if (!mfaForm.check()) return
    setBusy(true)
    try {
      const code = mfaForm.values.code.trim()
      await verifyMfa(step.mfaToken, step.recovery ? { recovery_code: code } : { code })
      done()
    } catch (err) {
      // A wrong code keeps the step; any other 401 means the short-lived challenge is
      // gone (expired, or the account changed), so start over.
      if (err instanceof ApiError && err.status === 401 && err.message !== WRONG_CODE) {
        setStep({ kind: 'credentials' })
        setInfo('O tempo para informar o código acabou. Entre de novo.')
        credentials.setValue('password', '')
      } else fail(err)
      mfaForm.setValue('code', '')
    } finally {
      setBusy(false)
    }
  }

  if (step.kind === 'mfa') {
    const codeField = mfaForm.field('code')
    return (
      <AuthLayout
        title="Verificação em duas etapas"
        subtitle={
          step.recovery
            ? 'Informe um dos códigos de recuperação que você guardou. Cada um vale uma vez.'
            : 'Abra o app autenticador e informe o código de 6 dígitos.'
        }
      >
        <Stack component="form" spacing={2.5} onSubmit={submitCode} noValidate>
          {info && <Alert severity="info">{info}</Alert>}
          {Boolean(error) && <Alert severity="error">{errorText(error, wait)}</Alert>}
          <TextField
            {...codeField}
            inputRef={codeRef}
            label={step.recovery ? 'Código de recuperação' : 'Código'}
            autoComplete="one-time-code"
            onChange={(e) => {
              const value = step.recovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6)
              mfaForm.setValue('code', value)
            }}
            slotProps={{
              htmlInput: step.recovery
                ? { autoCapitalize: 'none', spellCheck: false }
                : { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6, style: { letterSpacing: '0.4em', fontSize: '1.25rem' } },
            }}
          />
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={wait > 0}>
            Verificar
          </Button>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Link
              component="button"
              type="button"
              onClick={() => {
                setError(null)
                mfaForm.setValue('code', '')
                setStep({ ...step, recovery: !step.recovery })
              }}
            >
              {step.recovery ? 'Usar o app autenticador' : 'Usar código de recuperação'}
            </Link>
            <Link
              component="button"
              type="button"
              onClick={() => {
                setError(null)
                setInfo(null)
                setStep({ kind: 'credentials' })
              }}
            >
              Voltar
            </Link>
          </Stack>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Use sua conta do trem para acessar os serviços do servidor."
      footer={
        <>
          Não tem conta?{' '}
          <Link component={RouterLink} to="/register">
            Criar conta
          </Link>
        </>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={submitCredentials} noValidate>
        {info && <Alert severity="info">{info}</Alert>}
        {Boolean(error) && <Alert severity="error">{errorText(error, wait)}</Alert>}
        <TextField
          {...credentials.field('username')}
          label="Usuário"
          autoComplete="username"
          autoFocus
          slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
        />
        <PasswordField {...credentials.field('password')} label="Senha" autoComplete="current-password" />
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: -1 }}>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Esqueci a senha
          </Link>
        </Stack>
        <Button type="submit" variant="contained" size="large" loading={busy} disabled={wait > 0}>
          {wait > 0 ? `Aguarde ${wait} s` : 'Entrar'}
        </Button>
      </Stack>
    </AuthLayout>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Checkbox, FormControlLabel, Link, Stack, TextField } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { FullPageSpinner } from '@/components/FullPageStatus'
import { PasswordField } from '@/components/PasswordField'
import { authentikFlow, FLOW_ERROR, type Challenge } from '@/services/authentikFlow'
import { leaveTo } from '@/utils/leave'
import { translate } from './messages'

function firstError(challenge: Challenge, ...fields: string[]): string | undefined {
  for (const field of fields) {
    const message = challenge.response_errors?.[field]?.[0]?.string
    if (message) return translate(message)
  }
  return undefined
}

/** authentik's login flow drawn with trem.FRONT's own screens. */
export function LoginApp({ slug, query }: { slug: string; query: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(false)
  const answered = useRef<Challenge | null>(null)

  useEffect(() => {
    let live = true
    authentikFlow
      .start(slug, query)
      .then((c) => live && setChallenge(c))
      .catch(() => live && setFailure(FLOW_ERROR))
    return () => {
      live = false
    }
  }, [slug, query])

  useEffect(() => {
    if (challenge?.component === 'xak-flow-redirect' && challenge.to) leaveTo(challenge.to)
  }, [challenge])

  const send = async (event: FormEvent | null, body: Record<string, unknown>) => {
    event?.preventDefault()
    if (!challenge) return
    setBusy(true)
    setFailure(null)
    try {
      const next = await authentikFlow.submit(slug, query, { component: challenge.component, ...body })
      if (next.component !== challenge.component) {
        setPassword('')
        setCode('')
      }
      setChallenge(next)
    } catch {
      setFailure(FLOW_ERROR)
    } finally {
      setBusy(false)
    }
  }

  // authentik asks "stay signed in?" as its own step after the password and the code; the
  // answer was already given with the checkbox next to the password.
  const askedToRemember = challenge?.component === 'ak-stage-user-login'
  useEffect(() => {
    if (!askedToRemember || answered.current === challenge) return
    answered.current = challenge
    void send(null, { remember_me: remember })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per challenge
  }, [challenge])

  if (!challenge || challenge.component === 'xak-flow-redirect' || askedToRemember) {
    return failure ? (
      <AuthLayout title="Entrar">
        <Alert severity="error">{failure}</Alert>
      </AuthLayout>
    ) : (
      <FullPageSpinner />
    )
  }

  const app = challenge.application_pre
  const subtitle = app
    ? `Use sua conta do trem para continuar em ${app}.`
    : 'Use sua conta do trem para acessar os serviços do servidor.'
  const cancel = challenge.flow_info?.cancel_url
  const otherAccount = cancel && (
    <Link href={cancel} variant="body2" sx={{ textAlign: 'center' }}>
      Entrar com outra conta
    </Link>
  )

  const rememberBox = (
    <FormControlLabel
      control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
      label="Manter conectado"
      sx={{ mt: -1 }}
    />
  )

  if (challenge.component === 'ak-stage-identification') {
    const error = firstError(challenge, 'non_field_errors', 'password')
    return (
      <AuthLayout title="Entrar" subtitle={subtitle}>
        <Stack
          component="form"
          spacing={2.5}
          noValidate
          onSubmit={(e) => send(e, { uid_field: username.trim(), ...(challenge.password_fields ? { password } : {}) })}
        >
          {(failure || error) && <Alert severity="error">{failure ?? error}</Alert>}
          <TextField
            label="Usuário"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={Boolean(firstError(challenge, 'uid_field'))}
            helperText={firstError(challenge, 'uid_field')}
            slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
          />
          {challenge.password_fields && (
            <PasswordField
              label="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {rememberBox}
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={!username.trim()}>
            Entrar
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  if (challenge.component === 'ak-stage-password') {
    const error = firstError(challenge, 'password', 'non_field_errors')
    return (
      <AuthLayout title="Entrar" subtitle={subtitle}>
        <Stack component="form" spacing={2.5} noValidate onSubmit={(e) => send(e, { password })}>
          {(failure || error) && <Alert severity="error">{failure ?? error}</Alert>}
          <TextField label="Usuário" value={challenge.pending_user ?? ''} disabled />
          <PasswordField
            label="Senha"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {rememberBox}
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={!password}>
            Entrar
          </Button>
          {otherAccount}
        </Stack>
      </AuthLayout>
    )
  }

  if (challenge.component === 'ak-stage-authenticator-validate') {
    const usable = challenge.device_challenges?.some((d) => d.device_class === 'totp' || d.device_class === 'static')
    if (!usable) {
      return (
        <AuthLayout title="Verificação em duas etapas">
          <Stack spacing={2.5}>
            <Alert severity="warning">
              Esta conta usa um tipo de verificação que esta tela ainda não oferece. Peça ajuda a quem administra o
              servidor.
            </Alert>
            {otherAccount}
          </Stack>
        </AuthLayout>
      )
    }
    const error = firstError(challenge, 'code', 'non_field_errors')
    return (
      <AuthLayout
        title="Verificação em duas etapas"
        subtitle="Abra o app autenticador e informe o código de 6 dígitos, ou um código de recuperação."
      >
        <Stack component="form" spacing={2.5} noValidate onSubmit={(e) => send(e, { code: code.trim() })}>
          {(failure || error) && <Alert severity="error">{failure ?? error}</Alert>}
          <TextField
            label="Código"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false, inputMode: 'text' } }}
          />
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={!code.trim()}>
            Verificar
          </Button>
          {otherAccount}
        </Stack>
      </AuthLayout>
    )
  }

  if (challenge.component === 'ak-stage-access-denied') {
    return (
      <AuthLayout title={app ? `Sem acesso a ${app}` : 'Sem acesso'} subtitle="Peça acesso a quem administra o servidor.">
        <Stack spacing={2.5}>
          {challenge.error_message && <Alert severity="warning">{translate(challenge.error_message)}</Alert>}
          {cancel && (
            <Button href={cancel} variant="outlined">
              Entrar com outra conta
            </Button>
          )}
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Entrar">
      <Alert severity="warning">Esta etapa do login ainda não tem tela aqui ({challenge.component}).</Alert>
    </AuthLayout>
  )
}

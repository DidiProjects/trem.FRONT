import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Checkbox, FormControlLabel, Link, Stack, TextField, Typography } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { FullPageSpinner } from '@/components/FullPageStatus'
import { PasswordField } from '@/components/PasswordField'
import { authentikFlow, FLOW_ERROR, isExecutorUrl, type Challenge } from '@/services/authentikFlow'
import { leaveTo } from '@/utils/leave'
import { FLOW_TEXTS, flowKind } from './flowTexts'
import { translate } from './messages'
import { SignUpForm } from './SignUpForm'

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
  // Each automatic step runs once per challenge, also under StrictMode's double effects:
  // a second executor call would advance the flow twice.
  const handled = useRef<Challenge | null>(null)

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

  const send = async (event: FormEvent, body: Record<string, unknown>) => {
    event.preventDefault()
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
  const kind = flowKind(slug)
  const texts = FLOW_TEXTS[kind]
  // A new password opens no session (trem.AUTH recovery.yaml): say it worked, then log in.
  const passwordChanged =
    kind === 'recovery' && challenge?.component === 'xak-flow-redirect' && challenge.to && !isExecutorUrl(challenge.to)

  useEffect(() => {
    if (!challenge || handled.current === challenge) return
    if (challenge.component === 'xak-flow-redirect' && challenge.to) {
      handled.current = challenge
      // Back from an e-mail link the flow goes on in the executor, not in another page.
      if (isExecutorUrl(challenge.to)) {
        authentikFlow
          .follow(challenge.to)
          .then(setChallenge)
          .catch(() => setFailure(FLOW_ERROR))
      } else if (kind !== 'recovery') leaveTo(challenge.to)
    } else if (askedToRemember) {
      handled.current = challenge
      authentikFlow
        .submit(slug, query, { component: challenge.component, remember_me: remember })
        .then(setChallenge)
        .catch(() => setFailure(FLOW_ERROR))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per challenge
  }, [challenge])

  if (passwordChanged) {
    return (
      <AuthLayout title="Senha alterada" subtitle="Entre com a senha nova.">
        <Button variant="contained" size="large" onClick={() => leaveTo(challenge.to!)}>
          Entrar
        </Button>
      </AuthLayout>
    )
  }

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
  const loginHref = `/if/flow/default-authentication-flow/?${query}`
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
      <AuthLayout
        title={texts.identify.title}
        subtitle={texts.identify.subtitle ?? subtitle}
        footer={
          kind === 'recovery' ? (
            <>
              Lembrou a senha? <Link href={loginHref}>Entrar</Link>
            </>
          ) : (
            challenge.enroll_url && (
              <>
                Não tem conta? <Link href={challenge.enroll_url}>Criar conta</Link>
              </>
            )
          )
        }
      >
        <Stack
          component="form"
          spacing={2.5}
          noValidate
          onSubmit={(e) => send(e, { uid_field: username.trim(), ...(challenge.password_fields ? { password } : {}) })}
        >
          {(failure || error) && <Alert severity="error">{failure ?? error}</Alert>}
          <TextField
            label={challenge.user_fields?.includes('email') ? 'Usuário ou e-mail' : 'Usuário'}
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
          {challenge.password_fields && challenge.recovery_url && (
            <Link href={challenge.recovery_url} variant="body2" sx={{ alignSelf: 'flex-end', mt: -1 }}>
              Esqueci a senha
            </Link>
          )}
          {challenge.password_fields && rememberBox}
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={!username.trim()}>
            {texts.identify.submit}
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

  if (challenge.component === 'ak-stage-prompt') {
    return (
      <SignUpForm
        challenge={challenge}
        busy={busy}
        failure={failure}
        loginHref={loginHref}
        texts={texts.form}
        backToLogin={kind === 'recovery'}
        onSubmit={(e, values) => send(e, values)}
      />
    )
  }

  if (challenge.component === 'ak-stage-email') {
    return (
      <AuthLayout title="Confira seu e-mail">
        <Stack spacing={2}>
          <Typography>{texts.emailSent[0]}</Typography>
          <Typography variant="body2" color="text.secondary">
            {texts.emailSent[1]}
          </Typography>
        </Stack>
      </AuthLayout>
    )
  }

  if (challenge.component === 'ak-stage-consent') {
    return (
      <AuthLayout title={texts.link.title} subtitle={texts.link.subtitle || translate(challenge.header_text)}>
        <Stack component="form" spacing={2.5} noValidate onSubmit={(e) => send(e, { token: challenge.token })}>
          {failure && <Alert severity="error">{failure}</Alert>}
          <Button type="submit" variant="contained" size="large" loading={busy}>
            {texts.link.submit}
          </Button>
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

import { useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material'
import { PasswordField } from '@/components/PasswordField'
import { QrCode } from '@/components/QrCode'
import { useAuth } from '@/hooks/useAuth'
import { accountApi } from '@/services/accountApi'
import { SecretBox } from './SecretBox'

type Step =
  | { kind: 'idle' }
  | { kind: 'password'; purpose: 'enroll' | 'codes' | 'disable' }
  | { kind: 'scan'; secret: string; uri: string }
  | { kind: 'codes'; codes: string[] }

const card = { bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 3 }, display: 'grid', gap: 2 } as const

/** Second factor: turn on (password, scan, code, recovery codes), new codes, turn off. */
function SecondFactor() {
  const { user, reloadUser, logout } = useAuth()
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const on = Boolean(user?.totp_enabled)

  const reset = () => {
    setStep({ kind: 'idle' })
    setPassword('')
    setCode('')
    setError(null)
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = (event: FormEvent, purpose: 'enroll' | 'codes' | 'disable') => {
    event.preventDefault()
    void run(async () => {
      if (purpose === 'enroll') {
        const { secret, otpauth_uri } = await accountApi.enrollMfa(password)
        setStep({ kind: 'scan', secret, uri: otpauth_uri })
      } else if (purpose === 'codes') {
        const { recovery_codes } = await accountApi.newRecoveryCodes(password, code.replace(/\s/g, ''))
        setStep({ kind: 'codes', codes: recovery_codes })
      } else {
        await accountApi.disableMfa(password, code.replace(/\s/g, ''))
        // trem.API ends every session of the account when the factor goes away.
        await logout()
      }
      setPassword('')
      setCode('')
    })
  }

  const confirm = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const { recovery_codes } = await accountApi.confirmMfa(code.replace(/\s/g, ''))
      setCode('')
      setStep({ kind: 'codes', codes: recovery_codes })
    })
  }

  return (
    <Box component="section" aria-labelledby="mfa-title" sx={card}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography id="mfa-title" variant="h2" sx={{ flexGrow: 1 }}>
          Verificação em duas etapas
        </Typography>
        <Chip label={on ? 'Ligada' : 'Desligada'} color={on ? 'success' : 'default'} sx={{ fontWeight: 800 }} />
      </Box>

      {step.kind === 'idle' && (
        <>
          <Typography color="text.secondary">
            {on
              ? `O login pede o código do app autenticador. Restam ${user?.recovery_codes_left ?? 0} códigos de recuperação.`
              : 'Além da senha, o login pede um código de 6 dígitos do app autenticador do celular (Google Authenticator, Authy, 1Password…).'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {on ? (
              <>
                <Button variant="outlined" onClick={() => setStep({ kind: 'password', purpose: 'codes' })}>
                  Gerar novos códigos de recuperação
                </Button>
                <Button color="error" onClick={() => setStep({ kind: 'password', purpose: 'disable' })}>
                  Desligar
                </Button>
              </>
            ) : (
              <Button variant="contained" onClick={() => setStep({ kind: 'password', purpose: 'enroll' })}>
                Ligar
              </Button>
            )}
          </Box>
        </>
      )}

      {step.kind === 'password' && (
        <Box component="form" onSubmit={(e) => submitPassword(e, step.purpose)} sx={{ display: 'grid', gap: 2, maxWidth: 420 }}>
          <Typography>
            {step.purpose === 'enroll'
              ? 'Confirme sua senha para começar.'
              : step.purpose === 'codes'
                ? 'Os códigos atuais deixam de valer. Confirme com a senha e um código do app.'
                : 'Desligar encerra todas as sessões da conta, inclusive esta. Confirme com a senha e um código do app ou de recuperação.'}
          </Typography>
          <PasswordField label="Senha" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {step.purpose !== 'enroll' && (
            <TextField
              label="Código do app ou de recuperação"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              slotProps={{ htmlInput: { inputMode: 'text', maxLength: 20 } }}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button type="submit" variant="contained" color={step.purpose === 'disable' ? 'error' : 'primary'} disabled={!password || (step.purpose !== 'enroll' && code.trim().length < 6) || busy}>
              {step.purpose === 'disable' ? 'Desligar' : 'Continuar'}
            </Button>
            <Button onClick={reset}>Cancelar</Button>
          </Box>
        </Box>
      )}

      {step.kind === 'scan' && (
        <Box component="form" onSubmit={confirm} sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <QrCode value={step.uri} label="QR code para o app autenticador" />
          <Stack spacing={2} sx={{ flex: '1 1 260px' }}>
            <Typography>
              1. Abra o app autenticador e escaneie o código. No celular,{' '}
              <a href={step.uri}>toque aqui para abrir o app</a>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Não dá para escanear? Digite a chave:{' '}
              <Box component="code" sx={{ fontWeight: 700, color: 'text.primary', overflowWrap: 'anywhere' }}>
                {step.secret.replace(/(.{4})/g, '$1 ').trim()}
              </Box>
            </Typography>
            <Typography>2. Digite o código de 6 dígitos que aparece no app.</Typography>
            <TextField
              label="Código do app"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
              autoComplete="one-time-code"
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 7 } }}
              sx={{ maxWidth: 220 }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" disabled={code.replace(/\s/g, '').length !== 6 || busy}>
                Confirmar
              </Button>
              <Button onClick={reset}>Cancelar</Button>
            </Box>
          </Stack>
        </Box>
      )}

      {step.kind === 'codes' && (
        <SecretBox
          title="Guarde estes códigos de recuperação agora"
          values={step.codes}
          confirmLabel="Concluir"
          download={{ name: 'trem-codigos-de-recuperacao.txt' }}
          onDone={() => {
            reset()
            void reloadUser()
          }}
        >
          Se perder o celular, cada código entra uma vez no lugar do app. Eles não aparecem de novo.
        </SecretBox>
      )}
    </Box>
  )
}

export function SecuritySection() {
  return (
    <Stack spacing={3}>
      <SecondFactor />
      <Box component="section" aria-labelledby="password-title" sx={card}>
        <Typography id="password-title" variant="h2">
          Senha
        </Typography>
        <Typography color="text.secondary">Troque a senha quando quiser. As outras sessões continuam até expirar.</Typography>
        <Box>
          <Button component={RouterLink} to="/change-password" variant="outlined">
            Alterar senha
          </Button>
        </Box>
      </Box>
    </Stack>
  )
}

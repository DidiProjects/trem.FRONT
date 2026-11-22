import { useState, type FormEvent } from 'react'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordChecklist } from '@/components/PasswordChecklist'
import { PasswordField } from '@/components/PasswordField'
import type { Challenge } from '@/services/authentikFlow'
import { passwordIssue } from '@/utils/validation'
import { translate } from './messages'

interface Props {
  challenge: Challenge
  busy: boolean
  failure: string | null
  loginHref: string
  texts: { title: string; subtitle: string; submit: string }
  /** Password reset: the way back is plain, there is no account to have. */
  backToLogin?: boolean
  onSubmit: (event: FormEvent, values: Record<string, string>) => void
}

const AUTOCOMPLETE: Record<string, string> = { username: 'username', email: 'email', password: 'new-password' }

/** authentik's prompt stage (sign-up, new password): the fields come from trem.AUTH's blueprints. */
export function SignUpForm({ challenge, busy, failure, loginHref, texts, backToLogin, onSubmit }: Props) {
  const fields = [...(challenge.fields ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const [values, setValues] = useState<Record<string, string>>({})
  const value = (key: string) => values[key] ?? ''
  const fieldError = (key: string) => translate(challenge.response_errors?.[key]?.[0]?.string)
  const formError = failure ?? fieldError('non_field_errors')

  // Hints before the round trip; authentik checks again (length, known breaches).
  const hasPassword = fields.some((f) => f.field_key === 'password')
  const passwordOk = !hasPassword || passwordIssue(value('password'), value('username'), value('email')) === null
  const repeatOk = !fields.some((f) => f.field_key === 'password_repeat') || value('password_repeat') === value('password')
  const filled = fields.every((f) => !f.required || value(f.field_key).trim())

  const submit = (event: FormEvent) => {
    const trimmed = Object.fromEntries(
      Object.entries(values).map(([key, v]) => [key, key.startsWith('password') ? v : v.trim()]),
    )
    onSubmit(event, trimmed)
  }

  return (
    <AuthLayout
      title={texts.title}
      subtitle={texts.subtitle}
      footer={
        backToLogin ? (
          <Link href={loginHref}>Voltar para o login</Link>
        ) : (
          <>
            Já tem conta? <Link href={loginHref}>Entrar</Link>
          </>
        )
      }
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={submit}>
        {formError && <Alert severity="error">{formError}</Alert>}
        {fields.map((field, index) => {
          const key = field.field_key
          const common = {
            label: field.label,
            value: value(key),
            autoFocus: index === 0,
            error: Boolean(fieldError(key)) || (key === 'password_repeat' && Boolean(value(key)) && !repeatOk),
            helperText: fieldError(key) ?? (key === 'password_repeat' && value(key) && !repeatOk ? 'As senhas não conferem.' : undefined),
            onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
          }
          if (field.type === 'password') {
            return (
              <Stack key={key} spacing={1}>
                <PasswordField {...common} autoComplete="new-password" />
                {key === 'password' && (
                  <PasswordChecklist password={value('password')} username={value('username')} email={value('email')} />
                )}
              </Stack>
            )
          }
          return (
            <TextField
              key={key}
              {...common}
              type={field.type === 'email' ? 'email' : 'text'}
              autoComplete={AUTOCOMPLETE[key]}
              slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
            />
          )
        })}
        <Button type="submit" variant="contained" size="large" loading={busy} disabled={!filled || !passwordOk || !repeatOk}>
          {texts.submit}
        </Button>
      </Stack>
    </AuthLayout>
  )
}

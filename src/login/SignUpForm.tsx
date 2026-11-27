import { useState, type FormEvent } from 'react'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { PasswordChecklist } from '@/components/PasswordChecklist'
import { PasswordField } from '@/components/PasswordField'
import type { Challenge } from '@/services/authentikFlow'
import { serverErrors, validateFields } from './signUpSchema'

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

/** One message per line under the field. */
function lines(messages: string[] | undefined) {
  if (!messages?.length) return undefined
  return messages.length === 1 ? messages[0] : messages.map((m) => <span key={m} style={{ display: 'block' }}>{m}</span>)
}

/** authentik's prompt stage (sign-up, new password): the fields come from trem.AUTH's blueprints. */
export function SignUpForm({ challenge, busy, failure, loginHref, texts, backToLogin, onSubmit }: Props) {
  const fields = [...(challenge.fields ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const keys = fields.map((f) => f.field_key)
  const [values, setValues] = useState<Record<string, string>>({})
  // A field says what is wrong with it once the person left it (or tried to send).
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // authentik's answer is about the values that were sent: a field edited since then drops it.
  const [answered, setAnswered] = useState<{ challenge: Challenge; edited: Set<string> }>({ challenge, edited: new Set() })
  const edited = answered.challenge === challenge ? answered.edited : new Set<string>()
  const value = (key: string) => values[key] ?? ''

  const local = validateFields(values, keys)
  const server = serverErrors(challenge, keys)
  const errorsOf = (key: string) =>
    touched[key] && local[key] ? local[key] : edited.has(key) ? undefined : server.fields[key]
  const formErrors = failure ? [failure] : server.form

  const change = (key: string, next: string) => {
    setValues((v) => ({ ...v, [key]: next }))
    setAnswered({ challenge, edited: new Set(edited).add(key) })
  }

  const submit = (event: FormEvent) => {
    if (Object.keys(local).length > 0) {
      event.preventDefault()
      setTouched(Object.fromEntries(keys.map((k) => [k, true])))
      return
    }
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
        {formErrors.map((message) => (
          <Alert key={message} severity="error">
            {message}
          </Alert>
        ))}
        {fields.map((field, index) => {
          const key = field.field_key
          const errors = errorsOf(key)
          const common = {
            label: field.label,
            value: value(key),
            autoFocus: index === 0,
            error: Boolean(errors?.length),
            helperText: lines(errors),
            onChange: (e: { target: { value: string } }) => change(key, e.target.value),
            onBlur: () => setTouched((t) => (value(key) ? { ...t, [key]: true } : t)),
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
        <Button type="submit" variant="contained" size="large" loading={busy}>
          {texts.submit}
        </Button>
      </Stack>
    </AuthLayout>
  )
}

import { z } from 'zod'
import { passwordIssue } from '@/utils/validation'
import type { Challenge } from '@/services/authentikFlow'
import { translate } from './messages'

// The prompt stage of trem.AUTH (enrollment.yaml, recovery.yaml): the same rules, checked here
// before the round trip so each field says exactly what is wrong with it, and authentik's own
// answer mapped back to the field it is about.

export type FieldErrors = Record<string, string[]>

const USERNAME_CHARS = /^[a-zA-Z0-9_.-]+$/

export const MESSAGES = {
  usernameRequired: 'Informe o nome de usuário.',
  usernameIsEmail: 'O nome de usuário não pode ser um e-mail. Use de 3 a 50 letras, números, ponto, hífen ou sublinhado.',
  usernameLength: 'O nome de usuário deve ter de 3 a 50 caracteres.',
  usernameChars: 'Use só letras sem acento, números, ponto, hífen ou sublinhado no nome de usuário (sem espaços).',
  emailRequired: 'Informe o e-mail.',
  emailInvalid: 'Informe um e-mail válido, como nome@exemplo.com.',
  repeatRequired: 'Repita a senha.',
  repeatDiffers: 'As senhas não conferem.',
}

function usernameIssue(value: string): string | null {
  if (!value) return MESSAGES.usernameRequired
  if (value.includes('@')) return MESSAGES.usernameIsEmail
  if (value.length < 3 || value.length > 50) return MESSAGES.usernameLength
  if (!USERNAME_CHARS.test(value)) return MESSAGES.usernameChars
  return null
}

const schema = z
  .object({
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().optional(),
    password_repeat: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string | null) => {
      if (message) ctx.addIssue({ code: 'custom', path: [path], message })
    }
    if (values.username !== undefined) issue('username', usernameIssue(values.username))
    if (values.email !== undefined) {
      const email = values.email
      issue('email', !email ? MESSAGES.emailRequired : z.email().safeParse(email).success ? null : MESSAGES.emailInvalid)
    }
    if (values.password !== undefined) {
      const found = passwordIssue(values.password, values.username ?? '', values.email ?? '')
      issue('password', found && `${found}.`)
    }
    if (values.password_repeat !== undefined) {
      issue(
        'password_repeat',
        !values.password_repeat ? MESSAGES.repeatRequired : values.password_repeat !== values.password ? MESSAGES.repeatDiffers : null,
      )
    }
  })

/** What is wrong with each of the form's fields, before sending; only the fields the stage has. */
export function validateFields(values: Record<string, string>, keys: string[]): FieldErrors {
  const present = Object.fromEntries(keys.filter((k) => k in schema.shape).map((k) => [k, values[k] ?? '']))
  const result = schema.safeParse(present)
  const errors: FieldErrors = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0])
      errors[key] = [...(errors[key] ?? []), issue.message]
    }
  }
  return errors
}

// authentik answers a validation policy with non_field_errors only (ak_message): the field each
// message is about is read from its wording, so it shows under that field and not as a vague
// error above the form.
const ABOUT: [RegExp, string][] = [
  [/nome de usuário|no usuário|este nome já/i, 'username'],
  [/e-mail/i, 'email'],
  [/senha|vazamentos/i, 'password'],
]

/** authentik's refusal, every message of it, by field; what belongs to no field goes to `form`. */
export function serverErrors(challenge: Challenge, keys: string[]): { fields: FieldErrors; form: string[] } {
  const fields: FieldErrors = {}
  const form: string[] = []
  for (const [key, list] of Object.entries(challenge.response_errors ?? {})) {
    for (const item of list) {
      const message = translate(item.string)
      if (!message) continue
      const field = keys.includes(key) ? key : ABOUT.find(([pattern]) => pattern.test(message))?.[1]
      if (field && keys.includes(field)) {
        if (!fields[field]?.includes(message)) fields[field] = [...(fields[field] ?? []), message]
      } else if (!form.includes(message)) {
        form.push(message)
      }
    }
  }
  return { fields, form }
}

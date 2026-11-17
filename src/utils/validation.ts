import { z } from 'zod'

// Mirrors trem.API's password policy (app/domain/password_policy.py): length over
// composition, per NIST SP 800-63B. The API checks again, plus known breaches.
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/

export interface PasswordRule {
  label: string
  ok: boolean
}

function containsIdentity(password: string, username: string, email: string): boolean {
  const lowered = password.toLowerCase()
  const identities = [username, email.split('@')[0] ?? ''].filter((x) => x.length >= 3)
  return identities.some((id) => lowered.includes(id.toLowerCase()))
}

export function passwordRules(password: string, username = '', email = ''): PasswordRule[] {
  return [
    { label: `Pelo menos ${PASSWORD_MIN} caracteres`, ok: password.length >= PASSWORD_MIN },
    { label: 'Sem repetir sempre os mesmos caracteres', ok: new Set(password).size >= 4 },
    {
      label: 'Sem o nome de usuário ou o e-mail',
      ok: password.length > 0 && !containsIdentity(password, username, email),
    },
  ]
}

export function passwordIssue(password: string, username = '', email = ''): string | null {
  if (password.length === 0) return 'Informe a senha'
  if (password.length < PASSWORD_MIN) return `A senha deve ter no mínimo ${PASSWORD_MIN} caracteres`
  if (password.length > PASSWORD_MAX) return `A senha deve ter no máximo ${PASSWORD_MAX} caracteres`
  if (new Set(password).size < 4) return 'A senha repete caracteres demais'
  if (containsIdentity(password, username, email)) return 'A senha não pode conter o nome de usuário ou o e-mail'
  return null
}

const email = z.string().trim().min(1, 'Informe o e-mail').pipe(z.email('E-mail inválido'))

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

export const totpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
})

export const recoverySchema = z.object({
  code: z.string().trim().min(6, 'Informe um código de recuperação'),
})

export const emailSchema = z.object({ email })

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo de 3 caracteres')
      .max(50, 'Máximo de 50 caracteres')
      .regex(USERNAME_PATTERN, 'Use letras, números, ponto, hífen ou sublinhado'),
    email,
    password: z.string(),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    const issue = passwordIssue(data.password, data.username, data.email)
    if (issue) ctx.addIssue({ code: 'custom', path: ['password'], message: issue })
    if (data.confirm !== data.password) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'As senhas não conferem' })
  })

/** New password + confirmation; with `requireCurrent`, also the current password. */
export function newPasswordSchema(options: { username?: string; email?: string; requireCurrent?: boolean } = {}) {
  return z
    .object({ current: z.string(), password: z.string(), confirm: z.string() })
    .superRefine((data, ctx) => {
      if (options.requireCurrent && !data.current) {
        ctx.addIssue({ code: 'custom', path: ['current'], message: 'Informe a senha atual' })
      }
      const issue = passwordIssue(data.password, options.username, options.email)
      if (issue) ctx.addIssue({ code: 'custom', path: ['password'], message: issue })
      else if (data.current && data.password === data.current) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'A nova senha deve ser diferente da atual' })
      }
      if (data.confirm !== data.password) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'As senhas não conferem' })
    })
}

// Mirror trem.API's hub service rules (app/domain/schemas/hub.py).
const SERVICE_SLUG = /^[a-z0-9][a-z0-9_.-]{0,49}$/
export const LOGO_MAX_BYTES = 256 * 1024
export const LOGO_TYPES = ['image/png', 'image/webp', 'image/svg+xml']

function addressIssue(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Use um endereço http:// ou https://'
    if (url.username || url.password) return 'O endereço não pode levar usuário ou senha'
    if (/\s/.test(value)) return 'O endereço não pode ter espaços'
    return null
  } catch {
    return 'Endereço inválido. Ex.: http://100.64.0.1:2283'
  }
}

export const serviceSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Informe o identificador')
    .regex(SERVICE_SLUG, 'Só letras minúsculas, números, ".", "_" e "-", começando por letra ou número'),
  name: z.string().trim().min(1, 'Informe o nome').max(100, 'Até 100 caracteres'),
  description: z.string().trim().max(500, 'Até 500 caracteres'),
  url: z
    .string()
    .trim()
    .max(500, 'Até 500 caracteres')
    .superRefine((value, ctx) => {
      const issue = addressIssue(value)
      if (issue) ctx.addIssue({ code: 'custom', message: issue })
    }),
})

export function logoIssue(file: File): string | null {
  if (!LOGO_TYPES.includes(file.type)) return 'Use uma imagem PNG, WebP ou SVG'
  if (file.size > LOGO_MAX_BYTES) return `A imagem passa de ${LOGO_MAX_BYTES / 1024} KB`
  return null
}

export type Errors = Record<string, string | undefined>

/** First message per field, or null when valid. */
export function validate(schema: z.ZodType, data: unknown): Errors | null {
  const result = schema.safeParse(data)
  if (result.success) return null
  const errors: Errors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

import { ApiError } from '@/services/http'

/** API errors that belong to a field: by name, or (422 with a plain message) the password. */
export function fieldErrorsOf(error: unknown, passwordField = 'password'): Record<string, string> | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null
  const map: Record<string, string> = { new_password: passwordField }
  if (Object.keys(error.fieldErrors).length === 0) return { [passwordField]: error.message }
  return Object.fromEntries(Object.entries(error.fieldErrors).map(([key, msg]) => [map[key] ?? key, msg]))
}

import { env } from '@/config/env'

export interface FieldErrors {
  [field: string]: string
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors
  readonly retryAfter?: number

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

export const NETWORK_ERROR = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
const SERVER_ERROR = 'O servidor não respondeu como esperado. Tente de novo em instantes.'

interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
}

// Pydantic prefixes the messages raised in validators ("Value error, A senha deve...").
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error, /, '')
}

export async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
  const detail = body?.detail
  const retryAfter = Number(res.headers.get('Retry-After')) || undefined

  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {}
    for (const issue of detail as ValidationIssue[]) {
      const field = issue.loc?.[issue.loc.length - 1]
      if (typeof field === 'string' && issue.msg && !fieldErrors[field]) {
        fieldErrors[field] = cleanMessage(issue.msg)
      }
    }
    const first = Object.values(fieldErrors)[0] ?? 'Dados inválidos'
    return new ApiError(first, res.status, fieldErrors, retryAfter)
  }
  if (typeof detail === 'string') return new ApiError(detail, res.status, {}, retryAfter)
  if (res.status >= 500) return new ApiError(SERVER_ERROR, res.status)
  return new ApiError(`Erro ${res.status}`, res.status, {}, retryAfter)
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON, FormData for uploads (the browser sets the multipart boundary) or a raw Blob. */
  body?: unknown
  headers?: Record<string, string>
}

export async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  const raw = options.body instanceof FormData || options.body instanceof Blob
  if (options.body !== undefined && !raw) headers['Content-Type'] = 'application/json'
  try {
    return await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : raw ? (options.body as BodyInit) : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(NETWORK_ERROR, 0)
  }
}

export async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return readJson<T>(await send(path, options))
}

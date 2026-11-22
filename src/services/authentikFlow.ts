/**
 * authentik's flow executor, the API its own login page uses. This page is served by
 * auth.didilv93.com itself (trem.AUTH's edge, /if/flow/*): the flow state lives in authentik's
 * session cookie, so it must share authentik's origin.
 */

export interface FieldError {
  string: string
  code?: string
}

export interface DeviceChallenge {
  device_class: string
}

export interface PromptField {
  field_key: string
  label: string
  type: string
  required?: boolean
  order?: number
}

export interface Challenge {
  component: string
  flow_info?: { title?: string; cancel_url?: string }
  response_errors?: Record<string, FieldError[]>
  application_pre?: string
  password_fields?: boolean
  pending_user?: string
  device_challenges?: DeviceChallenge[]
  to?: string
  error_message?: string
  enroll_url?: string
  fields?: PromptField[]
  header_text?: string
  token?: string
}

export const FLOW_ERROR = 'O servidor de login não respondeu como esperado. Tente de novo.'

function executorUrl(slug: string, query: string): string {
  return `/api/v3/flows/executor/${encodeURIComponent(slug)}/?query=${encodeURIComponent(query)}`
}

function csrfToken(): string {
  return document.cookie.match(/(?:^|; )authentik_csrf=([^;]+)/)?.[1] ?? ''
}

/** A redirect back into the executor (after an e-mail link's consent): the flow goes on there. */
export function isExecutorUrl(url: string | undefined): url is string {
  return Boolean(url?.startsWith('/api/v3/flows/executor/'))
}

async function call(slug: string, query: string, init: RequestInit = {}, url = executorUrl(slug, query)): Promise<Challenge> {
  // A POST answers with a redirect to the next challenge; fetch follows it as a GET.
  const res = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
      'Content-Type': 'application/json',
      'X-authentik-CSRF': csrfToken(),
    },
  })
  if (!res.ok) throw new Error(FLOW_ERROR)
  return (await res.json()) as Challenge
}

export const authentikFlow = {
  start: (slug: string, query: string) => call(slug, query),
  submit: (slug: string, query: string, body: Record<string, unknown>) =>
    call(slug, query, { method: 'POST', body: JSON.stringify(body) }),
  follow: (url: string) => call('', '', {}, url),
}

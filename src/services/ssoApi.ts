import { authRequest } from './session'

/** A service asking to log the account in through trem.API (OpenID Connect). */
export interface SsoRequest {
  service_slug: string
  service_name: string
  logo_url: string | null
  username: string
  /** Whether this account may open the service (hub:<slug>). */
  allowed: boolean
}

interface Redirect {
  redirect: string
}

const at = (request: string) => `/oauth/authorize/${encodeURIComponent(request)}`

export const ssoApi = {
  view: (request: string) => authRequest<SsoRequest>(at(request)),

  /** Where the browser goes next: back to the service, with the code. */
  approve: (request: string) => authRequest<Redirect>(`${at(request)}/approve`, { method: 'POST' }),

  /** Back to the service, told the login was cancelled. */
  deny: (request: string) => authRequest<Redirect>(`${at(request)}/deny`, { method: 'POST' }),
}

import { vi } from 'vitest'
import { env } from '@/config/env'

export interface Call {
  method: string
  path: string
  body: Record<string, unknown> | undefined
  /** Multipart uploads. */
  form: FormData | undefined
  headers: Record<string, string>
}

type Handler = (call: Call) => Response | Promise<Response>

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

/** An unsigned JWT-shaped token: the front only reads `exp` and `username`. */
export function fakeToken(username = 'ana', minutes = 15): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const exp = Math.floor(Date.now() / 1000) + minutes * 60
  return `${encode({ alg: 'none' })}.${encode({ sub: '1', username, exp })}.sig`
}

export const ISSUER = 'https://auth.example/application/o/trem/'
const AUTHENTIK = new URL(ISSUER).origin

/** authentik's token endpoint, where the session is renewed: a route like the others. */
export const RENEW = 'POST authentik /application/o/token/'

/** This tab holds a refresh token, as after a login (oidc.ts). */
export function storedSession() {
  sessionStorage.setItem('trem.oidc.tokens', JSON.stringify({ refreshToken: 'r1', idToken: 'id1' }))
}

/** authentik renews the session with a new access token. */
export const renewed = () => json({ access_token: fakeToken(), refresh_token: 'r2' })

/**
 * Replaces fetch with handlers keyed by "METHOD /path" (query string included); unknown
 * routes answer 404. authentik's routes are keyed "METHOD authentik /path". The catalog
 * answers CATALOG unless a test overrides it.
 */
export function fakeApi(given: Record<string, Handler>) {
  const routes: Record<string, Handler> = { 'GET /hub/services': () => json(CATALOG), ...given }
  const calls: Call[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init.method ?? 'GET').toUpperCase()
    if (url.startsWith(`${AUTHENTIK}/`)) {
      const path = url.slice(AUTHENTIK.length)
      const body = Object.fromEntries(new URLSearchParams(String(init.body ?? '')))
      const call = { method, path: `authentik ${path}`, body, form: undefined, headers: {} }
      calls.push(call)
      const handler = routes[`${method} authentik ${path}`]
      return handler ? handler(call) : json({ error: 'invalid_grant' }, 400)
    }
    if (!url.startsWith(`${env.apiUrl}/`)) throw new TypeError(`fetch outside trem.API: ${url}`)
    const path = url.slice(env.apiUrl.length)
    const headers = Object.fromEntries(new Headers(init.headers).entries())
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
    const form = init.body instanceof FormData ? init.body : undefined
    const call = { method, path, body, form, headers }
    calls.push(call)
    const handler = routes[`${method} ${path}`]
    return handler ? handler(call) : json({ detail: 'Not Found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return {
    calls,
    to: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path),
  }
}

export const ME = {
  id: '1',
  username: 'ana',
  email: 'ana@example.com',
  status: 'active',
  permissions: ['trem:ai', 'hub:radarr', 'hub:immich'],
}

/** What GET /hub/services gives ME (hub:radarr, hub:immich). */
export const CATALOG = [
  { slug: 'radarr', name: 'Radarr', description: 'Filmes', url: 'http://100.64.0.1:7878', logo_url: '/hub/services/radarr/logo?v=1' },
  { slug: 'immich', name: 'Immich', description: 'Fotos', url: 'http://100.64.0.1:2283', logo_url: null },
]

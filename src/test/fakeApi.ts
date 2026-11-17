import { vi } from 'vitest'
import { env } from '@/config/env'

export interface Call {
  method: string
  path: string
  body: Record<string, unknown> | undefined
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

/** Replaces fetch with handlers keyed by "METHOD /path"; unknown routes answer 404. */
export function fakeApi(routes: Record<string, Handler>) {
  const calls: Call[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (!url.startsWith(`${env.apiUrl}/`)) throw new TypeError(`fetch outside trem.API: ${url}`)
    const path = url.slice(env.apiUrl.length)
    const method = (init.method ?? 'GET').toUpperCase()
    const headers = Object.fromEntries(new Headers(init.headers).entries())
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
    const call = { method, path, body, headers }
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
  must_change_password: false,
  totp_enabled: false,
  recovery_codes_left: 0,
}

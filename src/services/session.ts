/**
 * The login session: the access token lives only in memory, the refresh token in the
 * HttpOnly cookie trem.API sets on /auth (unreachable from JavaScript). trem.API is on
 * another domain; the cookie is partitioned to this site (SameSite=None; Partitioned).
 *
 * - One refresh at a time per tab (single flight) and across tabs (Web Locks). The API
 *   rotates the refresh token and treats a reused one as theft: two tabs presenting the
 *   same cookie at once would end the login for both.
 * - The access token is renewed a minute before it expires, and again when the tab
 *   comes back from the background with a token close to expiring.
 * - Logout and login are announced to the other tabs (BroadcastChannel).
 * - A flag without any secret in localStorage says whether a restore is worth trying,
 *   so anonymous visits do not call /auth/refresh.
 */
import { ApiError, readJson, send, type RequestOptions } from './http'
import { readClaims } from '@/utils/jwt'
import { storage } from '@/utils/storage'

export const CSRF_HEADER = { 'X-Requested-With': 'trem' }
const FLAG = 'trem.session'
const LOCK = 'trem.refresh'
const CHANNEL = 'trem.auth'
const RENEW_BEFORE_MS = 60_000
const RETRY_AFTER_FAILURE_MS = 30_000

export type SessionEvent = 'ended' | 'logged-out-elsewhere' | 'logged-in-elsewhere'

interface RefreshResponse {
  access_token?: string
}

let accessToken: string | null = null
let inflight: Promise<string | null> | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<(event: SessionEvent) => void>()
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

function emit(event: SessionEvent) {
  listeners.forEach((listener) => listener(event))
}

function expiresAt(token: string): number {
  return (readClaims(token)?.exp ?? 0) * 1000
}

function schedule(token: string) {
  clearTimeout(timer)
  const delay = Math.max(expiresAt(token) - Date.now() - RENEW_BEFORE_MS, 0)
  timer = setTimeout(() => {
    refresh().catch(() => {
      // Offline or server down: the session may still be alive, try again later.
      timer = setTimeout(() => void refresh().catch(() => undefined), RETRY_AFTER_FAILURE_MS)
    })
  }, delay)
}

function setToken(token: string) {
  accessToken = token
  storage.set(FLAG, '1')
  schedule(token)
}

function drop() {
  clearTimeout(timer)
  accessToken = null
  storage.remove(FLAG)
}

async function callRefresh(): Promise<string | null> {
  const res = await send('/auth/refresh', { method: 'POST', headers: CSRF_HEADER })
  if (res.status === 401 || res.status === 403) return null
  const body = await readJson<RefreshResponse>(res)
  return body.access_token ?? null
}

function lockedRefresh(): Promise<string | null> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks?.request ? locks.request(LOCK, callRefresh) : callRefresh()
}

export const session = {
  get token(): string | null {
    return accessToken
  },

  hasStoredSession(): boolean {
    return storage.get(FLAG) === '1'
  },

  /** A login just returned an access token; the API set the refresh cookie. */
  start(token: string) {
    setToken(token)
    channel?.postMessage('login')
  },

  /** Forgets the session locally without telling other tabs (they share the cookie). */
  forget() {
    drop()
  },

  async logout() {
    try {
      await send('/auth/logout', { method: 'POST', headers: CSRF_HEADER })
    } finally {
      drop()
      channel?.postMessage('logout')
    }
  },

  subscribe(listener: (event: SessionEvent) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/**
 * A new access token from the cookie, or null when the session is over. Network and
 * server failures throw: they say nothing about the session.
 */
export function refresh(): Promise<string | null> {
  inflight ??= lockedRefresh()
    .then((token) => {
      if (token) {
        setToken(token)
      } else if (accessToken || session.hasStoredSession()) {
        drop()
        emit('ended')
      }
      return token
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** A request with the access token; on 401 it renews the token once and tries again. */
export async function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const attempt = (token: string | null) =>
    send(path, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })

  let res = await attempt(accessToken ?? (await refresh()))
  if (res.status === 401) {
    const token = await refresh()
    if (!token) throw new ApiError('Sua sessão expirou. Entre de novo.', 401)
    res = await attempt(token)
  }
  return readJson<T>(res)
}

channel?.addEventListener('message', (message: MessageEvent) => {
  if (message.data === 'logout') {
    drop()
    emit('logged-out-elsewhere')
  } else if (message.data === 'login' && !accessToken) {
    emit('logged-in-elsewhere')
  }
})

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !accessToken) return
    if (expiresAt(accessToken) - Date.now() < RENEW_BEFORE_MS) void refresh().catch(() => undefined)
  })
}

/**
 * The login session. The access token lives only in memory; the refresh token in this tab's
 * sessionStorage (oidc.ts), renewed at authentik.
 *
 * - One renewal at a time per tab (single flight) and across tabs (Web Locks).
 * - The access token is renewed a minute before it expires, and again when the tab
 *   comes back from the background with a token close to expiring.
 * - Logout and login are announced to the other tabs (BroadcastChannel).
 */
import { ApiError, readJson, send, type RequestOptions } from './http'
import { oidc } from './oidc'
import { readClaims } from '@/utils/jwt'
import { leaveTo } from '@/utils/leave'

const LOCK = 'trem.refresh'
const CHANNEL = 'trem.auth'
const RENEW_BEFORE_MS = 60_000
const RETRY_AFTER_FAILURE_MS = 30_000

export type SessionEvent = 'ended' | 'logged-out-elsewhere' | 'logged-in-elsewhere'

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
  schedule(token)
}

function drop() {
  clearTimeout(timer)
  accessToken = null
}

function lockedRefresh(): Promise<string | null> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks?.request ? locks.request(LOCK, oidc.refresh) : oidc.refresh()
}

export const session = {
  get token(): string | null {
    return accessToken
  },

  hasStoredSession(): boolean {
    return oidc.hasSession()
  },

  /** A login just returned an access token. */
  start(token: string) {
    setToken(token)
    channel?.postMessage('login')
  },

  /** Forgets the session locally without telling other tabs. */
  forget() {
    drop()
  },

  logout() {
    const url = oidc.logoutUrl()
    drop()
    channel?.postMessage('logout')
    leaveTo(url)
    // The page is leaving for authentik's logout. Resolving would let the app mark the
    // session anonymous and open /login, whose own redirect to authentik would cancel
    // this navigation and log the user straight back in.
    return new Promise<void>(() => undefined)
  },

  subscribe(listener: (event: SessionEvent) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/**
 * A new access token, or null when the session is over. Network and server failures
 * throw: they say nothing about the session.
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
export async function authSend(path: string, options: RequestOptions = {}): Promise<Response> {
  const attempt = (token: string | null) =>
    send(path, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })

  const res = await attempt(accessToken ?? (await refresh()))
  if (res.status !== 401) return res
  const token = await refresh()
  if (!token) throw new ApiError('Sua sessão expirou. Entre de novo.', 401)
  return attempt(token)
}

export async function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return readJson<T>(await authSend(path, options))
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

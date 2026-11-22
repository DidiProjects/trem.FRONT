/**
 * Login through authentik (trem.AUTH): authorization code + PKCE with the public client
 * `trem`. authentik answers CORS on its token endpoint, so the code exchange and the renewals
 * go straight from the browser.
 *
 * The access token stays in memory (session.ts). The refresh token and the id token (for the
 * logout) live in sessionStorage: per tab, gone with the tab, never sent to trem.API. A new tab
 * goes through authentik again, which answers at once while its own session is alive.
 */
import { env } from '@/config/env'
import { ApiError } from './http'

const PENDING = 'trem.oidc.pending'
const TOKENS = 'trem.oidc.tokens'
const SCOPE = 'openid profile email offline_access'

interface Pending {
  state: string
  verifier: string
  returnTo: string
}

interface Stored {
  refreshToken: string
  idToken?: string
}

interface TokenAnswer {
  access_token?: string
  refresh_token?: string
  id_token?: string
  error?: string
}

const session = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, value: unknown) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* private mode: the login lasts while the page is open */
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

const origin = () => new URL(env.oidcIssuer).origin
const callbackUrl = () => `${window.location.origin}/auth/callback`

function base64url(bytes: Uint8Array): string {
  let text = ''
  bytes.forEach((b) => (text += String.fromCharCode(b)))
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const random = (size = 32) => base64url(crypto.getRandomValues(new Uint8Array(size)))

async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/** Only paths of this app come back from authentik: never another site. */
function safeReturn(path: string | undefined): string {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login') ? path : '/'
}

async function token(body: Record<string, string>): Promise<TokenAnswer> {
  const res = await fetch(`${origin()}/application/o/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: env.oidcClientId, ...body }),
  })
  const answer = (await res.json().catch(() => ({}))) as TokenAnswer
  if (res.ok) return answer
  if (res.status === 400 || res.status === 401) return { error: answer.error ?? 'invalid_grant' }
  throw new ApiError('O servidor de login não respondeu como esperado. Tente de novo.', res.status)
}

function keep(answer: TokenAnswer) {
  const previous = session.get<Stored>(TOKENS)
  const refreshToken = answer.refresh_token ?? previous?.refreshToken
  if (refreshToken) session.set(TOKENS, { refreshToken, idToken: answer.id_token ?? previous?.idToken })
}

export const oidc = {
  /** Whether this tab started a login (an e-mail link opens the return in another tab). */
  hasPendingLogin(): boolean {
    return Boolean(session.get<Pending>(PENDING))
  },

  hasSession(): boolean {
    return Boolean(session.get<Stored>(TOKENS)?.refreshToken)
  },

  /** The URL that starts a login at authentik; `returnTo` is where the app opens after. */
  async loginUrl(returnTo?: string): Promise<string> {
    const pending: Pending = { state: random(16), verifier: random(48), returnTo: safeReturn(returnTo) }
    session.set(PENDING, pending)
    const query = new URLSearchParams({
      client_id: env.oidcClientId,
      response_type: 'code',
      redirect_uri: callbackUrl(),
      scope: SCOPE,
      state: pending.state,
      code_challenge: await challengeOf(pending.verifier),
      code_challenge_method: 'S256',
    })
    return `${origin()}/application/o/authorize/?${query}`
  },

  /** Back from authentik on /auth/callback: the access token and where to go. */
  async complete(search: string): Promise<{ accessToken: string; returnTo: string }> {
    const params = new URLSearchParams(search)
    const pending = session.get<Pending>(PENDING)
    session.remove(PENDING)
    if (params.get('error')) throw new ApiError('O login foi cancelado ou negado.', 401)
    const code = params.get('code')
    if (!pending || !code || params.get('state') !== pending.state) {
      throw new ApiError('Este retorno de login não é válido. Entre de novo.', 400)
    }
    const answer = await token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(),
      code_verifier: pending.verifier,
    })
    if (!answer.access_token) throw new ApiError('O login expirou. Entre de novo.', 401)
    keep(answer)
    return { accessToken: answer.access_token, returnTo: pending.returnTo }
  },

  /** A new access token, or null when authentik no longer accepts the refresh token. */
  async refresh(): Promise<string | null> {
    const stored = session.get<Stored>(TOKENS)
    if (!stored?.refreshToken) return null
    const answer = await token({ grant_type: 'refresh_token', refresh_token: stored.refreshToken })
    if (!answer.access_token) {
      session.remove(TOKENS)
      return null
    }
    keep(answer)
    return answer.access_token
  },

  /** authentik's own page for the account: password, second factor, sessions. */
  accountUrl(): string {
    return `${origin()}/if/user/#/settings`
  },

  /** Forgets the tokens and gives the URL that also ends the session at authentik. */
  logoutUrl(): string {
    const idToken = session.get<Stored>(TOKENS)?.idToken
    session.remove(TOKENS)
    // client_id lets authentik check the return address even without the id token.
    const query = new URLSearchParams({
      client_id: env.oidcClientId,
      post_logout_redirect_uri: `${window.location.origin}/login`,
    })
    if (idToken) query.set('id_token_hint', idToken)
    return `${env.oidcIssuer}end-session/?${query}`
  },
}

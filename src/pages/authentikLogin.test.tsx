import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { env } from '@/config/env'
import { session } from '@/services/session'
import { ME, fakeApi, fakeToken, json } from '@/test/fakeApi'
import { leaveTo } from '@/utils/leave'

vi.mock('@/utils/leave', () => ({ leaveTo: vi.fn() }))

const AUTH = 'https://auth.example'
const ISSUER = `${AUTH}/application/o/trem/`
const TOKENS = 'trem.oidc.tokens'
const PENDING = 'trem.oidc.pending'

interface TokenCall {
  grant_type: string
  [key: string]: string
}

/** trem.API (fakeApi) plus authentik's token endpoint. */
function withAuthentik(api: ReturnType<typeof fakeApi>, answer: (call: TokenCall) => Response) {
  const tokenCalls: TokenCall[] = []
  const apiFetch = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input)
      if (url === `${AUTH}/application/o/token/`) {
        const call = Object.fromEntries(new URLSearchParams(String(init.body))) as TokenCall
        tokenCalls.push(call)
        return answer(call)
      }
      return apiFetch(input, init)
    }),
  )
  return { api, tokenCalls }
}

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

beforeEach(() => {
  env.oidcIssuer = ISSUER
  vi.mocked(leaveTo).mockClear()
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  env.oidcIssuer = ''
  session.forget()
})

describe('login through authentik', () => {
  it('/login goes to authentik with PKCE and remembers the way back', async () => {
    fakeApi({})
    renderAt('/login')

    await waitFor(() => expect(leaveTo).toHaveBeenCalledTimes(1))
    const url = new URL(vi.mocked(leaveTo).mock.calls[0][0])
    expect(url.origin + url.pathname).toBe(`${AUTH}/application/o/authorize/`)
    expect(url.searchParams.get('client_id')).toBe('trem')
    expect(url.searchParams.get('redirect_uri')).toBe(`${window.location.origin}/auth/callback`)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toContain('offline_access')
    const pending = JSON.parse(sessionStorage.getItem(PENDING)!)
    expect(url.searchParams.get('state')).toBe(pending.state)
    expect(pending.verifier.length).toBeGreaterThan(40)
  })

  it('the callback trades the code, opens the session and returns to the page asked for', async () => {
    sessionStorage.setItem(PENDING, JSON.stringify({ state: 's1', verifier: 'v'.repeat(64), returnTo: '/servicos' }))
    const access = fakeToken()
    const { api, tokenCalls } = withAuthentik(fakeApi({ 'GET /me': () => json(ME) }), () =>
      json({ access_token: access, refresh_token: 'r1', id_token: 'id1' }),
    )
    renderAt('/auth/callback?code=c1&state=s1')

    await waitFor(() => expect(window.location.pathname).toBe('/servicos'))
    expect(tokenCalls).toEqual([
      expect.objectContaining({ grant_type: 'authorization_code', code: 'c1', code_verifier: 'v'.repeat(64), client_id: 'trem' }),
    ])
    expect(api.to('GET', '/me')[0].headers.authorization).toBe(`Bearer ${access}`)
    expect(JSON.parse(sessionStorage.getItem(TOKENS)!)).toEqual({ refreshToken: 'r1', idToken: 'id1' })
  })

  it('a callback whose state does not match is refused without trading the code', async () => {
    sessionStorage.setItem(PENDING, JSON.stringify({ state: 's1', verifier: 'v', returnTo: '/' }))
    const { tokenCalls } = withAuthentik(fakeApi({}), () => json({}))
    renderAt('/auth/callback?code=c1&state=forged')

    expect(await screen.findByText(/não é válido/)).toBeInTheDocument()
    expect(tokenCalls).toHaveLength(0)
  })

  it('a callback this tab did not start (the e-mail link of the sign-up) starts a new login', async () => {
    const { tokenCalls } = withAuthentik(fakeApi({}), () => json({}))
    renderAt('/auth/callback?code=c1&state=from-another-tab')

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(expect.stringContaining(`${AUTH}/application/o/authorize/`)))
    expect(tokenCalls).toHaveLength(0)
  })

  it('a reload renews the access token with the refresh token of this tab', async () => {
    sessionStorage.setItem(TOKENS, JSON.stringify({ refreshToken: 'r1', idToken: 'id1' }))
    const { tokenCalls } = withAuthentik(fakeApi({ 'GET /me': () => json(ME) }), () =>
      json({ access_token: fakeToken(), refresh_token: 'r2' }),
    )
    renderAt('/')

    await waitFor(() => expect(tokenCalls).toEqual([expect.objectContaining({ grant_type: 'refresh_token', refresh_token: 'r1' })]))
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem(TOKENS)!).refreshToken).toBe('r2'))
    expect(window.location.pathname).toBe('/')
  })

  it('logout also ends the session at authentik', async () => {
    sessionStorage.setItem(TOKENS, JSON.stringify({ refreshToken: 'r1', idToken: 'id1' }))
    withAuthentik(fakeApi({ 'GET /me': () => json(ME) }), () => json({ access_token: fakeToken(), refresh_token: 'r2' }))
    renderAt('/account')

    await userEvent.click(await screen.findByRole('button', { name: /sair|conta|ana/i }))
    const exit = await screen.findByRole('menuitem', { name: /sair/i })
    await userEvent.click(exit)

    await waitFor(() => expect(leaveTo).toHaveBeenCalled())
    const url = new URL(vi.mocked(leaveTo).mock.calls.at(-1)![0])
    expect(url.origin + url.pathname).toBe(`${ISSUER.slice(0, -1)}/end-session/`)
    expect(url.searchParams.get('id_token_hint')).toBe('id1')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(`${window.location.origin}/login`)
    expect(url.searchParams.get('client_id')).toBe('trem')
    expect(sessionStorage.getItem(TOKENS)).toBeNull()
    // Nothing may navigate after it: /login's own redirect would cancel the logout and log
    // the user straight back in.
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(leaveTo).toHaveBeenCalledTimes(1)
  })

  it('account security points to authentik', async () => {
    sessionStorage.setItem(TOKENS, JSON.stringify({ refreshToken: 'r1' }))
    withAuthentik(fakeApi({ 'GET /me': () => json(ME) }), () => json({ access_token: fakeToken(), refresh_token: 'r2' }))
    renderAt('/account/seguranca')

    const open = await screen.findByRole('link', { name: 'Abrir minha conta de login' })
    expect(open).toHaveAttribute('href', `${AUTH}/if/user/#/settings`)
  })
})

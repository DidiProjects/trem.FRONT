import { afterEach, describe, expect, it, vi } from 'vitest'
import { RENEW, fakeApi, fakeToken, json, storedSession } from '@/test/fakeApi'
import { authRequest, refresh, session } from './session'

const TOKEN_ENDPOINT = 'authentik /application/o/token/'

afterEach(() => session.forget())

describe('refresh', () => {
  it("sends one renewal for concurrent callers, with this tab's refresh token", async () => {
    storedSession()
    const api = fakeApi({ [RENEW]: () => json({ access_token: fakeToken(), refresh_token: 'r2' }) })

    const [a, b] = await Promise.all([refresh(), refresh()])

    expect(a).toBe(b)
    expect(api.to('POST', TOKEN_ENDPOINT)).toHaveLength(1)
    expect(api.to('POST', TOKEN_ENDPOINT)[0].body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'r1', client_id: 'trem' })
    expect(session.token).toBe(a)
    expect(session.hasStoredSession()).toBe(true)
  })

  it('ends the session when authentik no longer accepts the refresh token', async () => {
    storedSession()
    fakeApi({ [RENEW]: () => json({ error: 'invalid_grant' }, 400) })
    session.start(fakeToken())
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)

    expect(await refresh()).toBeNull()
    expect(session.token).toBeNull()
    expect(session.hasStoredSession()).toBe(false)
    expect(listener).toHaveBeenCalledWith('ended')
    unsubscribe()
  })

  it('keeps the session when the login server is down', async () => {
    storedSession()
    fakeApi({ [RENEW]: () => json({}, 503) })
    session.start(fakeToken())

    await expect(refresh()).rejects.toThrow()
    expect(session.hasStoredSession()).toBe(true)
  })
})

describe('authRequest', () => {
  it('renews an expired access token once and retries', async () => {
    storedSession()
    const fresh = fakeToken()
    session.start(fakeToken('ana', -1))
    const api = fakeApi({
      [RENEW]: () => json({ access_token: fresh }),
      'GET /me': (call) =>
        call.headers.authorization === `Bearer ${fresh}` ? json({ username: 'ana' }) : json({ detail: 'Token expirado' }, 401),
    })

    expect(await authRequest('/me')).toEqual({ username: 'ana' })
    expect(api.to('GET', '/me')).toHaveLength(2)
    expect(api.to('POST', TOKEN_ENDPOINT)).toHaveLength(1)
  })

  it('gives up when the session is over', async () => {
    storedSession()
    session.start(fakeToken())
    fakeApi({
      [RENEW]: () => json({ error: 'invalid_grant' }, 400),
      'GET /me': () => json({ detail: 'Token inválido' }, 401),
    })

    await expect(authRequest('/me')).rejects.toMatchObject({ status: 401, message: 'Sua sessão expirou. Entre de novo.' })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, fakeToken, json } from '@/test/fakeApi'
import { authRequest, refresh, session } from './session'

afterEach(() => session.forget())

describe('refresh', () => {
  it('sends one request for concurrent callers, with the CSRF header', async () => {
    const api = fakeApi({ 'POST /auth/refresh': () => json({ access_token: fakeToken() }) })

    const [a, b] = await Promise.all([refresh(), refresh()])

    expect(a).toBe(b)
    expect(api.to('POST', '/auth/refresh')).toHaveLength(1)
    expect(api.calls[0].headers['x-requested-with']).toBe('trem')
    expect(session.token).toBe(a)
    expect(session.hasStoredSession()).toBe(true)
  })

  it('ends the session when the cookie is no longer valid', async () => {
    fakeApi({ 'POST /auth/refresh': () => json({ detail: 'Refresh token inválido' }, 401) })
    session.start(fakeToken())
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)

    expect(await refresh()).toBeNull()
    expect(session.token).toBeNull()
    expect(session.hasStoredSession()).toBe(false)
    expect(listener).toHaveBeenCalledWith('ended')
    unsubscribe()
  })

  it('keeps the session when the server is down', async () => {
    fakeApi({ 'POST /auth/refresh': () => json({}, 503) })
    session.start(fakeToken())

    await expect(refresh()).rejects.toThrow()
    expect(session.hasStoredSession()).toBe(true)
  })
})

describe('authRequest', () => {
  it('renews an expired access token once and retries', async () => {
    const fresh = fakeToken()
    session.start(fakeToken('ana', -1))
    const api = fakeApi({
      'POST /auth/refresh': () => json({ access_token: fresh }),
      'GET /me': (call) =>
        call.headers.authorization === `Bearer ${fresh}` ? json({ username: 'ana' }) : json({ detail: 'Token expirado' }, 401),
    })

    expect(await authRequest('/me')).toEqual({ username: 'ana' })
    expect(api.to('GET', '/me')).toHaveLength(2)
    expect(api.to('POST', '/auth/refresh')).toHaveLength(1)
  })

  it('gives up when the session is over', async () => {
    session.start(fakeToken())
    fakeApi({
      'POST /auth/refresh': () => json({ detail: 'x' }, 401),
      'GET /me': () => json({ detail: 'Token inválido' }, 401),
    })

    await expect(authRequest('/me')).rejects.toMatchObject({ status: 401, message: 'Sua sessão expirou. Entre de novo.' })
  })
})

describe('logout', () => {
  it('ends the login on the API even if the request fails, and forgets it locally', async () => {
    const api = fakeApi({ 'POST /auth/logout': () => json({}, 500) })
    session.start(fakeToken())

    await session.logout()

    expect(api.to('POST', '/auth/logout')[0].headers['x-requested-with']).toBe('trem')
    expect(session.token).toBeNull()
    expect(session.hasStoredSession()).toBe(false)
  })
})

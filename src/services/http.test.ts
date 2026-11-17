import { describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, request, toApiError } from './http'
import { json } from '@/test/fakeApi'

describe('toApiError', () => {
  it('maps a validation list to fields, without the pydantic prefix', async () => {
    const error = await toApiError(
      json({ detail: [{ loc: ['body', 'new_password'], msg: 'Value error, A senha deve ter no mínimo 12 caracteres' }] }, 422),
    )
    expect(error.fieldErrors).toEqual({ new_password: 'A senha deve ter no mínimo 12 caracteres' })
    expect(error.message).toBe('A senha deve ter no mínimo 12 caracteres')
  })

  it('keeps a plain detail as the message', async () => {
    const error = await toApiError(json({ detail: 'Credenciais inválidas' }, 401))
    expect(error).toMatchObject({ status: 401, message: 'Credenciais inválidas', fieldErrors: {} })
  })

  it('reads Retry-After on a 429', async () => {
    const error = await toApiError(json({ detail: 'Muitas tentativas' }, 429, { 'Retry-After': '42' }))
    expect(error.retryAfter).toBe(42)
  })

  it('hides a server error body behind a friendly message', async () => {
    const error = await toApiError(new Response('<html>Bad Gateway</html>', { status: 502 }))
    expect(error.message).toMatch(/servidor não respondeu/)
  })
})

describe('request', () => {
  it('turns a network failure into an ApiError with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request('/x')).rejects.toEqual(new ApiError(NETWORK_ERROR, 0))
  })

  it('sends JSON and reads JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await request('/x', { method: 'POST', body: { a: 1 } })).toEqual({ ok: true })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
    expect(init.credentials).toBe('same-origin')
  })
})

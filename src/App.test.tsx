import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { session } from './services/session'
import { ME, RENEW, fakeApi, json, renewed, storedSession } from './test/fakeApi'
import { leaveTo } from './utils/leave'

vi.mock('./utils/leave', () => ({ leaveTo: vi.fn() }))

function open(path: string) {
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

beforeEach(() => vi.mocked(leaveTo).mockClear())
afterEach(() => session.forget())

describe('login', () => {
  it('an anonymous visit goes to authentik without trying a renewal', async () => {
    const api = fakeApi({})
    open('/servicos')

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(expect.stringContaining('https://auth.example/application/o/authorize/')))
    expect(api.calls).toHaveLength(0)
  })

  it('the old login addresses are gone', async () => {
    fakeApi({})
    open('/register')

    await waitFor(() => expect(leaveTo).toHaveBeenCalled())
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })
})

describe('session', () => {
  it("restores this tab's session at authentik", async () => {
    storedSession()
    const api = fakeApi({ [RENEW]: renewed, 'GET /me': () => json(ME) })
    open('/')

    expect(await screen.findByRole('heading', { name: 'Olá, ana' })).toBeInTheDocument()
    expect(api.to('POST', `authentik /application/o/token/`)[0].body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'r1' })
  })

  it('an account with nothing released yet is told it waits for approval', async () => {
    storedSession()
    fakeApi({ [RENEW]: renewed, 'GET /me': () => json({ ...ME, permissions: [] }) })
    open('/')

    expect(await screen.findByText(/libera o acesso depois de aprovar o cadastro/)).toBeInTheDocument()
  })

  it('offers a retry when the login server is unreachable', async () => {
    storedSession()
    fakeApi({ [RENEW]: () => json({}, 503) })
    open('/')

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('a session authentik no longer accepts goes back to the login', async () => {
    storedSession()
    fakeApi({ [RENEW]: () => json({ error: 'invalid_grant' }, 400) })
    open('/')

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(expect.stringContaining('/application/o/authorize/')))
  })
})

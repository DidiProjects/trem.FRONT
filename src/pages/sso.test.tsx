import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { session } from '@/services/session'
import { openAt, loggedIn } from '@/test/app'
import { ME, fakeApi, fakeToken, json } from '@/test/fakeApi'
import { leaveTo } from '@/utils/leave'

vi.mock('@/utils/leave', () => ({ leaveTo: vi.fn() }))

const REQUEST = 'req-abc'
const VIEW = `GET /oauth/authorize/${REQUEST}`
const PENDING = { service_slug: 'didiflix', service_name: 'Didiflix', logo_url: null, username: 'ana', allowed: true }
const BACK = 'http://100.64.0.1:8096/sso/OID/redirect/trem?code=c1&state=s1&iss=x'

beforeEach(() => vi.mocked(leaveTo).mockClear())
afterEach(() => session.forget())

describe('login of a hub service (/sso)', () => {
  it('asks to continue as the account and sends the browser back to the service', async () => {
    const api = fakeApi({
      ...loggedIn('hub:didiflix'),
      [VIEW]: () => json(PENDING),
      [`POST /oauth/authorize/${REQUEST}/approve`]: () => json({ redirect: BACK }),
    })
    openAt(`/sso?request=${REQUEST}`)

    expect(await screen.findByRole('heading', { name: 'Entrar em Didiflix' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar como ana' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(BACK))
    expect(api.to('POST', `/oauth/authorize/${REQUEST}/approve`)).toHaveLength(1)
  })

  it('cancel tells the service and leaves', async () => {
    const denied = 'http://100.64.0.1:8096/cb?error=access_denied&state=s1'
    const api = fakeApi({
      ...loggedIn('hub:didiflix'),
      [VIEW]: () => json(PENDING),
      [`POST /oauth/authorize/${REQUEST}/deny`]: () => json({ redirect: denied }),
    })
    openAt(`/sso?request=${REQUEST}`)

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(denied))
    expect(api.to('POST', `/oauth/authorize/${REQUEST}/approve`)).toHaveLength(0)
  })

  it('an account without the service is told so and cannot continue', async () => {
    fakeApi({ ...loggedIn(), [VIEW]: () => json({ ...PENDING, allowed: false }) })
    openAt(`/sso?request=${REQUEST}`)

    expect(await screen.findByRole('heading', { name: 'Sem acesso a Didiflix' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar para Didiflix' })).toBeInTheDocument()
  })

  it('an expired request asks to start again from the service', async () => {
    fakeApi({ ...loggedIn(), [VIEW]: () => json({ detail: 'Pedido de login expirado' }, 404) })
    openAt(`/sso?request=${REQUEST}`)

    expect(await screen.findByText(/expirou ou já foi usado/)).toBeInTheDocument()
  })

  it('a link trem.API refused never asks anything', async () => {
    const api = fakeApi(loggedIn())
    openAt('/sso?error=invalid_redirect_uri')

    expect(await screen.findByText(/não é válido/)).toBeInTheDocument()
    expect(api.calls.some((c) => c.path.startsWith('/oauth/'))).toBe(false)
  })

  it('without a session, logs in first and comes back to the same request', async () => {
    fakeApi({
      'POST /auth/login': () => json({ access_token: fakeToken(), must_change_password: false }),
      'GET /me': () => json({ ...ME, permissions: ['hub:didiflix'] }),
      [VIEW]: () => json(PENDING),
    })
    window.history.replaceState(null, '', `/sso?request=${REQUEST}`)
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    await userEvent.type(await screen.findByLabelText('Usuário'), 'ana')
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste('senha qualquer')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('button', { name: 'Continuar como ana' })).toBeInTheDocument()
    expect(window.location.search).toBe(`?request=${REQUEST}`)
  })
})

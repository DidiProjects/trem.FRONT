import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { session } from './services/session'
import { captureEmailLink } from './utils/emailLinks'
import { ME, fakeApi, fakeToken, json } from './test/fakeApi'

const PASSWORD = 'senha antiga e longa'
const NEW_PASSWORD = 'cavalo bateria grampo'

function open(path: string) {
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Usuário'), 'ana')
  await user.type(screen.getByLabelText('Senha'), PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

afterEach(() => session.forget())

describe('login', () => {
  it('an anonymous visit lands on the login page without calling refresh', async () => {
    const api = fakeApi({})
    open('/')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('shows field errors before calling the API', async () => {
    const api = fakeApi({})
    const user = userEvent.setup()
    open('/login')

    await user.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe o usuário')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('goes back to the page that asked for the login, query included', async () => {
    fakeApi({
      'POST /auth/login': () => json({ access_token: fakeToken(), must_change_password: false }),
      'GET /me': () => json(ME),
    })
    const user = userEvent.setup()
    open('/servicos?filtro=radarr')

    await fillLogin(user)

    expect(await screen.findByRole('heading', { name: 'Serviços do servidor' })).toBeInTheDocument()
    expect(window.location.pathname + window.location.search).toBe('/servicos?filtro=radarr')
  })

  it('logs in with the session cookie and shows only the granted services', async () => {
    const api = fakeApi({
      'POST /auth/login': () => json({ access_token: fakeToken(), must_change_password: false }),
      'GET /me': () => json(ME),
    })
    const user = userEvent.setup()
    open('/login')

    await fillLogin(user)

    expect(await screen.findByRole('heading', { name: 'Radarr' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Immich' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sonarr' })).not.toBeInTheDocument()
    expect(api.to('POST', '/auth/login')[0].body).toMatchObject({ username: 'ana', session: 'cookie', audience: 'trem' })
  })

  it('asks for the TOTP code when the account has a second factor', async () => {
    const api = fakeApi({
      'POST /auth/login': () => json({ mfa_required: true, mfa_token: 'challenge' }),
      'POST /auth/mfa/verify': (call) =>
        call.body?.code === '123456' ? json({ access_token: fakeToken() }) : json({ detail: 'Código inválido' }, 401),
      'GET /me': () => json(ME),
    })
    const user = userEvent.setup()
    open('/login')
    await fillLogin(user)

    const code = await screen.findByLabelText('Código')
    await user.type(code, '000000')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))
    expect(await screen.findByText('Código inválido')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Código'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('heading', { name: 'Radarr' })).toBeInTheDocument()
    expect(api.to('POST', '/auth/mfa/verify').at(-1)?.body).toEqual({ mfa_token: 'challenge', code: '123456', session: 'cookie' })
  })

  it('shows the wait from a 429 and blocks the button', async () => {
    fakeApi({ 'POST /auth/login': () => json({ detail: 'Muitas tentativas' }, 429, { 'Retry-After': '30' }) })
    const user = userEvent.setup()
    open('/login')
    await fillLogin(user)

    expect(await screen.findByText(/Tente de novo em 30 s/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aguarde/ })).toBeDisabled()
  })
})

describe('provisional password', () => {
  it('forces the change, then logs in again with the new password', async () => {
    const api = fakeApi({
      'POST /auth/login': (call) =>
        call.body?.password === NEW_PASSWORD
          ? json({ access_token: fakeToken() })
          : json({ access_token: fakeToken(), must_change_password: true }),
      'GET /me': () => json({ ...ME, must_change_password: api.to('POST', '/auth/change-password').length === 0 }),
      'POST /auth/change-password': () => json({ message: 'Senha alterada com sucesso' }),
    })
    const user = userEvent.setup()
    open('/login')
    await fillLogin(user)

    expect(await screen.findByRole('heading', { name: 'Defina sua senha' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Senha provisória'), PASSWORD)
    await user.type(screen.getByLabelText('Senha nova'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Confirme a senha nova'), NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByRole('heading', { name: 'Radarr' })).toBeInTheDocument()
    expect(api.to('POST', '/auth/change-password')[0].body).toEqual({ current_password: PASSWORD, new_password: NEW_PASSWORD })
    expect(api.to('POST', '/auth/login').at(-1)?.body).toMatchObject({ password: NEW_PASSWORD })
  })

  it('shows the API reason for a refused password on the field', async () => {
    fakeApi({
      'POST /auth/login': () => json({ access_token: fakeToken(), must_change_password: true }),
      'GET /me': () => json({ ...ME, must_change_password: true }),
      'POST /auth/change-password': () => json({ detail: 'Esta senha aparece em vazamentos de dados conhecidos. Escolha outra.' }, 422),
    })
    const user = userEvent.setup()
    open('/login')
    await fillLogin(user)

    await user.type(await screen.findByLabelText('Senha provisória'), PASSWORD)
    await user.type(screen.getByLabelText('Senha nova'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Confirme a senha nova'), NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByText(/vazamentos de dados conhecidos/)).toBeInTheDocument()
  })
})

describe('session', () => {
  it('restores a stored session from the cookie', async () => {
    localStorage.setItem('trem.session', '1')
    fakeApi({ 'POST /auth/refresh': () => json({ access_token: fakeToken() }), 'GET /me': () => json(ME) })
    open('/')

    expect(await screen.findByRole('heading', { name: 'Olá, ana' })).toBeInTheDocument()
  })

  it('offers a retry when the API is unreachable', async () => {
    localStorage.setItem('trem.session', '1')
    fakeApi({ 'POST /auth/refresh': () => json({}, 503) })
    open('/')

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('logs out', async () => {
    localStorage.setItem('trem.session', '1')
    const api = fakeApi({
      'POST /auth/refresh': () => json({ access_token: fakeToken() }),
      'GET /me': () => json(ME),
      'POST /auth/logout': () => json({ message: 'ok' }),
    })
    const user = userEvent.setup()
    open('/')

    await user.click(await screen.findByRole('button', { name: 'Abrir menu da conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }))

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(api.to('POST', '/auth/logout')).toHaveLength(1)
    expect(localStorage.getItem('trem.session')).toBeNull()
  })
})

describe('e-mail links', () => {
  it('resets the password from the link, then asks to log in', async () => {
    const token = 'r'.repeat(43)
    const api = fakeApi({ 'POST /auth/reset-password': () => json({ message: 'Senha redefinida' }) })
    window.history.replaceState(null, '', `/#reset-password=${token}`)
    captureEmailLink()
    const user = userEvent.setup()
    open('/reset-password')

    await user.type(await screen.findByLabelText('Senha nova'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Confirme a senha nova'), NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByText('Senha redefinida. Entre com a senha nova.')).toBeInTheDocument()
    expect(api.to('POST', '/auth/reset-password')[0].body).toEqual({ token, new_password: NEW_PASSWORD })
  })

  it('confirms the e-mail once, even under StrictMode', async () => {
    const api = fakeApi({ 'POST /auth/verify-email': () => json({ message: 'E-mail confirmado.' }) })
    window.history.replaceState(null, '', `/#verify-email=${'v'.repeat(43)}`)
    captureEmailLink()
    open('/verify-email')

    expect(await screen.findByText('E-mail confirmado.')).toBeInTheDocument()
    await waitFor(() => expect(api.to('POST', '/auth/verify-email')).toHaveLength(1))
  })

  it('a reset page without a link points to a new one', async () => {
    fakeApi({})
    open('/reset-password')
    expect(await screen.findByRole('link', { name: 'Pedir novo link' })).toBeInTheDocument()
  })
})

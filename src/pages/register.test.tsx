import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { fakeApi, json } from '@/test/fakeApi'

const PASSWORD = 'cavalo bateria grampo'
const CHECK = 'GET /auth/username-available?username='
// The answer comes after the debounce plus the request; the default 1 s is too close.
const WAIT = { timeout: 3000 }

function open() {
  window.history.replaceState(null, '', '/register')
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

async function fill(user: ReturnType<typeof userEvent.setup>, username: string) {
  await user.type(await screen.findByLabelText('Usuário'), username)
  await user.type(screen.getByLabelText('E-mail'), 'joana@example.com')
  await user.type(screen.getByLabelText('Senha', { selector: 'input' }), PASSWORD)
  await user.type(screen.getByLabelText('Confirme a senha', { selector: 'input' }), PASSWORD)
}

describe('sign-up username', () => {
  it('asks once the typing pauses and says the name is free', async () => {
    const api = fakeApi({ [`${CHECK}joana`]: () => json({ available: true }) })
    const user = userEvent.setup()
    open()

    await user.type(await screen.findByLabelText('Usuário'), 'joana')

    expect(await screen.findByText('Nome disponível', {}, WAIT)).toBeInTheDocument()
    const checks = api.calls.filter((call) => call.path.startsWith('/auth/username-available'))
    expect(checks.map((call) => call.path)).toEqual(['/auth/username-available?username=joana'])
  })

  it('says a taken name at once and does not send the sign-up', async () => {
    const api = fakeApi({ [`${CHECK}joana`]: () => json({ available: false }) })
    const user = userEvent.setup()
    open()

    await fill(user, 'joana')
    expect(await screen.findByText('Este nome já está em uso. Escolha outro.', {}, WAIT)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByLabelText('Usuário')).toHaveFocus()
    expect(screen.getByLabelText('Usuário')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls.some((call) => call.path === '/auth/register')).toBe(false)
  })

  it('does not ask for a name the rules already refuse', async () => {
    const api = fakeApi({})
    const user = userEvent.setup()
    open()

    await user.type(await screen.findByLabelText('Usuário'), 'jo')
    await user.tab()

    expect(await screen.findByText('Mínimo de 3 caracteres')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(api.calls.some((call) => call.path.startsWith('/auth/username-available'))).toBe(false)
  })

  it('a name taken meanwhile comes back as a 409 on the same field', async () => {
    fakeApi({
      [`${CHECK}joana`]: () => json({ available: true }),
      'POST /auth/register': () => json({ detail: 'Nome de usuário já cadastrado' }, 409),
    })
    const user = userEvent.setup()
    open()

    await fill(user, 'joana')
    await screen.findByText('Nome disponível', {}, WAIT)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Este nome já está em uso. Escolha outro.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a failed check does not block the sign-up', async () => {
    const api = fakeApi({
      [`${CHECK}joana`]: () => json({ detail: 'Muitas tentativas.' }, 429, { 'Retry-After': '60' }),
      'POST /auth/register': () => json({ message: 'ok' }, 202),
    })
    const user = userEvent.setup()
    open()

    await fill(user, 'joana')
    await waitFor(() => expect(screen.queryByText('Conferindo se o nome está livre…')).not.toBeInTheDocument(), WAIT)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(api.calls.filter((call) => call.path === '/auth/register')).toHaveLength(1)
  })
})

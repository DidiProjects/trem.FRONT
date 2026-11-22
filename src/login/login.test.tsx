import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { json } from '@/test/fakeApi'
import { leaveTo } from '@/utils/leave'
import { flowSlug } from './flowSlug'
import { LoginApp } from './LoginApp'

vi.mock('@/utils/leave', () => ({ leaveTo: vi.fn() }))

const SLUG = 'default-authentication-flow'
const QUERY = 'next=%2Fapplication%2Fo%2Fauthorize%2F%3Fclient_id%3Ddidiflix'
const EXECUTOR = `/api/v3/flows/executor/${SLUG}/?query=${encodeURIComponent(QUERY)}`
const IDENTIFY = { component: 'ak-stage-identification', application_pre: 'Didiflix', password_fields: true, flow_info: {} }
const MFA = { component: 'ak-stage-authenticator-validate', device_challenges: [{ device_class: 'totp' }], flow_info: {} }
const BACK = '/application/o/authorize/?client_id=didiflix'

/** authentik's executor: GET gives the current challenge, POST answers the next one. */
function fakeAuthentik(answer: (body: Record<string, unknown> | undefined) => unknown) {
  const posts: Record<string, unknown>[] = []
  const headers: Headers[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (String(input) !== EXECUTOR) throw new TypeError(`unexpected fetch: ${String(input)}`)
      headers.push(new Headers(init.headers))
      const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
      if (body) posts.push(body)
      return json(answer(body))
    }),
  )
  return { posts, headers }
}

function open() {
  render(
    <StrictMode>
      <LoginApp slug={SLUG} query={QUERY} />
    </StrictMode>,
  )
}

beforeEach(() => vi.mocked(leaveTo).mockClear())

describe('trem login screen on authentik (/if/flow/:slug)', () => {
  it('reads the flow from the address authentik sends the browser to', () => {
    expect(flowSlug('/if/flow/default-authentication-flow/')).toBe(SLUG)
    expect(flowSlug('/if/flow/default-recovery-flow')).toBe('default-recovery-flow')
  })

  it('sends user and password and follows the redirect back to the service', async () => {
    const { posts, headers } = fakeAuthentik((body) => (body ? { component: 'xak-flow-redirect', to: BACK } : IDENTIFY))
    open()

    expect(await screen.findByText('Use sua conta do trem para continuar em Didiflix.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Usuário'), 'ana')
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste('segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(BACK))
    expect(posts).toEqual([{ component: 'ak-stage-identification', uid_field: 'ana', password: 'segredo' }])
    expect(headers[0].get('Accept-Language')).toBe('pt-BR')
  })

  it("shows authentik's error in Portuguese and keeps the form", async () => {
    fakeAuthentik((body) =>
      body ? { ...IDENTIFY, response_errors: { non_field_errors: [{ string: 'Failed to authenticate.' }] } } : IDENTIFY,
    )
    open()

    await userEvent.type(await screen.findByLabelText('Usuário'), 'ana')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Usuário ou senha incorretos.')).toBeInTheDocument()
    expect(leaveTo).not.toHaveBeenCalled()
  })

  it('asks for the authenticator code after the password', async () => {
    const { posts } = fakeAuthentik((body) => {
      if (!body) return IDENTIFY
      return body.component === 'ak-stage-identification' ? MFA : { component: 'xak-flow-redirect', to: BACK }
    })
    open()

    await userEvent.type(await screen.findByLabelText('Usuário'), 'ana')
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste('segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await userEvent.type(await screen.findByLabelText('Código'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verificar' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(BACK))
    expect(posts.at(-1)).toEqual({ component: 'ak-stage-authenticator-validate', code: '123456' })
  })

  it.each([
    [true, 'checked'],
    [false, 'left unchecked'],
  ])("answers authentik's stay-signed-in step with %s when the box is %s", async (remember) => {
    const { posts } = fakeAuthentik((body) => {
      if (!body) return IDENTIFY
      return body.component === 'ak-stage-identification'
        ? { component: 'ak-stage-user-login', flow_info: {} }
        : { component: 'xak-flow-redirect', to: BACK }
    })
    open()

    await userEvent.type(await screen.findByLabelText('Usuário'), 'ana')
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste('segredo')
    if (remember) await userEvent.click(screen.getByLabelText('Manter conectado'))
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(BACK))
    expect(posts).toEqual([
      { component: 'ak-stage-identification', uid_field: 'ana', password: 'segredo' },
      { component: 'ak-stage-user-login', remember_me: remember },
    ])
  })

  it('offers the sign-up flow when authentik has one', async () => {
    fakeAuthentik(() => ({ ...IDENTIFY, enroll_url: `/if/flow/trem-enrollment/?${QUERY}` }))
    open()

    expect(await screen.findByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', `/if/flow/trem-enrollment/?${QUERY}`)
  })

  it('an account without the service is told so', async () => {
    fakeAuthentik(() => ({ component: 'ak-stage-access-denied', application_pre: 'Didiflix', error_message: 'Request has been denied.' }))
    open()

    expect(await screen.findByRole('heading', { name: 'Sem acesso a Didiflix' })).toBeInTheDocument()
    expect(screen.getByText('Esta conta não tem acesso a este serviço.')).toBeInTheDocument()
  })
})

describe('trem sign-up screen on authentik (/if/flow/trem-enrollment)', () => {
  const ENROLL = 'trem-enrollment'
  const ENROLL_EXECUTOR = `/api/v3/flows/executor/${ENROLL}/?query=${encodeURIComponent(QUERY)}`
  const PROMPT = {
    component: 'ak-stage-prompt',
    flow_info: { title: 'Criar conta' },
    fields: [
      { field_key: 'password_repeat', label: 'Repita a senha', type: 'password', required: true, order: 3 },
      { field_key: 'username', label: 'Usuário', type: 'username', required: true, order: 0 },
      { field_key: 'email', label: 'E-mail', type: 'email', required: true, order: 1 },
      { field_key: 'password', label: 'Senha', type: 'password', required: true, order: 2 },
    ],
  }
  const GOOD = 'uma frase longa de verdade'

  /** Executor calls by URL: GET for a challenge, POST answered by `answer`. */
  function fakeExecutor(answer: (url: string, body: Record<string, unknown> | undefined) => unknown) {
    const calls: { url: string; body?: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(input)
        if (!url.startsWith('/api/v3/flows/executor/')) throw new TypeError(`unexpected fetch: ${url}`)
        const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
        calls.push({ url, body })
        return json(answer(url, body))
      }),
    )
    return calls
  }

  function openSignUp() {
    render(
      <StrictMode>
        <LoginApp slug={ENROLL} query={QUERY} />
      </StrictMode>,
    )
  }

  async function fill(username: string, password = GOOD, repeat = password) {
    await userEvent.type(await screen.findByLabelText('Usuário'), username)
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste(password)
    await userEvent.click(screen.getByLabelText('Repita a senha', { selector: 'input' }))
    await userEvent.paste(repeat)
  }

  it('sends the fields in authentik order and asks to check the e-mail', async () => {
    const calls = fakeExecutor((_, body) => (body ? { component: 'ak-stage-email', flow_info: {} } : PROMPT))
    openSignUp()

    await fill('ana')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(calls.filter((c) => c.body).map((c) => c.body)).toEqual([
      { component: 'ak-stage-prompt', username: 'ana', email: 'ana@example.com', password: GOOD, password_repeat: GOOD },
    ])
    expect(calls[0].url).toBe(ENROLL_EXECUTOR)
  })

  it('keeps the button off while the password is short or the repeat differs', async () => {
    fakeExecutor(() => PROMPT)
    openSignUp()

    await fill('ana', 'curta')
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
    await userEvent.clear(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.click(screen.getByLabelText('Senha', { selector: 'input' }))
    await userEvent.paste(GOOD)
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
  })

  it("shows authentik's refusal in Portuguese next to the field", async () => {
    fakeExecutor((_, body) =>
      body ? { ...PROMPT, response_errors: { username: [{ string: 'Username is already taken.' }] } } : PROMPT,
    )
    openSignUp()

    await fill('akadmin')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Este nome já está em uso. Escolha outro.')).toBeInTheDocument()
  })

  it('the e-mail link confirms, follows the flow inside the executor and leaves for the app', async () => {
    const next = `/api/v3/flows/executor/${ENROLL}/?query=next%3D%252F%26flow_token%3Dt1`
    const calls = fakeExecutor((url, body) => {
      if (body) return { component: 'xak-flow-redirect', to: next }
      if (url === next) return { component: 'xak-flow-redirect', to: BACK }
      return { component: 'ak-stage-consent', header_text: 'Continue to confirm this email address.', token: 'k1', flow_info: {} }
    })
    openSignUp()

    expect(await screen.findByText('Confirme o seu e-mail para ativar a conta.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar e ativar a conta' }))

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(BACK))
    expect(leaveTo).toHaveBeenCalledTimes(1)
    expect(calls.filter((c) => c.body).map((c) => c.body)).toEqual([{ component: 'ak-stage-consent', token: 'k1' }])
    expect(calls.filter((c) => c.url === next)).toHaveLength(1)
  })
})

describe('trem password reset screen on authentik (/if/flow/trem-recovery)', () => {
  const RECOVERY = 'trem-recovery'

  function fakeExecutor(answer: (url: string, body: Record<string, unknown> | undefined) => unknown) {
    const calls: { url: string; body?: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(input)
        const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
        calls.push({ url, body })
        return json(answer(url, body))
      }),
    )
    return calls
  }

  function openReset() {
    render(
      <StrictMode>
        <LoginApp slug={RECOVERY} query={QUERY} />
      </StrictMode>,
    )
  }

  it('the login offers "Esqueci a senha"', async () => {
    fakeAuthentik(() => ({ ...IDENTIFY, recovery_url: `/if/flow/${RECOVERY}/?${QUERY}` }))
    open()

    expect(await screen.findByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute('href', `/if/flow/${RECOVERY}/?${QUERY}`)
  })

  it('asks for the user or e-mail only and says a link may have been sent', async () => {
    const calls = fakeExecutor((_, body) =>
      body
        ? { component: 'ak-stage-email', flow_info: {} }
        : { component: 'ak-stage-identification', user_fields: ['username', 'email'], password_fields: false, flow_info: {} },
    )
    openReset()

    expect(await screen.findByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Manter conectado')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Usuário ou e-mail'), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(/Se existir uma conta com esse usuário ou e-mail/)).toBeInTheDocument()
    expect(calls.filter((c) => c.body).map((c) => c.body)).toEqual([{ component: 'ak-stage-identification', uid_field: 'ana@example.com' }])
  })

  it('the e-mail link takes the new password, says it changed and only then leaves for the login', async () => {
    const PROMPT = {
      component: 'ak-stage-prompt',
      flow_info: { title: 'Redefinir senha' },
      fields: [
        { field_key: 'password', label: 'Senha nova', type: 'password', required: true, order: 0 },
        { field_key: 'password_repeat', label: 'Repita a senha nova', type: 'password', required: true, order: 1 },
      ],
    }
    const calls = fakeExecutor((_, body) => {
      if (!body) return { component: 'ak-stage-consent', token: 'k1', flow_info: {} }
      if (body.component === 'ak-stage-consent') return PROMPT
      return { component: 'xak-flow-redirect', to: BACK }
    })
    openReset()

    await userEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    await userEvent.click(await screen.findByLabelText('Senha nova', { selector: 'input' }))
    await userEvent.paste('uma frase longa de verdade')
    await userEvent.click(screen.getByLabelText('Repita a senha nova', { selector: 'input' }))
    await userEvent.paste('uma frase longa de verdade')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))

    expect(await screen.findByRole('heading', { name: 'Senha alterada' })).toBeInTheDocument()
    expect(leaveTo).not.toHaveBeenCalled()
    expect(calls.at(-1)?.body).toEqual({
      component: 'ak-stage-prompt',
      password: 'uma frase longa de verdade',
      password_repeat: 'uma frase longa de verdade',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(leaveTo).toHaveBeenCalledWith(BACK)
  })
})

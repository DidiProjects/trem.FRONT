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

  it('an account without the service is told so', async () => {
    fakeAuthentik(() => ({ component: 'ak-stage-access-denied', application_pre: 'Didiflix', error_message: 'Request has been denied.' }))
    open()

    expect(await screen.findByRole('heading', { name: 'Sem acesso a Didiflix' })).toBeInTheDocument()
    expect(screen.getByText('Esta conta não tem acesso a este serviço.')).toBeInTheDocument()
  })
})

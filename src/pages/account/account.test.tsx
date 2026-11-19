import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { session } from '@/services/session'
import { loggedIn, openAt } from '@/test/app'
import { ME, fakeApi, fakeToken, json } from '@/test/fakeApi'

afterEach(() => session.forget())

describe('profile', () => {
  it('lists the products and services the account holds', async () => {
    fakeApi(loggedIn('trem:file_editor'))
    openAt('/account')

    expect(await screen.findByRole('heading', { name: 'Minha conta', level: 1 })).toBeInTheDocument()
    const products = screen.getByText('Produtos liberados').nextElementSibling as HTMLElement
    expect(within(products).getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '/documentos')
    expect(within(products).getByRole('link', { name: 'IA' })).toBeInTheDocument()
    expect(within(products).queryByRole('link', { name: /Automação/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('second factor', () => {
  it('turns on with password, QR code, code and saved recovery codes', async () => {
    let enabled = false
    const api = fakeApi({
      'POST /auth/refresh': () => json({ access_token: fakeToken() }),
      'GET /me': () => json({ ...ME, totp_enabled: enabled, recovery_codes_left: enabled ? 2 : 0 }),
      'POST /auth/mfa/enroll': () => json({ secret: 'ABCDEFGHIJKLMNOP', otpauth_uri: 'otpauth://totp/trem:ana?secret=ABCDEFGHIJKLMNOP' }),
      'POST /auth/mfa/confirm': () => {
        enabled = true
        return json({ recovery_codes: ['aaaa-bbbb', 'cccc-dddd'] })
      },
    })
    const user = userEvent.setup()
    openAt('/account/seguranca')

    await user.click(await screen.findByRole('button', { name: 'Ligar' }))
    await user.type(screen.getByLabelText('Senha', { selector: 'input' }), 'minha senha')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('img', { name: 'QR code para o app autenticador' })).toBeInTheDocument()
    expect(screen.getByText('ABCD EFGH IJKL MNOP')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Código do app'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const codes = await screen.findByRole('region', { name: 'Guarde estes códigos de recuperação agora' })
    expect(within(codes).getByText('aaaa-bbbb')).toBeInTheDocument()
    expect(within(codes).getByRole('button', { name: 'Concluir' })).toBeDisabled()
    await user.click(within(codes).getByRole('checkbox', { name: 'Guardei em lugar seguro' }))
    await user.click(within(codes).getByRole('button', { name: 'Concluir' }))

    expect(await screen.findByText('Ligada')).toBeInTheDocument()
    expect(api.to('POST', '/auth/mfa/enroll')[0].body).toEqual({ password: 'minha senha' })
    expect(api.to('POST', '/auth/mfa/confirm')[0].body).toEqual({ code: '123456' })
  })
})

describe('API keys', () => {
  it('creates a key with chosen permissions and shows it once', async () => {
    const created = {
      id: 'k1',
      name: 'script-backup',
      description: null,
      permissions: ['trem:file_editor'],
      key_hint: 'x9z',
      revoked: false,
      last_used_at: null,
      created_at: '2026-11-19T00:00:00Z',
    }
    let keys: object[] = []
    const api = fakeApi({
      ...loggedIn('trem:file_editor'),
      'GET /me/api-keys': () => json(keys),
      'POST /me/api-keys': () => {
        keys = [created]
        return json({ ...created, api_key: 'trem_secret_value' }, 201)
      },
    })
    const user = userEvent.setup()
    openAt('/account/chaves')

    expect(await screen.findByText('Nenhuma chave ativa.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar chave' }))
    await user.type(screen.getByLabelText('Nome'), 'script backup')
    expect(screen.getByText('Use letras, números, ponto, hífen ou _. Sem espaços.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'script-backup')
    await user.click(screen.getByRole('checkbox', { name: 'IA' }))
    await user.click(screen.getByRole('button', { name: 'Criar chave' }))

    const secret = await screen.findByRole('region', { name: 'Chave “script-backup” criada' })
    expect(within(secret).getByText('trem_secret_value')).toBeInTheDocument()
    expect(api.to('POST', '/me/api-keys')[0].body).toEqual({ name: 'script-backup', permissions: ['trem:file_editor'], description: null })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revogar a chave script-backup' })).toBeInTheDocument())
  })
})

describe('feedback', () => {
  it('sends the message as a form', async () => {
    const api = fakeApi({ ...loggedIn(), 'POST /support/feedback': () => json({ message: 'ok' }) })
    const user = userEvent.setup()
    openAt('/account/feedback')

    await user.click(await screen.findByRole('radio', { name: 'Algo quebrado' }))
    await user.type(screen.getByLabelText('Mensagem'), 'O botão não funciona')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Mensagem enviada. Obrigado!')).toBeInTheDocument()
    const sent = api.to('POST', '/support/feedback')[0].form!
    expect([sent.get('type'), sent.get('message'), sent.get('email')]).toEqual(['bug', 'O botão não funciona', 'ana@example.com'])
  })
})

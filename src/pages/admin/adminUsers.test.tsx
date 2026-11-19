import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { session } from '@/services/session'
import { loggedIn, openAt } from '@/test/app'
import { fakeApi, json } from '@/test/fakeApi'

const APPS = [
  {
    slug: 'trem',
    name: 'trem',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    permissions: [
      { key: 'trem:file_editor', name: 'file_editor', description: null },
      { key: 'trem:ai', name: 'ai', description: null },
      { key: 'trem:admin', name: 'admin', description: null },
    ],
  },
  { slug: 'hub', name: 'Hub', description: null, created_at: '2026-01-01T00:00:00Z', permissions: [{ key: 'hub:immich', name: 'immich', description: null }] },
]
const HUB = [{ slug: 'immich', permission: 'hub:immich', name: 'Fotos', description: null, url: null, enabled: true, position: 0, logo_url: null, created_at: '', updated_at: '' }]
const PENDING = {
  id: 'u9',
  username: 'bia',
  email: 'bia@example.com',
  permissions: [],
  status: 'pending_approval',
  must_change_password: false,
  provisional_password_sent_at: null,
  created_at: '2026-11-18T10:00:00Z',
  last_login_at: null,
}
const page = (items: object[]) => json({ items, total: items.length, limit: 50, offset: 0 })

const admin = {
  ...loggedIn('trem:admin'),
  'GET /admin/applications': () => json(APPS),
  'GET /admin/hub/services': () => json(HUB),
}

afterEach(() => session.forget())

describe('admin users', () => {
  it('approves a sign-up with the products and services chosen', async () => {
    const api = fakeApi({
      ...admin,
      'GET /admin/users?status=pending_approval&limit=50&offset=0': () => page([PENDING]),
      'POST /admin/users/u9/approve': (call) => json({ ...PENDING, status: 'active', permissions: call.body?.permissions }),
    })
    const user = userEvent.setup()
    openAt('/admin/usuarios?status=pending_approval')

    await user.click(await screen.findByRole('button', { name: /bia/ }))
    const panel = await screen.findByRole('region', { name: 'bia' })
    await user.click(await within(panel).findByRole('checkbox', { name: /Documentos, Imagens e Áudio e vídeo/ }))
    await user.click(within(panel).getByRole('checkbox', { name: 'Fotos' }))
    await user.click(within(panel).getByRole('button', { name: 'Aprovar com estas permissões' }))

    await waitFor(() => expect(api.to('POST', '/admin/users/u9/approve')).toHaveLength(1))
    expect(api.to('POST', '/admin/users/u9/approve')[0].body).toEqual({ permissions: ['trem:file_editor', 'hub:immich'] })
    expect(await screen.findByText('bia aprovado')).toBeInTheDocument()
  })

  it('keeps products, services and administration apart', async () => {
    fakeApi({ ...admin, 'GET /admin/users?limit=50&offset=0': () => page([{ ...PENDING, status: 'active', permissions: ['trem:ai'] }]) })
    const user = userEvent.setup()
    openAt('/admin/usuarios')

    await user.click(await screen.findByRole('button', { name: /bia/ }))
    const panel = await screen.findByRole('region', { name: 'bia' })
    const products = await within(panel).findByRole('group', { name: 'Produtos' })
    expect(within(products).getByRole('checkbox', { name: 'IA' })).toBeChecked()
    expect(within(products).queryByRole('checkbox', { name: /Administrador/ })).not.toBeInTheDocument()
    expect(within(panel).getByRole('group', { name: 'Serviços do servidor' })).toBeInTheDocument()
    expect(within(panel).getByRole('group', { name: 'Administração' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Salvar permissões' })).toBeDisabled()
  })

  it('is admin only', async () => {
    fakeApi(loggedIn())
    openAt('/admin/usuarios')
    expect(await screen.findByRole('heading', { name: 'Olá, ana' })).toBeInTheDocument()
  })
})

describe('applications and keys', () => {
  it('adds a permission to an application', async () => {
    const api = fakeApi({
      ...admin,
      'POST /admin/applications/trem/permissions': () => json({ key: 'trem:ocr', name: 'ocr', description: null }, 201),
    })
    const user = userEvent.setup()
    openAt('/admin/aplicacoes')

    const trem = await screen.findByRole('article', { name: 'trem' })
    await user.type(within(trem).getByLabelText('Nova permissão em trem'), 'ocr')
    await user.click(within(trem).getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(api.to('POST', '/admin/applications/trem/permissions')[0]?.body).toEqual({ name: 'ocr', description: null }))
    expect(within(screen.getByRole('article', { name: 'Hub' })).queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument()
  })

  it('creates a service key and shows it once', async () => {
    fakeApi({
      ...admin,
      'GET /admin/clients?limit=200': () => page([]),
      'POST /admin/clients': (call) =>
        json({ id: 'c1', name: call.body?.name, description: null, permissions: call.body?.permissions, user_id: null, key_hint: 'abc', revoked: false, last_used_at: null, created_at: '', api_key: 'svc_secret' }, 201),
    })
    const user = userEvent.setup()
    openAt('/admin/aplicacoes/chaves')

    await user.click(await screen.findByRole('button', { name: 'Nova chave de serviço' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nova chave de serviço' })
    await user.type(within(dialog).getByLabelText('Nome'), 'n8n')
    await user.click(within(dialog).getByRole('checkbox', { name: 'IA' }))
    await user.click(within(dialog).getByRole('button', { name: 'Criar chave' }))

    const secret = await screen.findByRole('region', { name: 'Chave “n8n” criada' })
    expect(within(secret).getByText('svc_secret')).toBeInTheDocument()
  })
})

import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { env } from '@/config/env'
import { session } from '@/services/session'
import { CATALOG, ME, fakeApi, fakeToken, json } from '@/test/fakeApi'

const ADMIN_ME = { ...ME, permissions: [...ME.permissions, 'trem:admin'] }

const SERVICE = {
  slug: 'immich',
  permission: 'hub:immich',
  name: 'Immich',
  description: 'Fotos',
  url: 'http://100.64.0.1:2283',
  enabled: true,
  position: 0,
  logo_url: '/hub/services/immich/logo?v=1',
  created_at: '2026-11-17T00:00:00Z',
  updated_at: '2026-11-17T00:00:00Z',
}
const NO_ADDRESS = { ...SERVICE, slug: 'radarr', permission: 'hub:radarr', name: 'Radarr', url: null, position: 1, logo_url: null }

const USERS = {
  items: [
    { id: 'u1', username: 'ana', email: 'ana@example.com', status: 'active', permissions: ['hub:immich'] },
    { id: 'u2', username: 'bia', email: null, status: 'active', permissions: [] },
  ],
  total: 2,
}

function openAt(path: string) {
  localStorage.setItem('trem.session', '1')
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

const loggedIn = (me = ADMIN_ME) => ({
  'POST /auth/refresh': () => json({ access_token: fakeToken() }),
  'GET /me': () => json(me),
})

afterEach(() => session.forget())

describe('catalog', () => {
  it('links each service to its address and loads the logo from trem.API', async () => {
    fakeApi(loggedIn(ME))
    openAt('/')

    const radarr = await screen.findByRole('article', { name: 'Radarr' })
    expect(within(radarr).getByRole('link', { name: 'Abrir Radarr em nova aba' })).toHaveAttribute('href', CATALOG[0].url)
    expect(radarr.querySelector('img')).toHaveAttribute('src', `${env.apiUrl}/hub/services/radarr/logo?v=1`)
    expect(screen.getByRole('article', { name: 'Immich' }).querySelector('img')).toBeNull()
  })

  it('offers a retry when the catalog fails', async () => {
    fakeApi({ ...loggedIn(ME), 'GET /hub/services': () => json({ detail: 'Indisponível' }, 503) })
    openAt('/')
    expect(await screen.findByText('Indisponível')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})

describe('admin area', () => {
  it('is not offered to other accounts', async () => {
    fakeApi(loggedIn(ME))
    const user = userEvent.setup()
    openAt('/admin/services')

    expect(await screen.findByRole('heading', { name: 'Olá, ana' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
    expect(screen.queryByRole('menuitem', { name: 'Serviços do catálogo' })).not.toBeInTheDocument()
  })

  it('lists the services, marking the one without an address', async () => {
    fakeApi({ ...loggedIn(), 'GET /admin/hub/services': () => json([SERVICE, NO_ADDRESS]) })
    const user = userEvent.setup()
    openAt('/')

    await user.click(await screen.findByRole('button', { name: 'Abrir menu da conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Serviços do catálogo' }))

    expect(await screen.findByRole('heading', { name: 'Radarr' })).toBeInTheDocument()
    expect(screen.getByText('Sem endereço')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir Immich' })).toBeDisabled()
  })

  it('explains a login without the second factor', async () => {
    fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json({ detail: 'Administração exige login com segundo fator (TOTP)' }, 403),
    })
    openAt('/admin/services')
    expect(await screen.findByText(/Saia e entre de novo com o código do autenticador/)).toBeInTheDocument()
  })

  it('creates a service with its logo, after checking the fields', async () => {
    const api = fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json([]),
      'POST /admin/hub/services': (call) => json({ ...SERVICE, ...call.body, logo_url: null }, 201),
      'PUT /admin/hub/services/immich/logo': () => json(SERVICE),
    })
    const user = userEvent.setup()
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo serviço' })
    await user.type(within(dialog).getByLabelText(/Identificador/), 'immich')
    await user.type(within(dialog).getByLabelText(/Nome/), 'Immich')
    await user.type(within(dialog).getByLabelText('Endereço'), 'ftp://x')
    await user.click(within(dialog).getByRole('button', { name: 'Criar serviço' }))
    expect(within(dialog).getByText('Use um endereço http:// ou https://')).toBeInTheDocument()
    expect(api.to('POST', '/admin/hub/services')).toHaveLength(0)

    await user.clear(within(dialog).getByLabelText('Endereço'))
    await user.type(within(dialog).getByLabelText('Endereço'), 'http://100.64.0.1:2283')
    const logo = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'immich.svg', { type: 'image/svg+xml' })
    await user.upload(within(dialog).getByLabelText('Arquivo do logo'), logo)
    await user.click(within(dialog).getByRole('button', { name: 'Criar serviço' }))

    expect(await screen.findByText('Immich criado')).toBeInTheDocument()
    expect(api.to('POST', '/admin/hub/services')[0].body).toEqual({
      slug: 'immich',
      name: 'Immich',
      description: null,
      url: 'http://100.64.0.1:2283',
      enabled: true,
    })
    expect(api.to('PUT', '/admin/hub/services/immich/logo')[0].form?.get('file')).toBeInstanceOf(File)
  })

  it('shows a taken identifier on its field', async () => {
    fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json([]),
      'POST /admin/hub/services': () => json({ detail: "Serviço 'immich' já existe" }, 409),
    })
    const user = userEvent.setup()
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo serviço' })
    await user.type(within(dialog).getByLabelText(/Identificador/), 'immich')
    await user.type(within(dialog).getByLabelText(/Nome/), 'Immich')
    await user.click(within(dialog).getByRole('button', { name: 'Criar serviço' }))

    expect(await within(dialog).findByText("Serviço 'immich' já existe")).toBeInTheDocument()
  })

  it('refuses a logo that is not an image it accepts', async () => {
    fakeApi({ ...loggedIn(), 'GET /admin/hub/services': () => json([SERVICE]) })
    const user = userEvent.setup({ applyAccept: false })
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Editar Immich' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar Immich' })
    await user.upload(within(dialog).getByLabelText('Arquivo do logo'), new File(['GIF89a'], 'a.gif', { type: 'image/gif' }))
    expect(within(dialog).getByText('Use uma imagem PNG, WebP ou SVG')).toBeInTheDocument()
  })

  it('grants and revokes access per account, undoing a failed change', async () => {
    const api = fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json([SERVICE]),
      'GET /admin/users?status=active&limit=200': () => json(USERS),
      'PUT /admin/hub/services/immich/users/u2': () => json({ message: 'Acesso liberado' }),
      'DELETE /admin/hub/services/immich/users/u1': () => json({ detail: 'Falhou' }, 500),
    })
    const user = userEvent.setup()
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Acesso a Immich' }))
    const dialog = screen.getByRole('dialog', { name: 'Acesso a Immich' })
    const ana = await within(dialog).findByRole('switch', { name: 'ana vê Immich' })
    const bia = within(dialog).getByRole('switch', { name: 'bia vê Immich' })
    expect(ana).toBeChecked()
    expect(bia).not.toBeChecked()

    await user.click(bia)
    await waitFor(() => expect(api.to('PUT', '/admin/hub/services/immich/users/u2')).toHaveLength(1))
    expect(bia).toBeChecked()

    await user.click(ana)
    expect(await screen.findByText('Falhou')).toBeInTheDocument()
    expect(ana).toBeChecked()
  })

  it('removes a service after confirming', async () => {
    const api = fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json([SERVICE, NO_ADDRESS]),
      'DELETE /admin/hub/services/immich': () => json({ message: 'Serviço removido' }),
    })
    const user = userEvent.setup()
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Remover Immich' }))
    const dialog = screen.getByRole('dialog', { name: 'Remover Immich?' })
    expect(api.to('DELETE', '/admin/hub/services/immich')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }))

    expect(await screen.findByText('Immich removido')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Immich' })).not.toBeInTheDocument()
  })

  it('moves a service and saves the new order', async () => {
    const api = fakeApi({
      ...loggedIn(),
      'GET /admin/hub/services': () => json([SERVICE, NO_ADDRESS]),
      'PUT /admin/hub/services/order': (call) =>
        json((call.body?.slugs as string[]).map((slug, position) => ({ ...(slug === 'immich' ? SERVICE : NO_ADDRESS), position }))),
    })
    const user = userEvent.setup()
    openAt('/admin/services')

    await user.click(await screen.findByRole('button', { name: 'Descer Immich' }))

    await waitFor(() => expect(api.to('PUT', '/admin/hub/services/order')[0]?.body).toEqual({ slugs: ['radarr', 'immich'] }))
    expect(within(screen.getByRole('main')).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Radarr', 'Immich'])
  })

  describe('login único', () => {
    const URI = 'http://100.64.0.1:2283/auth/login'
    const CLIENT = {
      client_id: 'hub.immich',
      redirect_uris: [URI],
      secret_created_at: '2026-11-20T00:00:00Z',
      created_at: '2026-11-20T00:00:00Z',
      updated_at: '2026-11-20T00:00:00Z',
    }

    it('turns it on and shows the secret only once', async () => {
      const api = fakeApi({
        ...loggedIn(),
        'GET /admin/hub/services': () => json([SERVICE]),
        'GET /admin/hub/services/immich/oidc': () => json({ detail: 'Serviço sem login único configurado' }, 404),
        'PUT /admin/hub/services/immich/oidc': () => json({ ...CLIENT, client_secret: 's3cr3t-value' }, 201),
      })
      const user = userEvent.setup()
      openAt('/admin/services')

      await user.click(await screen.findByRole('button', { name: 'Login único em Immich' }))
      const dialog = screen.getByRole('dialog', { name: 'Login único em Immich' })
      await user.click(await within(dialog).findByLabelText('Redirect URIs'))
      await user.paste(`${URI}\n\n  ${URI}/extra  `)
      await user.click(within(dialog).getByRole('button', { name: 'Ativar login único' }))

      const secret = await within(dialog).findByRole('region', { name: 'Segredo do login único' })
      expect(within(secret).getByText('s3cr3t-value')).toBeInTheDocument()
      expect(api.to('PUT', '/admin/hub/services/immich/oidc')[0].body).toEqual({ redirect_uris: [URI, `${URI}/extra`] })

      await user.click(within(secret).getByLabelText('Guardei em lugar seguro'))
      await user.click(within(secret).getByRole('button', { name: 'Concluir' }))
      expect(within(dialog).queryByText('s3cr3t-value')).not.toBeInTheDocument()
      expect(within(dialog).getByText('hub.immich')).toBeInTheDocument()
      expect(within(dialog).getByText(`${env.apiUrl}/.well-known/openid-configuration`)).toBeInTheDocument()
    })

    it('shows a refused address on the field', async () => {
      fakeApi({
        ...loggedIn(),
        'GET /admin/hub/services': () => json([SERVICE]),
        'GET /admin/hub/services/immich/oidc': () => json(CLIENT),
        'PUT /admin/hub/services/immich/oidc': () =>
          json({ detail: [{ loc: ['body', 'redirect_uris'], msg: 'Value error, http só para endereço local ou da Tailscale; fora disso, https' }] }, 422),
      })
      const user = userEvent.setup()
      openAt('/admin/services')

      await user.click(await screen.findByRole('button', { name: 'Login único em Immich' }))
      const dialog = screen.getByRole('dialog', { name: 'Login único em Immich' })
      const field = await within(dialog).findByLabelText('Redirect URIs')
      expect(field).toHaveValue(URI)
      await user.clear(field)
      await user.paste('http://fotos.example.com/cb')
      await user.click(within(dialog).getByRole('button', { name: 'Salvar endereços' }))

      expect(await within(dialog).findByText('http só para endereço local ou da Tailscale; fora disso, https')).toBeInTheDocument()
    })

    it('a new secret only after confirming', async () => {
      const api = fakeApi({
        ...loggedIn(),
        'GET /admin/hub/services': () => json([SERVICE]),
        'GET /admin/hub/services/immich/oidc': () => json(CLIENT),
        'POST /admin/hub/services/immich/oidc/secret': () => json({ ...CLIENT, client_secret: 'novo-segredo' }),
      })
      const user = userEvent.setup()
      openAt('/admin/services')

      await user.click(await screen.findByRole('button', { name: 'Login único em Immich' }))
      const dialog = screen.getByRole('dialog', { name: 'Login único em Immich' })
      await user.click(await within(dialog).findByRole('button', { name: 'Gerar novo segredo' }))
      expect(api.to('POST', '/admin/hub/services/immich/oidc/secret')).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Gerar' }))

      expect(await within(dialog).findByText('novo-segredo')).toBeInTheDocument()
    })
  })
})

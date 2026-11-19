import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { session } from '@/services/session'
import { CATALOG, ME, fakeApi, fakeToken, json } from '@/test/fakeApi'

function openAt(path: string) {
  localStorage.setItem('trem.session', '1')
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

const loggedIn = (me = ME) => ({
  'POST /auth/refresh': () => json({ access_token: fakeToken() }),
  'GET /me': () => json(me),
})

afterEach(() => session.forget())

describe('navigation', () => {
  it('lists the services in the menu as external links', async () => {
    fakeApi(loggedIn())
    openAt('/')

    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' })
    const radarr = await within(nav).findByRole('link', { name: /Radarr/ })
    expect(radarr).toHaveAttribute('href', CATALOG[0].url)
    expect(radarr).toHaveAttribute('target', '_blank')
    expect(radarr).toHaveAccessibleName('Radarr (abre em nova aba)')
  })

  it('offers a skip link to the content', async () => {
    fakeApi(loggedIn())
    openAt('/')
    await screen.findByRole('heading', { name: 'Olá, ana' })
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
  })

  it('opens the services page from the menu', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/')

    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' })
    await user.click(await within(nav).findByRole('link', { name: 'Ver todos' }))

    expect(await screen.findByRole('heading', { name: 'Serviços do servidor', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Immich' })).toBeInTheDocument()
    expect(document.title).toBe('Serviços do servidor · trem')
  })
})

describe('command palette', () => {
  it('opens with Ctrl K, filters without accents and goes to the page', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/')
    await screen.findByRole('heading', { name: 'Olá, ana' })

    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox', { name: 'Buscar produto, serviço ou página' })
    await user.type(input, 'servicos do')
    expect(screen.getByRole('option', { name: /Serviços do servidor/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Serviços do servidor', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('opens a service in a new tab', async () => {
    fakeApi(loggedIn())
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    openAt('/')
    await screen.findByRole('heading', { name: 'Olá, ana' })

    await user.click(screen.getByRole('button', { name: 'Buscar ou ir para' }))
    await user.type(await screen.findByRole('combobox'), 'imm')
    await user.keyboard('{Enter}')

    expect(open).toHaveBeenCalledWith(CATALOG[1].url, '_blank', 'noopener,noreferrer')
  })

  it('moves the selection with the arrows and says when nothing matches', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/')
    await screen.findByRole('heading', { name: 'Olá, ana' })

    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox')
    const [first, second] = screen.getAllByRole('option')
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', second.id)

    await user.type(input, 'zzz')
    expect(screen.getByRole('status')).toHaveTextContent('Nada encontrado para “zzz”.')
  })

  it('shows the admin pages only to admins', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/')
    await screen.findByRole('heading', { name: 'Olá, ana' })

    await user.keyboard('{Control>}k{/Control}')
    await user.type(await screen.findByRole('combobox'), 'catalogo')
    expect(screen.queryByRole('option', { name: /Catálogo de serviços/ })).not.toBeInTheDocument()
  })
})

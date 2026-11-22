import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { session } from '@/services/session'
import { ME, RENEW, fakeApi, json, renewed, storedSession } from '@/test/fakeApi'

const EDITOR = { ...ME, permissions: [...ME.permissions, 'trem:file_editor'] }

function openAt(path: string) {
  storedSession()
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

const loggedIn = (me = EDITOR) => ({
  [RENEW]: renewed,
  'GET /me': () => json(me),
})

const pdf = (name: string) => new File(['%PDF-1.7'], name, { type: 'application/pdf' })
const fileInput = () => document.querySelector<HTMLInputElement>('input[type=file]')!

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }))
})
afterEach(() => session.forget())

describe('access', () => {
  it('hides Documentos from accounts without trem:file_editor and explains the route', async () => {
    fakeApi(loggedIn(ME))
    openAt('/documentos/juntar')

    expect(await screen.findByRole('heading', { name: 'Documentos não está liberado para você' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).queryByRole('link', { name: 'Documentos' })).not.toBeInTheDocument()
  })

  it('shows the group with its tools to accounts holding it', async () => {
    fakeApi(loggedIn())
    openAt('/documentos')

    expect(await screen.findByRole('heading', { name: 'Documentos', level: 1 })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('list', { name: 'Ferramentas de Documentos' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: /Juntar PDFs/ })).toHaveAttribute('href', '/documentos/juntar')
  })
})

describe('merge', () => {
  it('sends the files in the chosen order and offers the result', async () => {
    const api = fakeApi({
      ...loggedIn(),
      'POST /pdf/merge': () => new Response('%PDF merged', { headers: { 'Content-Type': 'application/pdf' } }),
    })
    const user = userEvent.setup()
    openAt('/documentos/juntar')

    await screen.findByRole('heading', { name: 'Juntar PDFs', level: 1 })
    await user.upload(fileInput(), [pdf('a.pdf'), pdf('b.pdf')])
    await user.click(screen.getByRole('button', { name: 'Mover b.pdf para cima' }))
    expect(screen.getByText('b.pdf agora é o 1º de 2.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome do arquivo final'), 'contrato completo')
    await user.click(screen.getByRole('button', { name: 'Juntar 2 arquivos' }))

    expect(await screen.findByText('Pronto: contrato completo.pdf')).toBeInTheDocument()
    const sent = api.to('POST', '/pdf/merge')[0].form!.getAll('files') as File[]
    expect(sent.map((f) => f.name)).toEqual(['b.pdf', 'a.pdf'])
    const chain = screen.getByRole('region', { name: 'Continuar com este arquivo' })
    expect(within(chain).getByRole('link', { name: 'Colocar senha' })).toHaveAttribute('href', '/documentos/proteger')
  })

  it('needs two files', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/documentos/juntar')

    await screen.findByRole('heading', { name: 'Juntar PDFs', level: 1 })
    await user.upload(fileInput(), [pdf('a.pdf')])
    expect(screen.getByRole('button', { name: 'Juntar' })).toBeDisabled()
    expect(screen.getByText('Adicione pelo menos 2 arquivos.')).toBeInTheDocument()
  })

  it('refuses files above the limit before sending', async () => {
    const api = fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/documentos/juntar')

    await screen.findByRole('heading', { name: 'Juntar PDFs', level: 1 })
    const big = pdf('grande.pdf')
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 })
    await user.upload(fileInput(), [big])

    expect(screen.getByText(/grande\.pdf: acima de 50 MB/)).toBeInTheDocument()
    expect(api.to('POST', '/pdf/merge')).toHaveLength(0)
  })
})

describe('errors', () => {
  it('translates the API messages that come in English', async () => {
    fakeApi({ ...loggedIn(), 'POST /pdf/remove-password': () => json({ detail: 'Incorrect password' }, 400) })
    const user = userEvent.setup()
    openAt('/documentos/tirar-senha')

    await screen.findByRole('heading', { name: 'Tirar senha', level: 1 })
    await user.upload(fileInput(), [pdf('banco.pdf')])
    await user.type(screen.getByLabelText('Senha atual do PDF'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Tirar a senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta.')
  })

  it('checks the page list before sending', async () => {
    const api = fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/documentos/escolher-paginas')

    await screen.findByRole('heading', { name: 'Escolher páginas', level: 1 })
    await user.upload(fileInput(), [pdf('a.pdf')])
    const pages = screen.getByLabelText('Páginas')
    await user.type(pages, '3-1')
    await user.tab()

    expect(screen.getByText('“3-1” não é uma página nem um intervalo como 2-5.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar páginas' })).toBeDisabled()
    expect(api.to('POST', '/pdf/split')).toHaveLength(0)
  })
})

describe('home', () => {
  it('suggests tools for a dropped PDF and carries the file to the one chosen', async () => {
    fakeApi(loggedIn())
    const user = userEvent.setup()
    openAt('/')

    await screen.findByRole('heading', { name: 'Olá, ana' })
    await user.upload(fileInput(), [pdf('contrato.pdf')])
    const suggestions = screen.getByRole('region', { name: 'Sugestões para o arquivo' })
    await user.click(within(suggestions).getByRole('link', { name: /Proteger com senha/ }))

    expect(await screen.findByRole('heading', { name: 'Colocar senha', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('contrato.pdf')).toBeInTheDocument())
  })

  it('remembers the tools used last', async () => {
    fakeApi(loggedIn())
    const first = openAt('/documentos/extrair-texto')
    await screen.findByRole('heading', { name: 'Extrair texto', level: 1 })
    first.unmount()

    openAt('/')
    const recent = await screen.findByRole('region', { name: 'Usadas por último' })
    expect(within(recent).getByRole('link', { name: /Extrair texto/ })).toHaveAttribute('href', '/documentos/extrair-texto')
  })
})

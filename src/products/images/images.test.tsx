import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { session } from '@/services/session'
import { binary, fileInput, loggedIn, openAt } from '@/test/app'
import { fakeApi, json } from '@/test/fakeApi'

const photo = (name = 'praia.jpg') => new File(['jpeg-bytes'], name, { type: 'image/jpeg' })

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }))
})
afterEach(() => session.forget())

describe('compress', () => {
  it('asks for JSON, shows the reduction and keeps the options to try again', async () => {
    const api = fakeApi({
      ...loggedIn('trem:file_editor'),
      'POST /image/compress': () =>
        json({
          metrics: {
            original_size_bytes: 2_400_000,
            compressed_size_bytes: 400,
            reduction_percent: 83.3,
            original_dimensions: { width: 4032, height: 3024 },
            final_dimensions: { width: 1920, height: 1440 },
          },
          file: { filename: 'praia_compressed.jpg', media_type: 'image/jpeg', size_bytes: 4, base64: btoa('abcd') },
        }),
    })
    const user = userEvent.setup()
    openAt('/imagens/comprimir')

    await screen.findByRole('heading', { name: 'Comprimir imagem', level: 1 })
    await user.upload(fileInput(), [photo()])
    await user.click(screen.getByRole('combobox', { name: 'Largura máxima' }))
    await user.click(await screen.findByRole('option', { name: '1920 px: Full HD' }))
    await user.click(screen.getByRole('button', { name: 'Comprimir' }))

    expect(await screen.findByText('Pronto: praia_compressed.jpg')).toBeInTheDocument()
    expect(screen.getByText(/83% menor/)).toBeInTheDocument()
    const sent = api.to('POST', '/image/compress')[0].form!
    expect(sent.get('response_type')).toBe('json')
    expect(sent.get('max_dimension')).toBe('1920')
    expect(sent.get('quality')).toBe('70')
    expect(screen.getByRole('slider', { name: 'Comparar' })).toHaveAttribute('aria-valuetext', '50% original, 50% resultado')
    expect(screen.getByRole('button', { name: 'Comprimir' })).toBeEnabled()
  })
})

describe('convert', () => {
  it('sends the chosen format and names the file after it', async () => {
    const api = fakeApi({ ...loggedIn('trem:file_editor'), 'POST /image/convert': () => binary('png', 'image/png') })
    const user = userEvent.setup()
    openAt('/imagens/converter')

    await screen.findByRole('heading', { name: 'Converter imagem', level: 1 })
    await user.upload(fileInput(), [photo('IMG_0001.heic')])
    await user.click(screen.getByRole('combobox', { name: 'Converter para' }))
    await user.click(await screen.findByRole('option', { name: /PNG/ }))
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Converter' }))

    expect(await screen.findByText('Pronto: IMG_0001.png')).toBeInTheDocument()
    expect(api.to('POST', '/image/convert')[0].form!.get('format')).toBe('png')
  })
})

describe('images to PDF', () => {
  it('sends every image with the layout', async () => {
    const api = fakeApi({ ...loggedIn('trem:file_editor'), 'POST /image/to-pdf': () => binary('%PDF', 'application/pdf') })
    const user = userEvent.setup()
    openAt('/imagens/para-pdf')

    await screen.findByRole('heading', { name: 'Imagens para PDF', level: 1 })
    await user.upload(fileInput(), [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')])
    await user.click(screen.getByRole('radio', { name: 'Várias imagens por página' }))
    await user.click(screen.getByRole('button', { name: 'Criar PDF com 3 imagens' }))

    expect(await screen.findByText('Pronto: a.pdf')).toBeInTheDocument()
    const sent = api.to('POST', '/image/to-pdf')[0].form!
    expect((sent.getAll('files') as File[]).map((f) => f.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(sent.get('layout')).toBe('grouped')
    expect(sent.get('images_per_page')).toBe('4')
    const chain = screen.getByRole('region', { name: 'Continuar com este arquivo' })
    expect(within(chain).getByRole('link', { name: 'Juntar PDFs' })).toBeInTheDocument()
  })
})

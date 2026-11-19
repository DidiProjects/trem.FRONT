import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { session } from '@/services/session'
import { taskStore } from '@/products/tasks/store'
import { binary, fileInput, loggedIn, openAt } from '@/test/app'
import { ME, fakeApi, json } from '@/test/fakeApi'
import { parseClock, toSrt } from './transcript'

const video = (name = 'reuniao.mp4') => new File(['0123456789'], name, { type: 'video/mp4' })

const RESULT = {
  text: 'Bom dia. Primeiro ponto.',
  segments: [
    { start: 0, end: 2.5, text: 'Bom dia.' },
    { start: 2.5, end: 65.25, text: 'Primeiro ponto.' },
  ],
  language: 'pt',
  duration: 65.25,
}

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }))
})
afterEach(() => {
  session.forget()
  taskStore.close()
})

describe('transcript helpers', () => {
  it('reads times and writes subtitles', () => {
    expect(parseClock('1:05')).toBe(65)
    expect(parseClock('1:01:05')).toBe(3665)
    expect(parseClock('abc')).toBeNull()
    expect(toSrt(RESULT.segments)).toBe('1\n00:00:00,000 --> 00:00:02,500\nBom dia.\n\n2\n00:00:02,500 --> 00:01:05,250\nPrimeiro ponto.\n')
  })
})

describe('cut', () => {
  it('sends the marked times in seconds and names the video MP4', async () => {
    const api = fakeApi({ ...loggedIn('trem:file_editor'), 'POST /movie/cut': () => binary('mp4', 'video/mp4') })
    const user = userEvent.setup()
    openAt('/midia/cortar')

    await screen.findByRole('heading', { name: 'Cortar áudio ou vídeo', level: 1 })
    await user.upload(fileInput(), [video('aula.mkv')])
    const start = screen.getByLabelText('Início')
    await user.clear(start)
    await user.type(start, '1:05')
    expect(screen.getByRole('button', { name: 'Cortar trecho' })).toBeDisabled()
    await user.type(screen.getByLabelText('Fim'), '2:00')
    await user.click(screen.getByRole('button', { name: 'Cortar trecho' }))

    expect(await screen.findByText('Pronto: aula-trecho.mp4')).toBeInTheDocument()
    const sent = api.to('POST', '/movie/cut')[0].form!
    expect([sent.get('start'), sent.get('end')]).toEqual(['65', '120'])
  })
})

describe('transcribe', () => {
  it('uploads in parts, follows the job and shows the transcript', async () => {
    const api = fakeApi({
      ...loggedIn('trem:file_editor'),
      'POST /movie/transcribe/uploads': () => json({ upload_id: 'up1', part_size: 6, total_parts: 2 }, 201),
      'PUT /movie/transcribe/uploads/up1/parts/0': () => new Response(null, { status: 204 }),
      'PUT /movie/transcribe/uploads/up1/parts/1': () => new Response(null, { status: 204 }),
      'POST /movie/transcribe/uploads/up1/complete': () => json({ job_id: 'job1', status: 'queued' }, 202),
      'GET /movie/transcribe/jobs/job1': () => json({ job_id: 'job1', status: 'done', result: RESULT }),
    })
    const user = userEvent.setup()
    openAt('/midia/transcrever')

    await screen.findByRole('heading', { name: 'Transcrever', level: 1 })
    await user.upload(fileInput(), [video()])
    await user.click(screen.getByRole('combobox', { name: 'Idioma da fala' }))
    await user.click(await screen.findByRole('option', { name: 'Português' }))
    await user.click(screen.getByRole('button', { name: 'Transcrever' }))

    const transcript = await screen.findByRole('region', { name: 'Transcrição' })
    expect(within(transcript).getByText('Primeiro ponto.')).toBeInTheDocument()
    expect(api.to('POST', '/movie/transcribe/uploads')[0].body).toEqual({ filename: 'reuniao.mp4', size: 10, language: 'pt' })
    expect(api.to('PUT', '/movie/transcribe/uploads/up1/parts/1')).toHaveLength(1)
    expect(window.location.search).toMatch(/^\?tarefa=/)

    await user.type(screen.getByLabelText('Buscar no texto'), 'primeiro')
    expect(screen.getByText('1 trecho encontrado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Levar para a IA' })).not.toBeInTheDocument()
  })

  it('says when the server lost the job', async () => {
    localStorage.setItem(
      `trem.tasks.${ME.id}`,
      JSON.stringify([{ id: 't1', kind: 'transcription', fileName: 'podcast.mp3', startedAt: 1, status: 'running', jobRef: '/audio:gone' }]),
    )
    fakeApi({ ...loggedIn('trem:file_editor'), 'GET /audio/transcribe/jobs/gone': () => json({ detail: 'Job not found' }, 404) })
    openAt('/tarefas')

    expect(await screen.findByText('O servidor reiniciou ou o resultado expirou. Envie de novo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover podcast.mp3 da lista' })).toBeInTheDocument()
  })
})

describe('tasks', () => {
  it('lists the finished transcriptions with a link to the result', async () => {
    localStorage.setItem(
      `trem.tasks.${ME.id}`,
      JSON.stringify([{ id: 't9', kind: 'transcription', fileName: 'aula.mp4', startedAt: 1, status: 'done', result: RESULT, finishedAt: 2 }]),
    )
    fakeApi(loggedIn('trem:file_editor'))
    openAt('/tarefas')

    expect(await screen.findByRole('heading', { name: 'Tarefas', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir resultado' })).toHaveAttribute('href', '/midia/transcrever?tarefa=t9')
  })

  it('is not offered without trem:file_editor', async () => {
    fakeApi(loggedIn())
    openAt('/')
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' })
    expect(within(nav).queryByRole('link', { name: /Tarefas/ })).not.toBeInTheDocument()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { session } from '@/services/session'
import { context } from '@/services/llmApi'
import { taskStore } from '@/products/tasks/store'
import { loggedIn, openAt } from '@/test/app'
import { ME, fakeApi, json } from '@/test/fakeApi'
import { chatStore } from './chatStore'

afterEach(() => {
  session.forget()
  chatStore.close()
  taskStore.close()
})

describe('context', () => {
  it('drops the oldest messages to fit and starts at a question', () => {
    const long = 'x'.repeat(25_000)
    const messages = [
      { role: 'user' as const, content: long },
      { role: 'assistant' as const, content: long },
      { role: 'user' as const, content: long },
      { role: 'assistant' as const, content: 'ok' },
      { role: 'user' as const, content: 'e agora?' },
    ]
    const result = context(messages)
    expect(result.fits).toBe(true)
    expect(result.trimmed).toBe(true)
    expect(result.messages[0]).toEqual({ role: 'user', content: long })
    expect(result.messages).toHaveLength(3)
  })
})

describe('chat', () => {
  it('sends the question as a job and shows the answer', async () => {
    const api = fakeApi({
      ...loggedIn('trem:ai'),
      'GET /llm/health': () => json({ status: 'healthy' }),
      'POST /llm/jobs': () => json({ job_id: 'j1', status: 'queued' }, 202),
      'GET /llm/jobs/j1': () => json({ job_id: 'j1', status: 'done', result: { choices: [{ message: { content: 'Olá! Tudo certo.' } }] } }),
    })
    const user = userEvent.setup()
    openAt('/ia/conversa')

    expect(await screen.findByText('Modelo pronto')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Mensagem'), 'Oi, tudo bem?{Enter}')

    const messages = await screen.findByRole('list', { name: 'Mensagens' })
    expect(await within(messages).findByText('Olá! Tudo certo.', {}, { timeout: 6000 })).toBeInTheDocument()
    expect(api.to('POST', '/llm/jobs')[0].body).toEqual({ messages: [{ role: 'user', content: 'Oi, tudo bem?' }] })
    expect(window.location.pathname).toMatch(/^\/ia\/conversa\/.+/)
    expect(screen.getByRole('link', { name: /Oi, tudo bem\?/ })).toHaveAttribute('aria-current', 'page')
  })

  it('wakes a sleeping model while the question is typed', async () => {
    const api = fakeApi({
      ...loggedIn('trem:ai'),
      'GET /llm/health': () => json({ status: 'sleeping' }),
      'POST /llm/v1/chat/completions': () => json({ status: 'warming_up' }, 503),
    })
    const user = userEvent.setup()
    openAt('/ia/conversa')

    expect(await screen.findByText('Modelo dormindo: acorda quando você escrever')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Mensagem'), 'O')

    expect(await screen.findByText('Acordando o modelo, leva alguns minutos')).toBeInTheDocument()
    expect(api.to('POST', '/llm/v1/chat/completions')).toHaveLength(1)
  })

  it('takes a transcript as an attachment', async () => {
    localStorage.setItem(
      `trem.tasks.${ME.id}`,
      JSON.stringify([
        {
          id: 't1',
          kind: 'transcription',
          fileName: 'reuniao.mp4',
          startedAt: 1,
          status: 'done',
          result: { text: 'Oi', segments: [{ start: 0, end: 1, text: 'Oi' }], language: 'pt', duration: 1 },
        },
      ]),
    )
    fakeApi({ ...loggedIn('trem:ai', 'trem:file_editor'), 'GET /llm/health': () => json({ status: 'healthy' }) })
    const user = userEvent.setup()
    openAt('/midia/transcrever?tarefa=t1')

    await user.click(await screen.findByRole('link', { name: 'Levar para a IA' }))

    expect(await screen.findByText(/Anexo: reuniao\.txt/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover anexo reuniao.txt' })).toBeInTheDocument()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { env } from '@/config/env'
import { session } from '@/services/session'
import { loggedIn, openAt } from '@/test/app'
import { fakeApi, json } from '@/test/fakeApi'
import type { JobConfig } from '@/services/linkedinApi'

const JOB = {
  id: 'a'.repeat(32),
  status: 'scheduled',
  state: 'active',
  has_cv: true,
  next_run_at: '2026-11-20T07:00:00Z',
  config: {
    name: 'Frontend UK',
    jobs: { keywords: ['react'], locations: ['United Kingdom'], max_pages: 2 },
    posts: { keywords: [], max_scrolls: 10 },
    analysis: { criteria: 'React', min_score: 70, max_items: 30, effort: 'low' },
    schedule: { timezone: 'Europe/London', days: ['mon', 'fri'], times: ['07:00'] },
    notify_to: 'ana@example.com',
    expires_on: null,
  },
}

const base = {
  ...loggedIn('trem:linkedin_scraper'),
  'GET /scrapers/linkedin/session': () => json({ state: 'valid' }),
  'GET /scrapers/linkedin/jobs': () => json([JOB]),
}

afterEach(() => session.forget())

describe('LinkedIn', () => {
  it('lists the searches and shows the matches with LinkedIn links only', async () => {
    fakeApi({
      ...base,
      [`GET /scrapers/linkedin/jobs/${JOB.id}/matches?min_score=70&limit=200`]: () =>
        json([
          { title: 'Frontend Engineer', url: 'https://www.linkedin.com/jobs/view/1', company: 'ACME', score: 72, relevant: true, reason: 'React' },
          { title: 'Senior React', url: 'https://evil.example/phish', score: 91, relevant: true },
        ]),
    })
    const user = userEvent.setup()
    openAt('/automacoes/linkedin')

    const list = await screen.findByRole('list', { name: 'Buscas' })
    expect(within(list).getByText('seg, sex às 07:00')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn conectado.')).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Ver vagas' }))
    const panel = await screen.findByRole('region', { name: 'Vagas de Frontend UK' })
    const items = await within(panel).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Senior React')
    expect(within(items[0]).queryByRole('link')).not.toBeInTheDocument()
    expect(within(items[1]).getByRole('link', { name: /Frontend Engineer/ })).toHaveAttribute('href', 'https://www.linkedin.com/jobs/view/1')
    expect(within(items[1]).getByRole('img', { name: 'Nota 72 de 100' })).toBeInTheDocument()
  })

  it('creates a search with the config trem.API expects', async () => {
    const api = fakeApi({ ...base, 'POST /scrapers/linkedin/jobs': (call) => json({ ...JOB, id: 'b'.repeat(32), config: call.body }, 201) })
    const user = userEvent.setup()
    openAt('/automacoes/linkedin')

    await user.click(await screen.findByRole('button', { name: 'Nova busca' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nova busca' })
    expect(within(dialog).getByRole('button', { name: 'Criar busca' })).toBeDisabled()
    // Pasted, not typed: the whole form re-renders per key, about 0.2 s each in jsdom.
    await user.click(within(dialog).getByLabelText(/Nome da busca/))
    await user.paste('Remoto EU')
    await user.click(within(dialog).getByLabelText('Termos de vagas'))
    await user.paste('react')
    await user.keyboard('{Enter}')
    await user.paste('typescript')
    const posts = 'Termos de posts'
    await user.click(within(dialog).getByLabelText(`${posts}: linha 1, termo 1`))
    await user.paste('react')
    await user.click(within(dialog).getByRole('button', { name: `${posts}: adicionar termo (AND) à linha 1` }))
    await user.click(within(dialog).getByLabelText(`${posts}: linha 1, termo 2`))
    await user.paste('hiring')
    await user.click(within(dialog).getByRole('button', { name: `${posts}: adicionar linha (OR)` }))
    await user.click(within(dialog).getByLabelText(`${posts}: linha 2, termo 1`))
    await user.paste('front end')
    expect(within(dialog).getByText('(react AND hiring) OR "front end"')).toBeInTheDocument()
    expect(within(dialog).getByText('3/6 termos')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sáb' }))
    await user.click(within(dialog).getByRole('button', { name: 'Criar busca' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const body = api.to('POST', '/scrapers/linkedin/jobs')[0].body as unknown as JobConfig
    expect(body.name).toBe('Remoto EU')
    expect(body.jobs.keywords).toEqual(['react', 'typescript'])
    expect(body.posts.keywords).toEqual(['(react AND hiring) OR "front end"'])
    expect(body.schedule.days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
    expect(body.notify_to).toBe('ana@example.com')
    expect(body.analysis).toEqual({ criteria: '', min_score: 70, max_items: 30, effort: 'low' })
  })

  it('asks before deleting', async () => {
    const api = fakeApi({ ...base, [`DELETE /scrapers/linkedin/jobs/${JOB.id}`]: () => new Response(null, { status: 204 }) })
    const user = userEvent.setup()
    openAt('/automacoes/linkedin')

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Excluir “Frontend UK”?' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(api.to('DELETE', `/scrapers/linkedin/jobs/${JOB.id}`)).toHaveLength(1))
  })

  it('offers to connect when there is no LinkedIn session', async () => {
    fakeApi({ ...base, 'GET /scrapers/linkedin/session': () => json({ state: 'none' }) })
    openAt('/automacoes/linkedin')
    expect(await screen.findByRole('button', { name: 'Conectar LinkedIn' })).toBeInTheDocument()
  })

  it('opens the LinkedIn login on trem.API, not on the front', async () => {
    const login = 'a'.repeat(32)
    fakeApi({
      ...base,
      'GET /scrapers/linkedin/session': () => json({ state: 'none' }),
      'POST /scrapers/linkedin/session/login': () =>
        json({ id: login, status: 'starting', url: `/scrapers/linkedin/login/${login}/start?token=t` }, 201),
      [`GET /scrapers/linkedin/session/login/${login}`]: () => json({ status: 'waiting' }),
    })
    const tab = { location: { href: 'about:blank' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const user = userEvent.setup()
    openAt('/automacoes/linkedin')

    await user.click(await screen.findByRole('button', { name: 'Conectar LinkedIn' }))

    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    await waitFor(() => expect(tab.location.href).toBe(`${env.apiUrl}/scrapers/linkedin/login/${login}/start?token=t`))
    open.mockRestore()
  })
})

describe('LinkedIn post terms', () => {
  it('stops adding terms at the 6 LinkedIn reads', async () => {
    fakeApi(base)
    const user = userEvent.setup()
    openAt('/automacoes/linkedin')

    await user.click(await screen.findByRole('button', { name: 'Nova busca' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nova busca' })
    const addAnd = within(dialog).getByRole('button', { name: 'Termos de posts: adicionar termo (AND) à linha 1' })
    for (let i = 0; i < 5; i++) await user.click(addAnd)

    expect(addAnd).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Termos de posts: adicionar linha (OR)' })).toBeDisabled()
  })
})

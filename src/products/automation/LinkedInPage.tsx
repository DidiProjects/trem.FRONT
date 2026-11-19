import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useSnackbar } from 'notistack'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { groupVars } from '@/products/groupVars'
import { groupById } from '@/products/registry'
import { ToolLayout } from '@/products/ToolLayout'
import { useTool } from '@/products/toolContext'
import { linkedinApi, type JobStatus, type ScraperJob, type SessionState } from '@/services/linkedinApi'
import { JobFormDialog } from './JobFormDialog'
import { MatchesPanel } from './MatchesPanel'

const REFRESH_MS = 30_000
const LOGIN_POLL_MS = 3000

const STATUS: Record<JobStatus, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  scheduled: { label: 'Agendada', color: 'success' },
  needs_cv: { label: 'Falta o currículo', color: 'warning' },
  needs_login: { label: 'Esperando o login no LinkedIn', color: 'warning' },
  paused: { label: 'Pausada', color: 'default' },
  halted: { label: 'Parada', color: 'error' },
  expired: { label: 'Encerrada', color: 'default' },
}

const SESSION: Record<SessionState, { text: string; severity: 'success' | 'warning' | 'error' }> = {
  valid: { text: 'LinkedIn conectado.', severity: 'success' },
  expired: { text: 'A sessão do LinkedIn expirou. Conecte de novo para as buscas voltarem a rodar.', severity: 'error' },
  none: { text: 'LinkedIn não conectado. As buscas só rodam depois que você entrar na sua conta.', severity: 'warning' },
}

const DAY: Record<string, string> = { mon: 'seg', tue: 'ter', wed: 'qua', thu: 'qui', fri: 'sex', sat: 'sáb', sun: 'dom' }
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

const load = () => Promise.all([linkedinApi.session(), linkedinApi.jobs()])

type Dialogs = { kind: 'none' } | { kind: 'form'; job: ScraperJob | null } | { kind: 'delete'; job: ScraperJob } | { kind: 'disconnect' }

export default function LinkedInPage() {
  const { group, tool } = useTool()
  const { user } = useAuth()
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload } = useLoad(load)
  const [dialog, setDialog] = useState<Dialogs>({ kind: 'none' })
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState<{ id: string; blockedUrl?: string } | null>(null)
  const cvTarget = useRef<ScraperJob | null>(null)
  const cvInput = useRef<HTMLInputElement>(null)

  // Status moves on its own (runs, analysis, an expired session).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!busy && dialog.kind === 'none') reload()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [busy, dialog.kind, reload])

  useEffect(() => {
    if (!login) return
    let active = true
    const timer = setInterval(() => {
      linkedinApi.loginState(login.id).then(
        ({ status }) => {
          if (!active || status === 'starting' || status === 'waiting') return
          const messages = {
            connected: ['LinkedIn conectado. As buscas começam sozinhas.', 'success'],
            expired: ['O login no LinkedIn passou de 10 minutos. Tente de novo.', 'error'],
            cancelled: ['Login no LinkedIn cancelado.', 'info'],
            failed: ['O login no LinkedIn falhou. Tente de novo.', 'error'],
          } as const
          const [message, variant] = messages[status]
          enqueueSnackbar(message, { variant })
          setLogin(null)
          reload()
        },
        () => undefined, // a blip in the connection is not the end of the login
      )
    }, LOGIN_POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [login, enqueueSnackbar, reload])

  const act = async (request: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await request()
      enqueueSnackbar(message)
      reload()
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    // Opened in the click itself: a tab opened after an await is taken for a popup and blocked.
    const tab = window.open('about:blank', '_blank')
    try {
      const started = await linkedinApi.startLogin()
      if (tab) tab.location.href = started.url
      setLogin({ id: started.id, blockedUrl: tab ? undefined : started.url })
    } catch (e) {
      tab?.close()
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    }
  }

  const [session, jobs] = result.state === 'ready' ? result.data : [null, []]
  const current = jobs.find((j) => j.id === selected) ?? null

  return (
    <ToolLayout
      group={group}
      tool={tool}
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ kind: 'form', job: null })} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
          Nova busca
        </Button>
      }
    >
      {result.state === 'loading' && <CircularProgress aria-label="Carregando buscas" />}
      {result.state === 'error' && (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>Tentar de novo</Button>}>
          {result.error.message}
        </Alert>
      )}

      {session && (
        <Stack spacing={3}>
          <Alert
            severity={login ? 'info' : SESSION[session.state].severity}
            action={
              login ? (
                <Button color="inherit" onClick={() => void linkedinApi.cancelLogin(login.id).catch(() => undefined)}>
                  Cancelar
                </Button>
              ) : session.state === 'valid' ? (
                <Button color="inherit" onClick={() => setDialog({ kind: 'disconnect' })}>
                  Desconectar
                </Button>
              ) : (
                <Button color="inherit" onClick={connect}>
                  Conectar LinkedIn
                </Button>
              )
            }
          >
            {login ? (
              login.blockedUrl ? (
                <>
                  O navegador bloqueou a nova aba.{' '}
                  <a href={login.blockedUrl} target="_blank" rel="noopener noreferrer">
                    Abrir o login do LinkedIn
                  </a>
                  .
                </>
              ) : (
                'Esperando você entrar no LinkedIn na outra aba…'
              )
            ) : (
              SESSION[session.state].text
            )}
          </Alert>

          {jobs.length === 0 ? (
            <Typography color="text.secondary">Nenhuma busca ainda. Crie uma, envie o currículo e ela roda nos horários marcados.</Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Box component="ul" aria-label="Buscas" sx={{ listStyle: 'none', m: 0, p: 0, flex: '1 1 320px', display: 'grid', gap: 1.5 }}>
                {jobs.map((job) => {
                  const c = job.config
                  const active = job.state === 'active' && job.status !== 'expired'
                  return (
                    <Box
                      component="li"
                      key={job.id}
                      sx={{ bgcolor: 'background.paper', borderRadius: '18px', p: 2, display: 'grid', gap: 1, outline: job.id === selected ? '2px solid var(--group)' : 'none' }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 17, flexGrow: 1 }}>
                          {c.name}
                        </Typography>
                        <Chip size="small" label={STATUS[job.status]?.label ?? job.status} color={STATUS[job.status]?.color ?? 'default'} />
                      </Box>
                      {job.halt_reason && <Alert severity="error">{job.halt_reason}</Alert>}
                      <Typography variant="body2" color="text.secondary">
                        {c.schedule.days.map((d) => DAY[d] ?? d).join(', ')} às {c.schedule.times.join(', ')}
                        {c.expires_on ? ` · até ${new Date(`${c.expires_on}T00:00`).toLocaleDateString('pt-BR')}` : ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {active ? `Próxima rodada ${when(job.next_run_at)}${job.run_requested ? ' · rodada pedida' : ''}` : 'Sem rodada agendada'}
                        {job.last_run ? ` · última ${when(job.last_run.started_at)}, ${job.last_run.collected} novas` : ''}
                        {job.pending_items ? ` · ${job.pending_items} esperando a IA` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" variant="contained" onClick={() => setSelected(job.id)} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
                          Ver vagas
                        </Button>
                        <Button size="small" variant="outlined" disabled={!active || job.run_requested || busy} onClick={() => act(() => linkedinApi.run(job.id), 'Rodada pedida')}>
                          Rodar agora
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busy}
                          onClick={() =>
                            job.state === 'active'
                              ? act(() => linkedinApi.pause(job.id), 'Busca pausada')
                              : act(() => linkedinApi.resume(job.id), 'Busca retomada')
                          }
                        >
                          {job.state === 'active' ? 'Pausar' : 'Retomar'}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            cvTarget.current = job
                            cvInput.current?.click()
                          }}
                        >
                          {job.has_cv ? 'Trocar currículo' : 'Enviar currículo'}
                        </Button>
                        <Button size="small" onClick={() => setDialog({ kind: 'form', job })}>
                          Editar
                        </Button>
                        <Button size="small" color="error" onClick={() => setDialog({ kind: 'delete', job })}>
                          Excluir
                        </Button>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
              <Box sx={{ flex: '999 1 420px', minWidth: 0 }}>
                {current ? (
                  <MatchesPanel job={current} />
                ) : (
                  <Typography color="text.secondary" sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: 3 }}>
                    Escolha “Ver vagas” numa busca para ver o que combinou com o seu currículo.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Stack>
      )}

      <input
        ref={cvInput}
        type="file"
        hidden
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="Currículo em .docx"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const job = cvTarget.current
          e.target.value = ''
          if (file && job) void act(() => linkedinApi.uploadCv(job.id, file), 'Currículo enviado')
        }}
      />

      {dialog.kind === 'form' && (
        <JobFormDialog
          job={dialog.job}
          email={user?.email ?? null}
          onClose={() => setDialog({ kind: 'none' })}
          onSaved={(message) => {
            setDialog({ kind: 'none' })
            enqueueSnackbar(message)
            reload()
          }}
        />
      )}

      <Dialog
        open={dialog.kind === 'delete' || dialog.kind === 'disconnect'}
        onClose={() => setDialog({ kind: 'none' })}
        slotProps={{ paper: { sx: groupVars(groupById('automation')) } }}
      >
        <DialogTitle>{dialog.kind === 'delete' ? `Excluir “${dialog.job.config.name}”?` : 'Desconectar o LinkedIn?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialog.kind === 'delete'
              ? 'A busca sai junto com o currículo e as vagas encontradas. Não dá para desfazer.'
              : 'As buscas ficam esperando até você conectar de novo.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ kind: 'none' })}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const current = dialog
              setDialog({ kind: 'none' })
              if (current.kind === 'delete') {
                if (selected === current.job.id) setSelected(null)
                void act(() => linkedinApi.remove(current.job.id), 'Busca excluída')
              } else void act(() => linkedinApi.disconnect(), 'LinkedIn desconectado')
            }}
          >
            {dialog.kind === 'delete' ? 'Excluir' : 'Desconectar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ToolLayout>
  )
}

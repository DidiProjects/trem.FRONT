import { useState, type FormEvent } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useSnackbar } from 'notistack'
import { PageHeader } from '@/components/PageHeader'
import { useLoad } from '@/hooks/useLoad'
import { SecretBox } from '@/pages/account/SecretBox'
import { adminApi, type Application, type ServiceClient } from '@/services/adminApi'
import { hubApi } from '@/services/hubApi'
import { permissionLabel } from '@/utils/permissions'
import { PermissionPicker } from './PermissionPicker'

const SLUG = /^[a-z0-9][a-z0-9-]{1,49}$/
const PERMISSION = /^[a-z0-9][a-z0-9_.-]{0,49}$/
const card = { bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 2.5 }, display: 'grid', gap: 1.5 } as const

type Confirm = { title: string; text: string; label: string; run: () => Promise<unknown>; done: string } | null

function ConfirmDialog({ confirm, onClose, onDone }: { confirm: Confirm; onClose: () => void; onDone: (message: string) => void }) {
  const { enqueueSnackbar } = useSnackbar()
  return (
    <Dialog open={Boolean(confirm)} onClose={onClose}>
      <DialogTitle>{confirm?.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{confirm?.text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="error"
          variant="contained"
          onClick={async () => {
            if (!confirm) return
            onClose()
            try {
              await confirm.run()
              onDone(confirm.done)
            } catch (e) {
              enqueueSnackbar((e as Error).message, { variant: 'error' })
            }
          }}
        >
          {confirm?.label}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function AddPermission({ app, onAdded }: { app: Application; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const invalid = name && !PERMISSION.test(name)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await adminApi.addPermission(app.slug, name, null)
      setName('')
      setError(null)
      onAdded()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        size="small"
        label={`Nova permissão em ${app.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={Boolean(invalid || error)}
        helperText={invalid ? 'Minúsculas, números, ponto, hífen ou _.' : error ?? undefined}
        sx={{ flex: '1 1 200px' }}
      />
      <Button type="submit" variant="outlined" disabled={!name || Boolean(invalid)}>
        Adicionar
      </Button>
    </Box>
  )
}

function Applications() {
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload } = useLoad(adminApi.applications)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ slug: '', name: '' })
  const [error, setError] = useState<string | null>(null)
  const slugInvalid = form.slug && !SLUG.test(form.slug)

  const create = async () => {
    try {
      await adminApi.createApplication(form.slug, form.name, null)
      setCreating(false)
      setForm({ slug: '', name: '' })
      enqueueSnackbar('Aplicação criada')
      reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
        <Typography color="text.secondary" sx={{ flex: '1 1 320px' }}>
          Cada aplicação que usa o login do trem tem as próprias permissões. Os serviços do catálogo vivem em “hub”, gerenciados no Catálogo de serviços.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
          Nova aplicação
        </Button>
      </Box>
      {result.state === 'loading' && <CircularProgress aria-label="Carregando aplicações" />}
      {result.state === 'error' && <Alert severity="error">{result.error.message}</Alert>}
      {result.state === 'ready' && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
          {result.data.map((app) => (
            <Box component="article" key={app.slug} aria-labelledby={`app-${app.slug}`} sx={card}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography id={`app-${app.slug}`} variant="h2" sx={{ flexGrow: 1 }}>
                  {app.name}
                </Typography>
                <Typography component="code" variant="body2" color="text.secondary">
                  {app.slug}
                </Typography>
              </Box>
              {app.description && <Typography variant="body2" color="text.secondary">{app.description}</Typography>}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {app.permissions.map((p) => (
                  <Chip
                    key={p.key}
                    label={app.slug === 'trem' ? permissionLabel(p.key) : p.name}
                    onDelete={
                      app.slug === 'hub'
                        ? undefined
                        : () =>
                            setConfirm({
                              title: `Remover a permissão ${p.key}?`,
                              text: 'Quem tem essa permissão perde o acesso que ela dá.',
                              label: 'Remover',
                              run: () => adminApi.removePermission(app.slug, p.name),
                              done: 'Permissão removida',
                            })
                    }
                  />
                ))}
                {app.permissions.length === 0 && <Typography color="text.secondary">Sem permissões.</Typography>}
              </Box>
              {app.slug !== 'hub' && <AddPermission app={app} onAdded={reload} />}
              {app.slug !== 'trem' && app.slug !== 'hub' && (
                <Box>
                  <Button
                    color="error"
                    onClick={() =>
                      setConfirm({
                        title: `Excluir a aplicação ${app.name}?`,
                        text: 'Saem junto as permissões, o acesso de cada conta a elas e as sessões abertas nessa aplicação. Não dá para desfazer.',
                        label: 'Excluir',
                        run: () => adminApi.removeApplication(app.slug),
                        done: 'Aplicação excluída',
                      })
                    }
                  >
                    Excluir aplicação
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      <ConfirmDialog
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onDone={(message) => {
          enqueueSnackbar(message)
          reload()
        }}
      />
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="xs" aria-labelledby="new-app-title">
        <DialogTitle id="new-app-title">Nova aplicação</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <TextField
            label="Identificador"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            error={Boolean(slugInvalid)}
            helperText={slugInvalid ? 'Minúsculas, números e hífen; 2 a 50 caracteres.' : 'Vira o “aud” dos tokens, ex.: flight-api'}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.name || !form.slug || Boolean(slugInvalid)} onClick={create}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const loadClients = () => Promise.all([adminApi.clients(), adminApi.applications(), hubApi.list()])

function Clients() {
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload } = useLoad(loadClients)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [created, setCreated] = useState<(ServiceClient & { api_key: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clients = result.state === 'ready' ? result.data[0].items.filter((c) => !c.revoked && !c.user_id) : []

  const create = async () => {
    try {
      const client = await adminApi.createClient(name, permissions, null)
      setCreating(false)
      setName('')
      setPermissions([])
      setCreated(client)
      reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
        <Typography color="text.secondary" sx={{ flex: '1 1 320px' }}>
          Chaves de integrações entre sistemas, que não pertencem a uma pessoa. As chaves pessoais ficam em Minha conta.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
          Nova chave de serviço
        </Button>
      </Box>
      {created && (
        <Box sx={{ mb: 2 }}>
          <SecretBox title={`Chave “${created.name}” criada`} values={[created.api_key]} confirmLabel="Concluir" onDone={() => setCreated(null)}>
            Copie agora: ela não pode ser mostrada de novo.
          </SecretBox>
        </Box>
      )}
      {result.state === 'loading' && <CircularProgress aria-label="Carregando chaves" />}
      {result.state === 'error' && <Alert severity="error">{result.error.message}</Alert>}
      {result.state === 'ready' && clients.length === 0 && <Typography color="text.secondary">Nenhuma chave de serviço ativa.</Typography>}
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
        {clients.map((c) => (
          <Box component="li" key={c.id} sx={{ ...card, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {c.name}{' '}
                {c.key_hint && (
                  <Typography component="code" variant="body2" color="text.secondary">
                    …{c.key_hint}
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {c.permissions.map(permissionLabel).join(', ')} · último uso:{' '}
                {c.last_used_at ? new Date(c.last_used_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca'}
              </Typography>
            </Box>
            <Button
              color="error"
              aria-label={`Revogar a chave ${c.name}`}
              onClick={() =>
                setConfirm({
                  title: `Revogar “${c.name}”?`,
                  text: 'A integração que usa essa chave para na hora. Não dá para desfazer.',
                  label: 'Revogar',
                  run: () => adminApi.revokeClient(c.id),
                  done: 'Chave revogada',
                })
              }
            >
              Revogar
            </Button>
          </Box>
        ))}
      </Box>

      <ConfirmDialog
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onDone={(message) => {
          enqueueSnackbar(message)
          reload()
        }}
      />
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="sm" aria-labelledby="new-client-title">
        <DialogTitle id="new-client-title">Nova chave de serviço</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField
            label="Nome"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Identifica a integração, ex.: n8n, backup-noturno"
            error={Boolean(name) && !/^[a-zA-Z0-9_.-]+$/.test(name)}
          />
          {result.state === 'ready' && <PermissionPicker value={permissions} onChange={setPermissions} applications={result.data[1]} services={result.data[2]} />}
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!name || !/^[a-zA-Z0-9_.-]+$/.test(name) || !permissions.length} onClick={create}>
            Criar chave
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function AdminAppsPage() {
  const tab = { px: 2, py: 1.5, fontWeight: 700, color: 'text.secondary', textDecoration: 'none', borderBottom: 3, borderColor: 'transparent', whiteSpace: 'nowrap', '&.active': { color: 'text.primary', borderColor: 'primary.main' } }
  return (
    <>
      <PageHeader crumbs={[{ label: 'Administração' }]} title="Aplicações e chaves" />
      <Box component="nav" aria-label="Seções" sx={{ display: 'flex', gap: 0.5, mb: 3, borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
        <Box component={NavLink} to="/admin/aplicacoes" end sx={tab}>
          Aplicações
        </Box>
        <Box component={NavLink} to="/admin/aplicacoes/chaves" sx={tab}>
          Chaves de serviço
        </Box>
      </Box>
      <Routes>
        <Route index element={<Applications />} />
        <Route path="chaves" element={<Clients />} />
      </Routes>
    </>
  )
}

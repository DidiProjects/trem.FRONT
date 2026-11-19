import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useSnackbar } from 'notistack'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { adminApi, type AdminUser, type UserStatus } from '@/services/adminApi'
import { hubApi } from '@/services/hubApi'
import { fold } from '@/utils/text'
import { PermissionPicker } from './PermissionPicker'

const FILTERS: { value: UserStatus | 'all'; label: string }[] = [
  { value: 'pending_approval', label: 'Esperando aprovação' },
  { value: 'active', label: 'Ativos' },
  { value: 'suspended', label: 'Suspensos' },
  { value: 'pending_verification', label: 'Sem e-mail confirmado' },
  { value: 'rejected', label: 'Recusados' },
  { value: 'all', label: 'Todos' },
]

const STATUS: Record<UserStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: 'Ativo', color: 'success' },
  pending_approval: { label: 'Esperando aprovação', color: 'warning' },
  pending_verification: { label: 'E-mail não confirmado', color: 'default' },
  suspended: { label: 'Suspenso', color: 'error' },
  rejected: { label: 'Recusado', color: 'default' },
  blocked: { label: 'Bloqueado', color: 'error' },
}

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca')

const loadCatalog = () => Promise.all([adminApi.applications(), hubApi.list()])

function UserPanel({ user, onChanged }: { user: AdminUser; onChanged: (u: AdminUser | null, message: string) => void }) {
  const { user: me } = useAuth()
  const catalog = useLoad(loadCatalog)
  const [permissions, setPermissions] = useState(user.permissions)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const self = me?.id === user.id
  const dirty = [...permissions].sort().join() !== [...user.permissions].sort().join()

  useEffect(() => heading.current?.focus(), [user.id])

  const act = async (request: () => Promise<AdminUser | { message: string }>, message: string) => {
    setBusy(true)
    setError(null)
    try {
      const result = await request()
      onChanged('id' in result ? result : null, message)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box component="section" aria-labelledby="user-panel-title" sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 2.5 }, display: 'grid', gap: 2 }}>
      <Box>
        <Typography id="user-panel-title" ref={heading} tabIndex={-1} variant="h2" sx={{ outline: 'none' }}>
          {user.username}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user.email ?? 'sem e-mail'} · criado em {when(user.created_at)} · último login {when(user.last_login_at)}
          {user.totp_enabled ? ' · 2FA ligado' : ''}
        </Typography>
        <Chip size="small" sx={{ mt: 1 }} label={STATUS[user.status]?.label ?? user.status} color={STATUS[user.status]?.color ?? 'default'} />
      </Box>

      {catalog.result.state === 'loading' && <CircularProgress aria-label="Carregando permissões" />}
      {catalog.result.state === 'error' && <Alert severity="error">{catalog.result.error.message}</Alert>}
      {catalog.result.state === 'ready' && (
        <PermissionPicker
          value={permissions}
          onChange={setPermissions}
          applications={catalog.result.data[0]}
          services={catalog.result.data[1]}
          disabled={busy || user.status === 'rejected'}
        />
      )}
      {self && <Alert severity="info">Esta é a sua conta: cuidado ao tirar a sua própria administração.</Alert>}
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', borderTop: 1, borderColor: 'divider', pt: 2 }}>
        {user.status === 'pending_approval' ? (
          <>
            <Button variant="contained" color="success" disabled={busy} onClick={() => act(() => adminApi.approve(user.id, permissions), `${user.username} aprovado`)}>
              Aprovar com estas permissões
            </Button>
            <Button color="error" disabled={busy} onClick={() => act(() => adminApi.reject(user.id), `${user.username} recusado`)}>
              Recusar
            </Button>
          </>
        ) : (
          <Button variant="contained" disabled={!dirty || busy} onClick={() => act(() => adminApi.setPermissions(user.id, permissions), 'Permissões salvas')}>
            Salvar permissões
          </Button>
        )}
        {user.status === 'active' && (
          <>
            <Button variant="outlined" disabled={busy || !user.email} onClick={() => act(() => adminApi.sendProvisional(user.id), `Senha provisória enviada para ${user.email}`)}>
              Enviar senha provisória
            </Button>
            {!self && (
              <Button color="error" disabled={busy} onClick={() => act(() => adminApi.suspend(user.id), `${user.username} suspenso`)}>
                Suspender
              </Button>
            )}
          </>
        )}
        {user.status === 'suspended' && (
          <Button variant="outlined" disabled={busy} onClick={() => act(() => adminApi.reactivate(user.id), `${user.username} reativado`)}>
            Reativar
          </Button>
        )}
      </Box>
    </Box>
  )
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (u: AdminUser) => void }) {
  const catalog = useLoad(loadCatalog)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const invalidName = username && !/^[a-zA-Z0-9_.-]{3,50}$/.test(username)

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      onCreated(await adminApi.createUser(username, email.trim() || null, permissions))
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="create-user-title">
      <DialogTitle id="create-user-title">Nova conta</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField
          label="Usuário"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={Boolean(invalidName)}
          helperText={invalidName ? 'De 3 a 50 letras, números, ponto, hífen ou _.' : undefined}
        />
        <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} helperText="Para onde vai a senha provisória." />
        {catalog.result.state === 'ready' && (
          <PermissionPicker value={permissions} onChange={setPermissions} applications={catalog.result.data[0]} services={catalog.result.data[1]} />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!username || Boolean(invalidName) || !permissions.length || busy} onClick={create}>
          Criar conta
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function AdminUsersPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [filter, setFilter] = useState<UserStatus | 'all'>(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    return (FILTERS.find((f) => f.value === status)?.value as UserStatus | undefined) ?? 'all'
  })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<{ key: string; users: AdminUser[]; total: number; error?: string } | null>(null)
  const key = `${filter}:${round}`

  useEffect(() => {
    let active = true
    adminApi.users(filter === 'all' ? null : filter).then(
      (page) => active && setResult({ key, users: page.items, total: page.total }),
      (e: Error) => active && setResult({ key, users: [], total: 0, error: e.message }),
    )
    return () => {
      active = false
    }
  }, [filter, key])

  const loading = result?.key !== key
  const needle = fold(query.trim())
  const users = (result?.users ?? []).filter((u) => !needle || fold(`${u.username} ${u.email ?? ''}`).includes(needle))

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Administração' }]}
        title="Usuários"
        subtitle="Aprove cadastros e escolha os produtos e serviços de cada conta."
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
            Nova conta
          </Button>
        }
      />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_, v) => {
            if (!v) return
            setFilter(v)
            setSelected(null)
          }}
          aria-label="Situação das contas"
          sx={{ flexWrap: 'wrap' }}
        >
          {FILTERS.map((f) => (
            <ToggleButton key={f.value} value={f.value}>
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField size="small" label="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ flex: '1 1 220px' }} />
      </Box>

      {result?.error && <Alert severity="error">{result.error}</Alert>}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box component="section" aria-label="Contas" aria-busy={loading} sx={{ flex: '999 1 360px', minWidth: 0 }}>
          {loading ? (
            <CircularProgress aria-label="Carregando contas" />
          ) : users.length === 0 ? (
            <Typography color="text.secondary">Nenhuma conta aqui.</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
              {users.map((u) => (
                <li key={u.id}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setSelected(u)}
                    aria-pressed={selected?.id === u.id}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      font: 'inherit',
                      color: 'text.primary',
                      cursor: 'pointer',
                      border: 2,
                      borderColor: selected?.id === u.id ? 'primary.main' : 'transparent',
                      bgcolor: 'background.paper',
                      borderRadius: '16px',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                      <Typography component="span" sx={{ fontWeight: 800, display: 'block' }}>
                        {u.username}
                      </Typography>
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                        {u.email ?? 'sem e-mail'}
                      </Typography>
                    </Box>
                    <Chip size="small" label={STATUS[u.status]?.label ?? u.status} color={STATUS[u.status]?.color ?? 'default'} />
                  </Box>
                </li>
              ))}
            </Box>
          )}
          {result && result.total > (result.users.length ?? 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Mostrando {result.users.length} de {result.total}. Use os filtros para achar as outras.
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: '1 1 360px', minWidth: 0 }}>
          {selected ? (
            <UserPanel
              key={selected.id}
              user={selected}
              onChanged={(updated, message) => {
                enqueueSnackbar(message)
                if (updated) setSelected(updated)
                setRound((r) => r + 1)
              }}
            />
          ) : (
            <Typography color="text.secondary" sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: 3 }}>
              Escolha uma conta para ver e mudar o que ela pode usar.
            </Typography>
          )}
        </Box>
      </Box>

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={(u) => {
            setCreating(false)
            enqueueSnackbar(`Conta ${u.username} criada. Envie a senha provisória para ela entrar.`)
            setFilter('active')
            setSelected(u)
            setRound((r) => r + 1)
          }}
        />
      )}
    </>
  )
}

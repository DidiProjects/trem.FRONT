import { useId, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useLoad } from '@/hooks/useLoad'
import { hubApi, type ManagedService } from '@/services/hubApi'

interface Props {
  service: ManagedService
  onClose: () => void
}

/** Who sees the service: one switch per active account, saved as it changes. */
export function ServiceAccessDialog({ service, onClose }: Props) {
  const titleId = useId()
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload } = useLoad(hubApi.activeUsers)
  const [granted, setGranted] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

  const users = result.state === 'ready' ? result.data.items : []
  const has = (id: string, permissions: string[]) => granted[id] ?? permissions.includes(service.permission)
  const needle = query.trim().toLowerCase()
  const shown = users.filter(
    (u) => !needle || u.username.toLowerCase().includes(needle) || (u.email ?? '').toLowerCase().includes(needle),
  )
  const count = users.filter((u) => has(u.id, u.permissions)).length

  const toggle = async (userId: string, value: boolean) => {
    setGranted((prev) => ({ ...prev, [userId]: value }))
    setBusy((prev) => ({ ...prev, [userId]: true }))
    try {
      await (value ? hubApi.grant(service.slug, userId) : hubApi.revoke(service.slug, userId))
    } catch (error) {
      setGranted((prev) => ({ ...prev, [userId]: !value }))
      enqueueSnackbar(error instanceof Error ? error.message : 'Não foi possível alterar o acesso', { variant: 'error' })
    } finally {
      setBusy((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>Acesso a {service.name}</DialogTitle>
      <DialogContent>
        {result.state === 'loading' && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress aria-label="Carregando contas" />
          </Box>
        )}
        {result.state === 'error' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={reload}>
                Tentar de novo
              </Button>
            }
          >
            {result.error.message}
          </Alert>
        )}
        {result.state === 'ready' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {count === 1 ? '1 conta vê' : `${count} contas veem`} este serviço. A mudança vale na próxima vez que a
              pessoa abrir o catálogo.
            </Typography>
            {users.length > 6 && (
              <TextField
                label="Buscar conta"
                size="small"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 1 }}
              />
            )}
            {users.length === 0 ? (
              <Typography color="text.secondary">Nenhuma conta ativa.</Typography>
            ) : (
              <List dense disablePadding>
                {shown.map((u) => (
                  <ListItem
                    key={u.id}
                    disableGutters
                    secondaryAction={
                      <Switch
                        edge="end"
                        checked={has(u.id, u.permissions)}
                        disabled={busy[u.id]}
                        onChange={(e) => void toggle(u.id, e.target.checked)}
                        slotProps={{ input: { 'aria-label': `${u.username} vê ${service.name}` } }}
                      />
                    }
                  >
                    <ListItemText primary={u.username} secondary={u.email ?? undefined} />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Concluir
        </Button>
      </DialogActions>
    </Dialog>
  )
}

import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  TextField,
  Typography,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useSnackbar } from 'notistack'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { accountApi, type CreatedKey, type OwnKey } from '@/services/accountApi'
import { permissionLabel } from '@/utils/permissions'
import { SecretBox } from './SecretBox'

const NAME = /^[a-zA-Z0-9_.-]+$/
const card = { bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 3 }, display: 'grid', gap: 2 } as const

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca usada'
}

function CreateForm({ onCreated, onCancel }: { onCreated: (key: CreatedKey) => void; onCancel: () => void }) {
  const { user } = useAuth()
  // A key can only carry the account's own trem permissions.
  const own = (user?.permissions ?? []).filter((p) => p.startsWith('trem:'))
  const [name, setName] = useState('')
  const [chosen, setChosen] = useState<string[]>(own.filter((p) => p !== 'trem:admin'))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameError = name && !NAME.test(name) ? 'Use letras, números, ponto, hífen ou _. Sem espaços.' : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onCreated(await accountApi.createKey(name, chosen, null))
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2, bgcolor: 'background.default', borderRadius: '16px', p: 2 }}>
      <TextField
        label="Nome"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={Boolean(nameError)}
        helperText={nameError ?? 'Para lembrar onde ela é usada, ex.: notebook, script-backup.'}
        slotProps={{ htmlInput: { maxLength: 50, autoComplete: 'off' } }}
        sx={{ maxWidth: 420 }}
      />
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
        <FormLabel component="legend" sx={{ fontWeight: 800, color: 'text.primary' }}>
          O que ela pode fazer
        </FormLabel>
        <FormGroup>
          {own.map((p) => (
            <FormControlLabel
              key={p}
              label={permissionLabel(p)}
              control={<Checkbox checked={chosen.includes(p)} onChange={(e) => setChosen(e.target.checked ? [...chosen, p] : chosen.filter((x) => x !== p))} />}
            />
          ))}
        </FormGroup>
        <Typography variant="body2" color="text.secondary">
          Só aparecem as permissões da sua conta. Dê à chave só o que o script precisa.
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button type="submit" variant="contained" disabled={!name || Boolean(nameError) || !chosen.length || busy}>
          Criar chave
        </Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </Box>
    </Box>
  )
}

export function KeysSection() {
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload } = useLoad(accountApi.keys)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedKey | null>(null)
  const [revoking, setRevoking] = useState<OwnKey | null>(null)
  const keys = result.state === 'ready' ? result.data.filter((k) => !k.revoked) : []

  const revoke = async (key: OwnKey) => {
    setRevoking(null)
    try {
      await accountApi.revokeKey(key.id)
      enqueueSnackbar(`Chave “${key.name}” revogada`)
      reload()
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    }
  }

  return (
    <Box component="section" aria-labelledby="keys-title" sx={card}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 280px' }}>
          <Typography id="keys-title" variant="h2">
            Chaves de API
          </Typography>
          <Typography color="text.secondary">Para scripts e outros apps usarem a trem.API em seu nome, no cabeçalho X-API-Key.</Typography>
        </Box>
        {!creating && !created && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
            Criar chave
          </Button>
        )}
      </Box>

      {creating && (
        <CreateForm
          onCancel={() => setCreating(false)}
          onCreated={(key) => {
            setCreating(false)
            setCreated(key)
            reload()
          }}
        />
      )}
      {created && (
        <SecretBox title={`Chave “${created.name}” criada`} values={[created.api_key]} confirmLabel="Concluir" onDone={() => setCreated(null)}>
          Copie agora. Guardamos só uma versão embaralhada, então ela não pode ser mostrada de novo.
        </SecretBox>
      )}

      {result.state === 'loading' && <CircularProgress aria-label="Carregando chaves" />}
      {result.state === 'error' && <Alert severity="error">{result.error.message}</Alert>}
      {result.state === 'ready' && keys.length === 0 && !creating && <Typography color="text.secondary">Nenhuma chave ativa.</Typography>}
      {keys.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
          {keys.map((k) => (
            <Box component="li" key={k.id} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.default', borderRadius: '14px', p: 1.5 }}>
              <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {k.name}{' '}
                  {k.key_hint && (
                    <Typography component="code" variant="body2" color="text.secondary">
                      …{k.key_hint}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {k.permissions.map(permissionLabel).join(', ')} · último uso: {when(k.last_used_at)}
                </Typography>
              </Box>
              <Button color="error" onClick={() => setRevoking(k)} aria-label={`Revogar a chave ${k.name}`}>
                Revogar
              </Button>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={Boolean(revoking)} onClose={() => setRevoking(null)}>
        <DialogTitle>Revogar “{revoking?.name}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>O que usa essa chave para de funcionar na hora. Não dá para desfazer.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevoking(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => revoking && void revoke(revoking)}>
            Revogar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

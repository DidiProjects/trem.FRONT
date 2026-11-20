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
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { env } from '@/config/env'
import { useLoad } from '@/hooks/useLoad'
import { ApiError } from '@/services/http'
import { hubApi, type ManagedService, type OidcClient } from '@/services/hubApi'
import { SecretBox } from '../account/SecretBox'

interface Props {
  service: ManagedService
  onClose: () => void
}

/** The client, or null while the service has no login through trem.API (404). */
function loadClient(slug: string): Promise<OidcClient | null> {
  return hubApi.oidcClient(slug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  })
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography component="code" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', userSelect: 'all' }}>
        {value}
      </Typography>
    </Box>
  )
}

function Editor({ service, initial, onClose }: { service: ManagedService; initial: OidcClient | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const [client, setClient] = useState(initial)
  const [uris, setUris] = useState((initial?.redirect_uris ?? []).join('\n'))
  const [secret, setSecret] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'rotate' | 'remove' | null>(null)
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setFieldError(error.message)
      else enqueueSnackbar(error instanceof Error ? error.message : 'Algo deu errado', { variant: 'error' })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const save = () =>
    run(async () => {
      setFieldError(null)
      const saved = await hubApi.configureOidc(service.slug, lines(uris))
      setClient(saved)
      setUris(saved.redirect_uris.join('\n'))
      if (saved.client_secret) setSecret(saved.client_secret)
      else enqueueSnackbar('Endereços salvos', { variant: 'success' })
    })

  const rotate = () =>
    run(async () => {
      const rotated = await hubApi.rotateOidcSecret(service.slug)
      setClient(rotated)
      setSecret(rotated.client_secret ?? null)
    })

  const remove = () =>
    run(async () => {
      await hubApi.removeOidc(service.slug)
      setClient(null)
      setUris('')
      enqueueSnackbar(`Login único de ${service.name} desativado`, { variant: 'success' })
    })

  if (secret) {
    return (
      <DialogContent>
        <SecretBox title="Segredo do login único" values={[secret]} confirmLabel="Concluir" onDone={() => setSecret(null)}>
          Cole no {service.name} junto com o Client ID. O trem guarda só um resumo dele: se perder, gere outro.
        </SecretBox>
      </DialogContent>
    )
  }

  return (
    <>
      <DialogContent>
        <Stack spacing={2.5}>
          <Typography color="text.secondary">
            Com o login único, quem tem acesso a {service.name} entra com a própria conta do trem, sem outra senha.
          </Typography>
          {client && (
            <Stack spacing={1.5} component="section" aria-label="Dados para configurar no serviço">
              <Field label="Issuer (endereço do provedor)" value={env.apiUrl} />
              <Field label="Discovery" value={`${env.apiUrl}/.well-known/openid-configuration`} />
              <Field label="Client ID" value={client.client_id} />
            </Stack>
          )}
          <TextField
            label="Redirect URIs"
            multiline
            minRows={2}
            value={uris}
            onChange={(e) => setUris(e.target.value)}
            error={fieldError !== null}
            helperText={
              fieldError ??
              'Uma por linha, exatamente como o serviço envia. http só para endereço local ou da Tailscale; fora disso, https.'
            }
          />
          {confirm === 'rotate' && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" loading={busy} onClick={() => void rotate()}>
                  Gerar
                </Button>
              }
            >
              O segredo atual para de funcionar na hora: o {service.name} precisa receber o novo.
            </Alert>
          )}
          {confirm === 'remove' && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" loading={busy} onClick={() => void remove()}>
                  Desativar
                </Button>
              }
            >
              O {service.name} deixa de aceitar o login do trem até ser configurado de novo.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {client && (
          <>
            <Button color="error" disabled={busy} onClick={() => setConfirm('remove')}>
              Desativar
            </Button>
            <Button color="inherit" disabled={busy} onClick={() => setConfirm('rotate')}>
              Gerar novo segredo
            </Button>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Fechar
        </Button>
        <Button variant="contained" loading={busy && confirm === null} disabled={lines(uris).length === 0} onClick={() => void save()}>
          {client ? 'Salvar endereços' : 'Ativar login único'}
        </Button>
      </DialogActions>
    </>
  )
}

/** Login through trem.API for a hub service: redirect URIs, the client's secret, and turning it off. */
export function ServiceSsoDialog({ service, onClose }: Props) {
  const titleId = useId()
  const { result, reload } = useLoad(() => loadClient(service.slug))

  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>Login único em {service.name}</DialogTitle>
      {result.state === 'loading' && (
        <DialogContent>
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress aria-label="Carregando login único" />
          </Box>
        </DialogContent>
      )}
      {result.state === 'error' && (
        <DialogContent>
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
        </DialogContent>
      )}
      {result.state === 'ready' && <Editor service={service} initial={result.data} onClose={onClose} />}
    </Dialog>
  )
}

import { useId, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import Add from '@mui/icons-material/Add'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import GroupOutlined from '@mui/icons-material/GroupOutlined'
import { useSnackbar } from 'notistack'
import { ServiceLogo } from '@/components/ServiceLogo'
import { useLoad } from '@/hooks/useLoad'
import { hubApi, logoSrc, type ManagedService } from '@/services/hubApi'
import { ServiceAccessDialog } from './ServiceAccessDialog'
import { ServiceFormDialog } from './ServiceFormDialog'

type Open =
  | { kind: 'none' }
  | { kind: 'form'; service?: ManagedService }
  | { kind: 'access'; service: ManagedService }
  | { kind: 'delete'; service: ManagedService }

export function AdminServicesPage() {
  const { enqueueSnackbar } = useSnackbar()
  const { result, reload, set } = useLoad(hubApi.list)
  const [open, setOpen] = useState<Open>({ kind: 'none' })
  const [deleting, setDeleting] = useState(false)
  const deleteTitleId = useId()
  const services = result.state === 'ready' ? result.data : []

  const fail = (error: unknown) =>
    enqueueSnackbar(error instanceof Error ? error.message : 'Algo deu errado', { variant: 'error' })

  const replace = (saved: ManagedService) => {
    const exists = services.some((s) => s.slug === saved.slug)
    set(exists ? services.map((s) => (s.slug === saved.slug ? saved : s)) : [...services, saved])
  }

  const move = async (index: number, offset: number) => {
    const next = [...services]
    const [item] = next.splice(index, 1)
    next.splice(index + offset, 0, item)
    set(next)
    try {
      set(await hubApi.reorder(next.map((s) => s.slug)))
    } catch (error) {
      fail(error)
      reload()
    }
  }

  const toggle = async (service: ManagedService, enabled: boolean) => {
    replace({ ...service, enabled })
    try {
      replace(await hubApi.update(service.slug, { enabled }))
    } catch (error) {
      replace(service)
      fail(error)
    }
  }

  const remove = async (service: ManagedService) => {
    setDeleting(true)
    try {
      await hubApi.remove(service.slug)
      set(services.filter((s) => s.slug !== service.slug))
      enqueueSnackbar(`${service.name} removido`, { variant: 'success' })
      setOpen({ kind: 'none' })
    } catch (error) {
      fail(error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
        <Box>
          <Typography variant="h1" gutterBottom>
            Serviços do catálogo
          </Typography>
          <Typography color="text.secondary">
            O que aparece depois do login, na ordem desta lista, e quem vê cada serviço.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen({ kind: 'form' })}
          disabled={result.state !== 'ready'}
          sx={{ flexShrink: 0 }}
        >
          Novo serviço
        </Button>
      </Stack>

      {result.state === 'loading' && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Carregando serviços" />
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
          {result.error.status === 403 && /segundo fator/i.test(result.error.message) && (
            <> Saia e entre de novo com o código do autenticador.</>
          )}
        </Alert>
      )}

      {result.state === 'ready' && services.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          Nenhum serviço cadastrado. Use “Novo serviço” para começar.
        </Typography>
      )}

      {services.length > 0 && (
        <Card component="section" aria-label="Serviços cadastrados">
          {services.map((service, index) => (
            <Box key={service.slug}>
              {index > 0 && <Divider />}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ p: 2, alignItems: { md: 'center' } }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                  <ServiceLogo name={service.name} src={logoSrc(service.logo_url)} size={48} />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                        {service.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {service.permission}
                      </Typography>
                      {!service.url && <Chip size="small" color="warning" label="Sem endereço" />}
                      {!service.enabled && <Chip size="small" label="Oculto" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap title={service.url ?? undefined}>
                      {service.url ?? 'Preencha o endereço para o serviço aparecer no catálogo'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  <Tooltip title="Subir">
                    <span>
                      <IconButton
                        aria-label={`Subir ${service.name}`}
                        disabled={index === 0}
                        onClick={() => void move(index, -1)}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Descer">
                    <span>
                      <IconButton
                        aria-label={`Descer ${service.name}`}
                        disabled={index === services.length - 1}
                        onClick={() => void move(index, 1)}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={service.enabled ? 'Visível no catálogo' : 'Oculto do catálogo'}>
                    <Switch
                      checked={service.enabled}
                      onChange={(e) => void toggle(service, e.target.checked)}
                      slotProps={{ input: { 'aria-label': `Mostrar ${service.name} no catálogo` } }}
                    />
                  </Tooltip>
                  <Button
                    size="small"
                    startIcon={<GroupOutlined />}
                    onClick={() => setOpen({ kind: 'access', service })}
                    aria-label={`Acesso a ${service.name}`}
                  >
                    Acesso
                  </Button>
                  <Tooltip title="Editar">
                    <IconButton aria-label={`Editar ${service.name}`} onClick={() => setOpen({ kind: 'form', service })}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <IconButton
                      aria-label={`Remover ${service.name}`}
                      color="error"
                      onClick={() => setOpen({ kind: 'delete', service })}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Card>
      )}

      {open.kind === 'form' && (
        <ServiceFormDialog
          service={open.service}
          onClose={() => setOpen({ kind: 'none' })}
          onSaved={(saved) => {
            replace(saved)
            setOpen({ kind: 'none' })
            enqueueSnackbar(open.service ? 'Serviço atualizado' : `${saved.name} criado`, { variant: 'success' })
          }}
        />
      )}

      {open.kind === 'access' && <ServiceAccessDialog service={open.service} onClose={() => setOpen({ kind: 'none' })} />}

      {open.kind === 'delete' && (
        <Dialog open onClose={deleting ? undefined : () => setOpen({ kind: 'none' })} aria-labelledby={deleteTitleId}>
          <DialogTitle id={deleteTitleId}>Remover {open.service.name}?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              O serviço sai do catálogo de todas as contas, e a permissão {open.service.permission} é apagada com as
              liberações. Não dá para desfazer.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen({ kind: 'none' })} disabled={deleting} color="inherit">
              Cancelar
            </Button>
            <Button color="error" variant="contained" loading={deleting} onClick={() => void remove(open.service)}>
              Remover
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  )
}

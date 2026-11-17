import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import { useSnackbar } from 'notistack'
import { ServiceLogo } from '@/components/ServiceLogo'
import { useForm } from '@/hooks/useForm'
import { ApiError } from '@/services/http'
import { hubApi, logoSrc, type ManagedService, type ServiceFields } from '@/services/hubApi'
import { LOGO_MAX_BYTES, LOGO_TYPES, logoIssue, serviceSchema } from '@/utils/validation'

interface Props {
  /** The service being edited; none to create one. */
  service?: ManagedService
  onClose: () => void
  onSaved: (service: ManagedService) => void
}

type Logo = { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; file: File; preview: string }

export function ServiceFormDialog({ service, onClose, onSaved }: Props) {
  const editing = Boolean(service)
  const titleId = useId()
  const { enqueueSnackbar } = useSnackbar()
  const form = useForm(
    {
      slug: service?.slug ?? '',
      name: service?.name ?? '',
      description: service?.description ?? '',
      url: service?.url ?? '',
    },
    serviceSchema,
  )
  const [enabled, setEnabled] = useState(service?.enabled ?? true)
  const [logo, setLogo] = useState<Logo>({ kind: 'keep' })
  const [logoError, setLogoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const preview = logo.kind === 'new' ? logo.preview : logo.kind === 'remove' ? undefined : logoSrc(service?.logo_url ?? null)

  useEffect(() => {
    if (logo.kind !== 'new') return
    return () => URL.revokeObjectURL(logo.preview)
  }, [logo])

  const pickLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const issue = logoIssue(file)
    setLogoError(issue)
    if (!issue) setLogo({ kind: 'new', file, preview: URL.createObjectURL(file) })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!form.check() || logoError) return
    const { slug, name, description, url } = form.values
    const fields: ServiceFields = {
      name: name.trim(),
      description: description.trim() || null,
      url: url.trim() || null,
      enabled,
    }

    setSaving(true)
    let saved: ManagedService
    try {
      saved = service ? await hubApi.update(service.slug, fields) : await hubApi.create(slug.trim(), fields)
    } catch (error) {
      setSaving(false)
      if (error instanceof ApiError && error.status === 422 && Object.keys(error.fieldErrors).length) {
        form.setServerErrors(error.fieldErrors)
      } else if (error instanceof ApiError && error.status === 409) {
        form.setServerErrors({ slug: error.message })
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível salvar')
      }
      return
    }

    // The service is saved; a failed logo should not hide that.
    try {
      if (logo.kind === 'new') saved = await hubApi.uploadLogo(saved.slug, logo.file)
      else if (logo.kind === 'remove' && saved.logo_url) saved = await hubApi.removeLogo(saved.slug)
    } catch (error) {
      enqueueSnackbar(`Serviço salvo, mas o logo não: ${error instanceof Error ? error.message : 'erro'}`, {
        variant: 'warning',
      })
    }
    setSaving(false)
    onSaved(saved)
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>{editing ? `Editar ${service?.name}` : 'Novo serviço'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <ServiceLogo name={form.values.name || '?'} src={preview} size={72} />
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <Button component="label" variant="outlined" size="small" startIcon={<UploadFileOutlined />}>
                    {preview ? 'Trocar logo' : 'Enviar logo'}
                    <input hidden type="file" accept={LOGO_TYPES.join(',')} onChange={pickLogo} aria-label="Arquivo do logo" />
                  </Button>
                  {preview && (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => {
                        setLogo({ kind: 'remove' })
                        setLogoError(null)
                      }}
                    >
                      Remover logo
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color={logoError ? 'error' : 'text.secondary'}>
                  {logoError ?? `PNG, WebP ou SVG, até ${LOGO_MAX_BYTES / 1024} KB. Quadrado fica melhor.`}
                </Typography>
              </Stack>
            </Stack>

            <TextField
              {...form.field('slug')}
              label="Identificador"
              required
              disabled={editing}
              helperText={
                form.errorOf('slug') ??
                (editing
                  ? `Permissão ${service?.permission}. Não muda depois de criado.`
                  : `Vira a permissão hub:${form.values.slug.trim() || '<identificador>'}. Não muda depois.`)
              }
              slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
            />
            <TextField {...form.field('name')} label="Nome" required />
            <TextField {...form.field('description')} label="Descrição" multiline minRows={2} />
            <TextField
              {...form.field('url')}
              label="Endereço"
              placeholder="http://100.64.0.1:2283"
              helperText={form.errorOf('url') ?? 'Sem endereço, o serviço não aparece no catálogo.'}
              slotProps={{ htmlInput: { inputMode: 'url', autoCapitalize: 'none', spellCheck: false } }}
            />
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
              label="Mostrar no catálogo"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            {editing ? 'Salvar' : 'Criar serviço'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

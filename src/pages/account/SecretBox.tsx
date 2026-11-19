import { useState, type ReactNode } from 'react'
import { Alert, Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import { useSnackbar } from 'notistack'
import { saveBlob } from '@/utils/download'

interface Props {
  title: string
  /** Why it is shown only now. */
  children: ReactNode
  /** The secret, one value per line (a key, or recovery codes). */
  values: string[]
  confirmLabel: string
  onDone: () => void
  download?: { name: string }
}

/**
 * A secret shown once: copy it, and say it was saved before closing. The API keeps
 * only a hash, so there is no "show again".
 */
export function SecretBox({ title, children, values, confirmLabel, onDone, download }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = values.join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      enqueueSnackbar('Não foi possível copiar. Selecione e copie à mão.', { variant: 'error' })
    }
  }

  return (
    <Alert severity="warning" icon={false} role="region" aria-label={title} sx={{ display: 'block', borderRadius: '16px' }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {children}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: '12px',
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontSize: 15,
          overflowX: 'auto',
          display: 'grid',
          gridTemplateColumns: values.length > 1 ? 'repeat(auto-fill, minmax(120px, 1fr))' : '1fr',
          gap: 1,
          userSelect: 'all',
        }}
      >
        {values.map((v) => (
          <code key={v} style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
            {v}
          </code>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
        <Button variant="contained" startIcon={<ContentCopy />} onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        {download && (
          <Button
            variant="outlined"
            onClick={() => saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), download.name)}
          >
            Baixar .txt
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <FormControlLabel control={<Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} />} label="Guardei em lugar seguro" />
        <Button variant="contained" color="inherit" disabled={!saved} onClick={onDone}>
          {confirmLabel}
        </Button>
      </Box>
    </Alert>
  )
}

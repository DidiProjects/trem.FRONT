import { Box, Button, Stack, Typography } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Download from '@mui/icons-material/Download'
import { useSnackbar } from 'notistack'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX, baseName } from '@/services/filesApi'
import { pdfApi, type PdfText } from '@/services/pdfApi'
import { saveBlob } from '@/utils/download'
import { PDF_ACCEPT } from './paths'

function TextResult({ result }: { result: PdfText }) {
  const { enqueueSnackbar } = useSnackbar()
  const all = result.pages.map((text, i) => `--- Página ${i + 1} ---\n${text}`).join('\n\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(all)
      enqueueSnackbar('Texto copiado')
    } catch {
      enqueueSnackbar('Não foi possível copiar. Selecione o texto e copie.', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<ContentCopy />} onClick={copy} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
          Copiar tudo
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => saveBlob(new Blob([all], { type: 'text/plain;charset=utf-8' }), `${baseName(result.filename)}.txt`)}
        >
          Baixar .txt
        </Button>
      </Box>
      {result.pages.map((text, i) => (
        <Box component="section" key={i} aria-label={`Página ${i + 1}`} sx={{ bgcolor: 'background.paper', borderRadius: '16px', p: 2 }}>
          <Typography sx={{ fontWeight: 800, mb: 1, color: 'var(--group)' }}>Página {i + 1}</Typography>
          <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', m: 0 }}>
            {text.trim() || 'Sem texto nesta página.'}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

export default function TextPage() {
  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      runLabel={() => 'Extrair texto'}
      run={async ([file]) => {
        const result = await pdfApi.text(file)
        const words = result.pages.join(' ').trim()
        return {
          title: words ? `${result.total_pages === 1 ? '1 página' : `${result.total_pages} páginas`} de ${result.filename}` : 'Nenhum texto encontrado. O PDF pode ser só imagens.',
          view: <TextResult result={result} />,
        }
      }}
    />
  )
}

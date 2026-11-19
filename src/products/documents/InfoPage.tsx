import { Box, Typography } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { pdfApi, type PdfInfo } from '@/services/pdfApi'
import { formatBytes } from '@/utils/text'
import { PDF_ACCEPT } from './paths'

const LABELS: Record<string, string> = {
  title: 'Título',
  author: 'Autor',
  subject: 'Assunto',
  creator: 'Criado com',
  producer: 'Gerado por',
  creation_date: 'Criado em',
  modification_date: 'Alterado em',
}

function InfoView({ info, size }: { info: PdfInfo; size: number }) {
  const rows: [string, string][] = [
    ['Páginas', String(info.pages)],
    ['Tamanho', formatBytes(size)],
    ['Senha', info.encrypted ? 'Sim, protegido' : 'Não'],
    ['Versão do PDF', info.pdf_version],
    ...Object.entries(info.metadata ?? {})
      .filter(([, v]) => v)
      .map(([k, v]): [string, string] => [LABELS[k] ?? k, String(v)]),
  ]
  return (
    <Box component="dl" sx={{ m: 0, bgcolor: 'background.paper', borderRadius: '20px', p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, gap: 1.5 }}>
      {rows.map(([label, value]) => (
        <Box key={label} sx={{ display: 'contents' }}>
          <Typography component="dt" color="text.secondary">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function InfoPage() {
  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      runLabel={() => 'Ver informações'}
      run={async ([file]) => {
        const info = await pdfApi.info(file)
        return { title: info.filename, view: <InfoView info={info} size={file.size} /> }
      }}
    />
  )
}

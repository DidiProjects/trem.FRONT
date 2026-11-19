import { Typography } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { pdfApi } from '@/services/pdfApi'
import { PDF_ACCEPT } from './paths'

export default function ExplodePage() {
  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      options={<Typography color="text.secondary">Cada página vira um PDF separado, todos num arquivo .zip.</Typography>}
      runLabel={() => 'Separar todas as páginas'}
      run={async ([file]) => ({ file: await pdfApi.explode(file) })}
    />
  )
}

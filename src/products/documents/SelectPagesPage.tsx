import { useState } from 'react'
import { TextField } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { parsePages, pdfApi } from '@/services/pdfApi'
import { DOCS, PDF_ACCEPT } from './paths'

export default function SelectPagesPage() {
  const [pages, setPages] = useState('')
  const [touched, setTouched] = useState(false)
  const parsed = parsePages(pages)
  const error = 'error' in parsed ? parsed.error : null

  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      options={
        <TextField
          label="Páginas"
          placeholder="1-3, 5, 8-10"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && Boolean(error)}
          helperText={touched && error ? error : 'Números e intervalos separados por vírgula.'}
          slotProps={{ htmlInput: { inputMode: 'text', autoComplete: 'off' } }}
        />
      }
      blocker={() => (error ? 'Informe quais páginas ficam.' : null)}
      runLabel={() => ('pages' in parsed ? `Baixar ${parsed.pages.length === 1 ? '1 página' : `${parsed.pages.length} páginas`}` : 'Baixar páginas')}
      run={async ([file]) => ({ file: await pdfApi.select(file, pages) })}
      chain={[DOCS.merge, DOCS.protect]}
      onReset={() => {
        setPages('')
        setTouched(false)
      }}
    />
  )
}

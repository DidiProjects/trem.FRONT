import { useState } from 'react'
import { FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { PDF_MAX } from '@/services/filesApi'
import { parsePages, pdfApi, type ImageFormat } from '@/services/pdfApi'
import { PDF_ACCEPT } from './paths'

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG: nítido, bom para texto' },
  { value: 'jpeg', label: 'JPG: arquivo menor, bom para fotos' },
  { value: 'tiff', label: 'TIFF: para gráficas e arquivo' },
]

const DPI = [
  { value: 72, label: '72 DPI: tela' },
  { value: 150, label: '150 DPI: equilíbrio' },
  { value: 300, label: '300 DPI: impressão' },
]

export default function ToImagePage() {
  const [format, setFormat] = useState<ImageFormat>('png')
  const [dpi, setDpi] = useState(150)
  const [pages, setPages] = useState('')
  const parsed = pages.trim() ? parsePages(pages) : null
  const pagesError = parsed && 'error' in parsed ? parsed.error : null

  return (
    <FileTool
      accept={PDF_ACCEPT}
      maxBytes={PDF_MAX}
      dropTitle="Solte o PDF aqui"
      options={
        <>
          <FormControl>
            <FormLabel sx={{ fontWeight: 800, color: 'text.primary' }}>Formato</FormLabel>
            <RadioGroup value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
              {FORMATS.map((f) => (
                <FormControlLabel key={f.value} value={f.value} control={<Radio />} label={f.label} />
              ))}
            </RadioGroup>
          </FormControl>
          <TextField select label="Qualidade" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
            {DPI.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Páginas (opcional)"
            placeholder="Todas"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            error={Boolean(pagesError)}
            helperText={pagesError ?? 'Em branco converte todas. Mais de uma página chega num .zip.'}
          />
        </>
      }
      blocker={() => (pagesError ? 'Corrija as páginas.' : null)}
      runLabel={() => 'Converter'}
      run={async ([file]) => {
        // One page comes back as the image itself, more as a zip: the name follows.
        const count = parsed && 'pages' in parsed ? parsed.pages.length : (await pdfApi.info(file)).pages
        return { file: await pdfApi.toImages(file, format, dpi, pages.trim(), count === 1) }
      }}
    />
  )
}

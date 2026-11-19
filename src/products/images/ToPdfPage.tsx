import { useState } from 'react'
import { FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { REQUEST_MAX } from '@/services/filesApi'
import { imageApi, type PdfLayout } from '@/services/imageApi'
import { DOCS } from '../documents/paths'
import { IMAGE_ACCEPT } from './paths'

export default function ToPdfPage() {
  const [layout, setLayout] = useState<PdfLayout>('single')
  const [perPage, setPerPage] = useState(4)

  return (
    <FileTool
      accept={IMAGE_ACCEPT}
      multiple
      maxBytes={REQUEST_MAX}
      dropTitle="Solte as imagens aqui"
      dropHint="Fotos de documentos, prints, recibos. A ordem da lista vira a ordem das páginas."
      options={
        <>
          <FormControl>
            <FormLabel sx={{ fontWeight: 800, color: 'text.primary' }}>Páginas</FormLabel>
            <RadioGroup value={layout} onChange={(e) => setLayout(e.target.value as PdfLayout)}>
              <FormControlLabel value="single" control={<Radio />} label="Uma imagem por página" />
              <FormControlLabel value="grouped" control={<Radio />} label="Várias imagens por página" />
            </RadioGroup>
          </FormControl>
          {layout === 'grouped' && (
            <TextField select label="Imagens por página" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
              {[2, 4, 6, 9].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
          )}
        </>
      }
      runLabel={(files) => (files.length === 1 ? 'Criar PDF' : `Criar PDF com ${files.length} imagens`)}
      run={async (files) => ({ file: await imageApi.toPdf(files, layout, perPage) })}
      chain={[DOCS.merge, DOCS.protect]}
    />
  )
}

import { useState } from 'react'
import { Box, FormLabel, MenuItem, Slider, TextField } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { REQUEST_MAX } from '@/services/filesApi'
import { imageApi, type OutputFormat } from '@/services/imageApi'
import { IMAGE_ACCEPT, IMAGES } from './paths'

const FORMATS: { value: OutputFormat; label: string; lossy: boolean }[] = [
  { value: 'webp', label: 'WebP: pequeno e abre em qualquer navegador', lossy: true },
  { value: 'jpeg', label: 'JPG: abre em qualquer lugar', lossy: true },
  { value: 'png', label: 'PNG: sem perda, bom para prints', lossy: false },
  { value: 'gif', label: 'GIF', lossy: false },
  { value: 'bmp', label: 'BMP', lossy: false },
  { value: 'tiff', label: 'TIFF: para gráficas', lossy: false },
]

export default function ConvertPage() {
  const [format, setFormat] = useState<OutputFormat>('webp')
  const [quality, setQuality] = useState(90)
  const lossy = FORMATS.find((f) => f.value === format)?.lossy

  return (
    <FileTool
      accept={IMAGE_ACCEPT}
      maxBytes={REQUEST_MAX}
      dropTitle="Solte a imagem aqui"
      dropHint="HEIC do iPhone também: vira um formato que abre em qualquer lugar."
      options={
        <>
          <TextField select label="Converter para" value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            {FORMATS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
          {lossy && (
            <Box>
              <FormLabel id="convert-quality" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', justifyContent: 'space-between' }}>
                Qualidade <span>{quality}</span>
              </FormLabel>
              <Slider aria-labelledby="convert-quality" value={quality} min={10} max={100} step={5} onChange={(_, v) => setQuality(v as number)} sx={{ color: 'var(--group)' }} />
            </Box>
          )}
        </>
      }
      runLabel={() => 'Converter'}
      run={async ([file]) => ({ file: await imageApi.convert(file, format, quality) })}
      chain={[IMAGES.compress, IMAGES.toPdf]}
    />
  )
}

import { useState } from 'react'
import { Box, FormLabel, MenuItem, Slider, TextField, Typography } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { REQUEST_MAX } from '@/services/filesApi'
import { imageApi } from '@/services/imageApi'
import { formatBytes } from '@/utils/text'
import { Compare } from './Compare'
import { IMAGE_ACCEPT, IMAGES } from './paths'

const SIZES = [
  { value: 0, label: 'Manter o tamanho' },
  { value: 2560, label: '2560 px: telas grandes' },
  { value: 1920, label: '1920 px: Full HD' },
  { value: 1280, label: '1280 px: web' },
  { value: 1080, label: '1080 px: redes sociais' },
]

export default function CompressPage() {
  const [quality, setQuality] = useState(70)
  const [size, setSize] = useState(0)

  return (
    <FileTool
      inline
      accept={IMAGE_ACCEPT}
      maxBytes={REQUEST_MAX}
      dropTitle="Solte a imagem aqui"
      dropHint="JPG, PNG, WebP, HEIC e outros. O formato continua o mesmo; para trocar, use Converter."
      options={
        <>
          <Box>
            <FormLabel id="quality-label" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', justifyContent: 'space-between' }}>
              Qualidade <span>{quality}</span>
            </FormLabel>
            <Slider
              aria-labelledby="quality-label"
              value={quality}
              min={10}
              max={100}
              step={5}
              onChange={(_, v) => setQuality(v as number)}
              sx={{ color: 'var(--group)' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Menor arquivo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mais nítida
              </Typography>
            </Box>
          </Box>
          <TextField select label="Largura máxima" value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {SIZES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
      runLabel={() => 'Comprimir'}
      run={async ([file]) => {
        const result = await imageApi.compress(file, quality, size || null)
        const smaller = result.reductionPercent > 0
        return {
          file: result.file,
          detail: smaller
            ? `${formatBytes(result.originalBytes)} → ${formatBytes(result.file.blob.size)}, ${Math.round(result.reductionPercent)}% menor`
            : `${formatBytes(result.file.blob.size)}: a imagem já estava bem comprimida. Tente uma qualidade menor.`,
          preview: (
            <Compare
              before={file}
              after={result.file.blob}
              beforeLabel={formatBytes(result.originalBytes)}
              afterLabel={`${formatBytes(result.file.blob.size)} · ${result.final.width}×${result.final.height}`}
            />
          ),
        }
      }}
      chain={[IMAGES.toPdf]}
      onReset={() => {
        setQuality(70)
        setSize(0)
      }}
    />
  )
}

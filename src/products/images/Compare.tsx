import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
  before: Blob
  after: Blob
  beforeLabel: string
  afterLabel: string
}

/**
 * Original and result on top of each other, split by a draggable divider. The divider is
 * a native range input, so it moves with the arrow keys and reads its position aloud.
 */
export function Compare({ before, after, beforeLabel, afterLabel }: Props) {
  const [split, setSplit] = useState(50)
  const id = useId()
  const urls = useMemo(() => ({ before: URL.createObjectURL(before), after: URL.createObjectURL(after) }), [before, after])

  useEffect(
    () => () => {
      URL.revokeObjectURL(urls.before)
      URL.revokeObjectURL(urls.after)
    },
    [urls],
  )

  const tag = { position: 'absolute', top: 12, px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: 'rgba(11,20,55,0.8)', color: '#fff', fontWeight: 700, fontSize: 13 } as const

  return (
    <Box>
      <Box sx={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', bgcolor: 'action.hover', lineHeight: 0 }}>
        <Box component="img" src={urls.before} alt={`Original: ${beforeLabel}`} sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
        <Box
          component="img"
          src={urls.after}
          alt={`Resultado: ${afterLabel}`}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: `inset(0 0 0 ${split}%)` }}
        />
        <Box aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 3, ml: '-1.5px', bgcolor: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)' }} />
        <Box aria-hidden sx={{ ...tag, left: 12 }}>
          Original · {beforeLabel}
        </Box>
        <Box aria-hidden sx={{ ...tag, right: 12 }}>
          Resultado · {afterLabel}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
        <Typography component="label" htmlFor={id} variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
          Comparar
        </Typography>
        <Box
          component="input"
          id={id}
          type="range"
          min={0}
          max={100}
          value={split}
          aria-valuetext={`${split}% original, ${100 - split}% resultado`}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSplit(Number(e.target.value))}
          sx={{ flexGrow: 1, accentColor: 'var(--group)', minHeight: 44 }}
        />
      </Box>
    </Box>
  )
}

import { useState } from 'react'
import { Box } from '@mui/material'

interface Props {
  name: string
  /** Full image address, or undefined for the initial. */
  src?: string
  size?: number
}

/** The service's logo on a tile; the name's initial when there is none or it fails to load. */
export function ServiceLogo({ name, src, size = 56 }: Props) {
  const [failed, setFailed] = useState<string | undefined>()
  const showImage = src && failed !== src

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 2,
        bgcolor: 'action.hover',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        color: 'text.secondary',
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={src}
          alt=""
          onError={() => setFailed(src)}
          sx={{ width: size * 0.64, height: size * 0.64, objectFit: 'contain' }}
        />
      ) : (
        <span aria-hidden>{name.charAt(0).toUpperCase()}</span>
      )}
    </Box>
  )
}

import type { ReactNode } from 'react'
import { Box, type BoxProps } from '@mui/material'
import type { ProductGroup } from './types'
import { groupVars } from './groupVars'

export function GroupScope({ group, children, sx, ...rest }: { group: ProductGroup; children: ReactNode } & BoxProps) {
  return (
    <Box {...rest} sx={[groupVars(group), ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  )
}

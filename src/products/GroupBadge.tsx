import { Box } from '@mui/material'
import type { ProductGroup } from './types'
import { groupVars } from './groupVars'

/** The group's icon on a tinted tile; decorative, the label is next to it. */
export function GroupBadge({ group, size = 52, solid = false }: { group: ProductGroup; size?: number; solid?: boolean }) {
  const Icon = group.icon
  return (
    <Box
      aria-hidden
      sx={[
        groupVars(group),
        {
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: `${Math.round(size * 0.3)}px`,
          display: 'grid',
          placeItems: 'center',
          bgcolor: solid ? 'var(--group)' : 'var(--group-soft)',
          color: solid ? 'var(--on-group)' : 'var(--group)',
        },
      ]}
    >
      <Icon sx={{ fontSize: size * 0.52 }} />
    </Box>
  )
}

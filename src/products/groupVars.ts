import type { SxProps, Theme } from '@mui/material/styles'
import type { ProductGroup } from './types'

type SxFn = Extract<SxProps<Theme>, (theme: Theme) => unknown>

/**
 * Sets the group's accent as CSS variables for everything inside: `--group` (text, borders,
 * accents) and `--on-group` (text on a `--group` fill), swapped for the light theme.
 */
export function groupVars(group: Pick<ProductGroup, 'color'>): SxFn {
  return (theme) => ({
    '--group': group.color.dark,
    '--on-group': '#0b1437',
    '--group-soft': `color-mix(in srgb, ${group.color.dark} 16%, transparent)`,
    ...theme.applyStyles('light', {
      '--group': group.color.light,
      '--on-group': '#ffffff',
      '--group-soft': `color-mix(in srgb, ${group.color.light} 12%, transparent)`,
    }),
  })
}

import type { Theme } from '@mui/material/styles'

// The chat's own surfaces (the person's bubble, new chat, send): off-white on the light
// page, white on navy, navy text on both. The shadow lifts them off a theme that is
// otherwise flat. A user choice over the IA group's pink.
const NAVY = '#0b1437'

export const lifted = (theme: Theme) => ({
  bgcolor: '#f4f5f9',
  color: NAVY,
  boxShadow: '0 1px 2px rgba(11, 20, 55, 0.08), 0 6px 16px rgba(11, 20, 55, 0.12)',
  '&:hover': { bgcolor: '#e9ebf2' },
  '&.Mui-disabled': { bgcolor: '#f4f5f9', color: NAVY, opacity: 0.45 },
  ...theme.applyStyles('dark', {
    bgcolor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.45)',
    '&:hover': { bgcolor: '#e8ebf5' },
    '&.Mui-disabled': { bgcolor: '#ffffff', color: NAVY, opacity: 0.45 },
  }),
})

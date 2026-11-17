import { Box, Typography } from '@mui/material'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, justifyContent: compact ? 'flex-start' : 'center' }}>
      <Box component="img" src="/favicon.svg" alt="" sx={{ width: compact ? 28 : 36, height: compact ? 28 : 36 }} />
      <Typography component="span" sx={{ fontWeight: 700, fontSize: compact ? '1.125rem' : '1.375rem' }}>
        trem
      </Typography>
    </Box>
  )
}

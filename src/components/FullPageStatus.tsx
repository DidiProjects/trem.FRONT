import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'

export function FullPageSpinner() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} role="status" aria-label="Carregando">
      <CircularProgress size={32} />
    </Box>
  )
}

export function FullPageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 360 }}>
        <Typography variant="h2">Não foi possível conectar</Typography>
        <Typography color="text.secondary">{message}</Typography>
        <Button variant="contained" onClick={onRetry}>
          Tentar de novo
        </Button>
      </Stack>
    </Box>
  )
}

import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import { useCatalog } from '@/contexts/catalogContext'
import { ServiceCard } from './ServiceCard'

/** The account's services with loading, error and empty states. */
export function ServiceGrid({ limit }: { limit?: number }) {
  const { result, reload } = useCatalog()

  if (result.state === 'loading') {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label="Carregando serviços" />
      </Box>
    )
  }
  if (result.state === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reload}>
            Tentar de novo
          </Button>
        }
      >
        {result.error.message}
      </Alert>
    )
  }
  if (result.data.length === 0) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Inventory2Outlined sx={{ fontSize: 48 }} aria-hidden />
        <Typography variant="h2" component="p" color="text.primary">
          Nenhum serviço liberado ainda
        </Typography>
        <Typography sx={{ maxWidth: 420 }}>
          Peça ao administrador para liberar os serviços que você precisa. Depois disso, eles aparecem aqui.
        </Typography>
      </Stack>
    )
  }
  const services = limit ? result.data.slice(0, limit) : result.data
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
      {services.map((service) => (
        <ServiceCard key={service.slug} service={service} />
      ))}
    </Box>
  )
}

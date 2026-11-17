import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import { ServiceCard } from '@/components/ServiceCard'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { hubApi } from '@/services/hubApi'

export function CatalogPage() {
  const { user } = useAuth()
  const { result, reload } = useLoad(hubApi.catalog)

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1" gutterBottom>
          Olá, {user?.username}
        </Typography>
        <Typography color="text.secondary">Serviços do servidor liberados para a sua conta.</Typography>
      </Box>

      {result.state === 'loading' && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Carregando serviços" />
        </Box>
      )}

      {result.state === 'error' && (
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
      )}

      {result.state === 'ready' && result.data.length === 0 && (
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Inventory2Outlined sx={{ fontSize: 48 }} />
          <Typography variant="h2" component="p" color="text.primary">
            Nenhum serviço liberado ainda
          </Typography>
          <Typography sx={{ maxWidth: 420 }}>
            Peça ao administrador para liberar os serviços que você precisa. Depois disso, eles aparecem aqui.
          </Typography>
        </Stack>
      )}

      {result.state === 'ready' && result.data.length > 0 && (
        <Box
          component="section"
          aria-label="Serviços"
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}
        >
          {result.data.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </Box>
      )}
    </Stack>
  )
}

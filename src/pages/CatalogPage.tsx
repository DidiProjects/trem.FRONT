import { Alert, Box, Stack, Typography } from '@mui/material'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import { ServiceCard } from '@/components/ServiceCard'
import { catalogFor } from '@/constants/services'
import { env } from '@/config/env'
import { useAuth } from '@/hooks/useAuth'

export function CatalogPage() {
  const { user } = useAuth()
  const services = catalogFor(user?.permissions ?? [])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1" gutterBottom>
          Olá, {user?.username}
        </Typography>
        <Typography color="text.secondary">Serviços do servidor liberados para a sua conta.</Typography>
      </Box>

      {!env.servicesHost && services.length > 0 && (
        <Alert severity="warning">O endereço do servidor não foi configurado (VITE_SERVICES_HOST).</Alert>
      )}

      {services.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Inventory2Outlined sx={{ fontSize: 48 }} />
          <Typography variant="h2" component="p" color="text.primary">
            Nenhum serviço liberado ainda
          </Typography>
          <Typography sx={{ maxWidth: 420 }}>
            Peça ao administrador para liberar os serviços que você precisa. Depois disso, eles aparecem aqui.
          </Typography>
        </Stack>
      ) : (
        <Box
          component="section"
          aria-label="Serviços"
          sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}
        >
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </Box>
      )}
    </Stack>
  )
}

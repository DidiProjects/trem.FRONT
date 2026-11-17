import { Box, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material'
import OpenInNew from '@mui/icons-material/OpenInNew'
import type { CatalogService } from '@/constants/services'

export function ServiceCard({ service }: { service: CatalogService }) {
  return (
    <Card component="article" aria-labelledby={`service-${service.id}`} sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box component="img" src={service.logo} alt="" sx={{ width: 36, height: 36 }} />
          </Box>
          <Typography id={`service-${service.id}`} variant="h2" component="h2">
            {service.name}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {service.description}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {service.url ? (
          <Button
            variant="contained"
            fullWidth
            endIcon={<OpenInNew />}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${service.name} em nova aba`}
          >
            Abrir
          </Button>
        ) : (
          <Button variant="contained" fullWidth disabled>
            Endereço não configurado
          </Button>
        )}
      </CardActions>
    </Card>
  )
}

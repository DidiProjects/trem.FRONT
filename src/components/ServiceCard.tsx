import { Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material'
import OpenInNew from '@mui/icons-material/OpenInNew'
import { logoSrc, type CatalogService } from '@/services/hubApi'
import { ServiceLogo } from './ServiceLogo'

export function ServiceCard({ service }: { service: CatalogService }) {
  const titleId = `service-${service.slug}`
  return (
    <Card component="article" aria-labelledby={titleId} sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5 }}>
          <ServiceLogo name={service.name} src={logoSrc(service.logo_url)} />
          <Typography id={titleId} variant="h2" component="h2">
            {service.name}
          </Typography>
        </Stack>
        {service.description && (
          <Typography variant="body2" color="text.secondary">
            {service.description}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
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
      </CardActions>
    </Card>
  )
}

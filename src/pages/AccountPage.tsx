import { Link as RouterLink } from 'react-router'
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { hubApi } from '@/services/hubApi'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: 0.5, py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  )
}

export function AccountPage() {
  const { user } = useAuth()
  const { result } = useLoad(hubApi.catalog)
  if (!user) return null
  const granted = result.state === 'ready' ? result.data : []

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h1">Minha conta</Typography>
      <Card>
        <CardContent>
          <Row label="Usuário">
            <Typography>{user.username}</Typography>
          </Row>
          <Divider />
          <Row label="E-mail">
            <Typography>{user.email ?? '—'}</Typography>
          </Row>
          <Divider />
          <Row label="Serviços liberados">
            {granted.length ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {granted.map((s) => (
                  <Chip key={s.slug} label={s.name} size="small" />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">{result.state === 'loading' ? '…' : 'Nenhum'}</Typography>
            )}
          </Row>
          <Divider />
          <Row label="Verificação em duas etapas">
            <Typography>
              {user.totp_enabled
                ? `Ativada · ${user.recovery_codes_left} códigos de recuperação restantes`
                : 'Desativada'}
            </Typography>
          </Row>
        </CardContent>
      </Card>
      <Box>
        <Button component={RouterLink} to="/change-password" variant="outlined">
          Alterar senha
        </Button>
      </Box>
    </Stack>
  )
}

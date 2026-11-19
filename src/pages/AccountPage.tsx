import type { ReactNode } from 'react'
import { Link as RouterLink, NavLink, Route, Routes } from 'react-router'
import { Box, Chip, Divider, Link, Typography } from '@mui/material'
import { PageHeader } from '@/components/PageHeader'
import { useCatalog } from '@/contexts/catalogContext'
import { useAuth } from '@/hooks/useAuth'
import { groupVars } from '@/products/groupVars'
import { groupsFor } from '@/products/registry'
import { FeedbackSection } from './account/FeedbackSection'
import { KeysSection } from './account/KeysSection'
import { SecuritySection } from './account/SecuritySection'

const TABS = [
  { label: 'Perfil', to: '/account', end: true },
  { label: 'Segurança', to: '/account/seguranca' },
  { label: 'Chaves de API', to: '/account/chaves' },
  { label: 'Fale conosco', to: '/account/feedback' },
]

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, gap: 0.5, py: 1.5 }}>
      <Typography component="dt" color="text.secondary">
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0 }}>
        {children}
      </Box>
    </Box>
  )
}

function Profile() {
  const { user } = useAuth()
  const catalog = useCatalog()
  if (!user) return null
  const groups = groupsFor(user.permissions)
  const services = catalog.result.state === 'ready' ? catalog.result.data : []

  return (
    <Box component="dl" sx={{ m: 0, bgcolor: 'background.paper', borderRadius: '20px', px: { xs: 2, sm: 3 }, py: 1 }}>
      <Row label="Usuário">
        <Typography>{user.username}</Typography>
      </Row>
      <Divider />
      <Row label="E-mail">
        <Typography>{user.email ?? '—'}</Typography>
      </Row>
      <Divider />
      <Row label="Produtos liberados">
        {groups.length ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {groups.map((g) => (
              <Chip
                key={g.id}
                component={RouterLink}
                to={g.path}
                clickable
                label={g.label}
                sx={[groupVars(g), { bgcolor: 'var(--group-soft)', color: 'text.primary', fontWeight: 700, '&::before': { content: '""', width: 8, height: 8, borderRadius: '2px', bgcolor: 'var(--group)', ml: 1.25 } }]}
              />
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">Nenhum</Typography>
        )}
      </Row>
      <Divider />
      <Row label="Serviços liberados">
        {services.length ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {services.map((s) => (
              <Chip key={s.slug} label={s.name} variant="outlined" />
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">{catalog.result.state === 'loading' ? '…' : 'Nenhum'}</Typography>
        )}
      </Row>
      <Divider />
      <Row label="Verificação em duas etapas">
        <Typography>
          {user.totp_enabled ? `Ligada · ${user.recovery_codes_left} códigos de recuperação restantes` : 'Desligada'}{' '}
          <Link component={RouterLink} to="/account/seguranca">
            {user.totp_enabled ? 'Gerenciar' : 'Ligar'}
          </Link>
        </Typography>
      </Row>
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
        Precisa de outro produto ou serviço? <Link component={RouterLink} to="/account/feedback">Peça ao administrador</Link>.
      </Typography>
    </Box>
  )
}

export function AccountPage() {
  return (
    <>
      <PageHeader title="Minha conta" />
      <Box component="nav" aria-label="Seções da conta" sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((tab) => (
          <Box
            key={tab.to}
            component={NavLink}
            to={tab.to}
            end={tab.end}
            sx={{
              px: 2,
              py: 1.5,
              whiteSpace: 'nowrap',
              fontWeight: 700,
              color: 'text.secondary',
              textDecoration: 'none',
              borderBottom: 3,
              borderColor: 'transparent',
              '&.active': { color: 'text.primary', borderColor: 'primary.main' },
            }}
          >
            {tab.label}
          </Box>
        ))}
      </Box>
      <Routes>
        <Route index element={<Profile />} />
        <Route path="seguranca" element={<SecuritySection />} />
        <Route path="chaves" element={<KeysSection />} />
        <Route path="feedback" element={<FeedbackSection />} />
      </Routes>
    </>
  )
}

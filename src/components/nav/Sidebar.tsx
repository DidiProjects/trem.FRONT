import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Box, ButtonBase, Link, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import OpenInNew from '@mui/icons-material/OpenInNew'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { Brand } from '@/components/Brand'
import { useCatalog } from '@/contexts/catalogContext'
import { useAuth } from '@/hooks/useAuth'
import { groupVars } from '@/products/groupVars'
import { groupsFor, toolsOf } from '@/products/registry'
import { visuallyHidden } from '@/utils/a11y'
import { isActive, useTasks } from '@/products/tasks/store'
import { ACCOUNT_PAGES, ADMIN_PAGES, PAGES, TASKS_PATH, visible, type PageLink } from './links'

interface Props {
  /** Called after a link is followed, to close the drawer on small screens. */
  onNavigate?: () => void
  onSearch: () => void
}

const itemSx = {
  borderRadius: '12px',
  minHeight: 44,
  color: 'text.secondary',
  '&.active': { bgcolor: 'action.selected', color: 'text.primary', fontWeight: 800 },
} as const

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Typography
      id={id}
      component="h2"
      sx={{ px: 1.5, pt: 2.5, pb: 0.75, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  )
}

function PageItem({ link, onNavigate, badge }: { link: PageLink; onNavigate?: () => void; badge?: number }) {
  const Icon = link.icon
  return (
    <ListItemButton component={NavLink} to={link.path} end={link.path === '/'} onClick={onNavigate} sx={itemSx}>
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={link.label} slotProps={{ primary: { sx: { fontWeight: 'inherit' } } }} />
      {badge ? (
        <Box component="span" sx={{ minWidth: 22, px: 0.75, borderRadius: '999px', bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>
          {badge}
          <Box component="span" sx={visuallyHidden}>
            {' em andamento'}
          </Box>
        </Box>
      ) : null}
    </ListItemButton>
  )
}

export function Sidebar({ onNavigate, onSearch }: Props) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const catalog = useCatalog()
  const groups = groupsFor(user?.permissions)
  const services = catalog.result.state === 'ready' ? catalog.result.data : []
  const admin = visible(ADMIN_PAGES, user?.permissions)
  const running = useTasks().filter(isActive).length

  return (
    <Box component="nav" aria-label="Navegação principal" sx={{ px: 1.5, py: 2, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Box component={NavLink} to="/" onClick={onNavigate} aria-label="trem, início" sx={{ px: 1, pb: 2, color: 'inherit', textDecoration: 'none' }}>
        <Brand compact />
      </Box>

      <ButtonBase
        onClick={onSearch}
        aria-keyshortcuts="Control+K Meta+K"
        sx={{
          justifyContent: 'flex-start',
          gap: 1.25,
          px: 1.5,
          minHeight: 44,
          borderRadius: '12px',
          bgcolor: 'action.hover',
          color: 'text.secondary',
          fontWeight: 600,
          mb: 1,
        }}
      >
        <SearchOutlined fontSize="small" />
        <Box component="span" sx={{ flexGrow: 1, textAlign: 'left' }}>
          Buscar ou ir para…
        </Box>
        <Box component="kbd" sx={{ font: 'inherit', fontSize: 11, fontWeight: 700, border: 1, borderColor: 'divider', borderRadius: '6px', px: 0.75 }}>
          Ctrl K
        </Box>
      </ButtonBase>

      <List dense disablePadding>
        {visible(PAGES, user?.permissions).map((link) => (
          <PageItem key={link.path} link={link} onNavigate={onNavigate} badge={link.path === TASKS_PATH ? running : undefined} />
        ))}
      </List>

      {groups.length > 0 && (
        <section aria-labelledby="nav-products">
          <Heading id="nav-products">Produtos</Heading>
          <List dense disablePadding sx={{ display: 'grid', gap: 0.25 }}>
            {groups.map((group) => {
              const Icon = group.icon
              const open = pathname === group.path || pathname.startsWith(`${group.path}/`)
              return (
                <Box component="li" key={group.id} sx={[groupVars(group), { listStyle: 'none', borderRadius: '16px', bgcolor: open ? 'action.hover' : 'transparent' }]}>
                  <ListItemButton component={NavLink} to={group.path} end onClick={onNavigate} sx={{ ...itemSx, color: open ? 'text.primary' : 'text.secondary' }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: 'var(--group-soft)', color: 'var(--group)' }}>
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText primary={group.label} slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
                  </ListItemButton>
                  {open && (
                    <List dense disablePadding aria-label={`Ferramentas de ${group.label}`} sx={{ pl: 5.5, pb: 0.75 }}>
                      {toolsOf(group).map((tool) => (
                        <ListItemButton key={tool.id} component={NavLink} to={tool.path} onClick={onNavigate} sx={{ ...itemSx, minHeight: 36, py: 0.25 }}>
                          <ListItemText primary={tool.label} slotProps={{ primary: { sx: { fontWeight: 'inherit', fontSize: 14 } } }} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Box>
              )
            })}
          </List>
        </section>
      )}

      {services.length > 0 && (
        <section aria-labelledby="nav-services">
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', pr: 1.5 }}>
            <Heading id="nav-services">Serviços</Heading>
            <Link component={NavLink} to="/servicos" onClick={onNavigate} underline="hover" sx={{ fontSize: 13, fontWeight: 700 }}>
              Ver todos
            </Link>
          </Box>
          <List dense disablePadding>
            {services.map((service) => (
              <ListItemButton
                key={service.slug}
                component="a"
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ...itemSx, color: 'text.primary' }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box aria-hidden sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'text.primary', color: 'background.default', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>
                    {service.name.charAt(0).toUpperCase()}
                  </Box>
                </ListItemIcon>
                <ListItemText primary={service.name} />
                <OpenInNew sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
                <Box component="span" sx={visuallyHidden}>
                  (abre em nova aba)
                </Box>
              </ListItemButton>
            ))}
          </List>
        </section>
      )}

      <Box sx={{ flexGrow: 1, minHeight: 24 }} />
      <List dense disablePadding aria-label="Conta e administração">
        {visible(ACCOUNT_PAGES, user?.permissions).map((link) => (
          <PageItem key={link.path} link={link} onNavigate={onNavigate} />
        ))}
        {admin.map((link) => (
          <PageItem key={link.path} link={link} onNavigate={onNavigate} />
        ))}
      </List>
    </Box>
  )
}

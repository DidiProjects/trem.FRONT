import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { usePageTitle } from '@/hooks/usePageTitle'

export interface Crumb {
  label: string
  to?: string
}

interface Props {
  title: string
  subtitle?: ReactNode
  crumbs?: Crumb[]
  /** Buttons on the right; they wrap below the title on small screens. */
  actions?: ReactNode
  /** Leading icon tile, usually the product group's. */
  icon?: ReactNode
}

export function PageHeader({ title, subtitle, crumbs, actions, icon }: Props) {
  usePageTitle(title)
  return (
    <Box component="header" sx={{ display: 'flex', alignItems: { sm: 'flex-end' }, gap: 2, flexWrap: 'wrap', mb: 3 }}>
      {icon}
      <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
        {crumbs && crumbs.length > 0 && (
          <Breadcrumbs aria-label="Você está em" sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
            {crumbs.map((c) =>
              c.to ? (
                <Link key={c.label} component={RouterLink} to={c.to} underline="hover" sx={{ color: 'var(--group, inherit)' }}>
                  {c.label}
                </Link>
              ) : (
                <Typography key={c.label} component="span" sx={{ font: 'inherit', color: 'text.secondary' }}>
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h1">{title}</Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  )
}

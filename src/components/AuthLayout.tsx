import type { ReactNode } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <Box
      component="main"
      sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 2, py: 4, bgcolor: 'background.default' }}
    >
      <Box sx={{ position: 'fixed', top: 12, right: 12 }}>
        <ThemeToggle />
      </Box>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
        <Brand />
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h1">{title}</Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Stack>
            {children}
          </CardContent>
        </Card>
        {footer && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {footer}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

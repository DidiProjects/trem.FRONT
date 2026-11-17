import { useState } from 'react'
import { Link as RouterLink, Outlet, useNavigate } from 'react-router'
import { AppBar, Avatar, Box, Container, Divider, IconButton, ListItemIcon, Menu, MenuItem, Toolbar, Tooltip, Typography } from '@mui/material'
import Logout from '@mui/icons-material/Logout'
import ManageAccounts from '@mui/icons-material/ManageAccounts'
import { useAuth } from '@/hooks/useAuth'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const initial = (user?.username ?? '?').charAt(0).toUpperCase()

  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Box component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}>
            <Brand compact />
          </Box>
          <ThemeToggle />
          <Tooltip title="Conta">
            <IconButton
              onClick={(e) => setAnchor(e.currentTarget)}
              aria-label="Abrir menu da conta"
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.95rem' }}>{initial}</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.username}</Typography>
              {user?.email && (
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              )}
            </Box>
            <Divider />
            <MenuItem onClick={() => go('/account')}>
              <ListItemIcon>
                <ManageAccounts fontSize="small" />
              </ListItemIcon>
              Minha conta
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchor(null)
                void logout()
              }}
            >
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}

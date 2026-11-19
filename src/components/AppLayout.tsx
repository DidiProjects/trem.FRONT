import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { AppBar, Avatar, Box, Divider, Drawer, IconButton, ListItemIcon, Menu, MenuItem, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Logout from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import ManageAccounts from '@mui/icons-material/ManageAccounts'
import { CatalogContext } from '@/contexts/catalogContext'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { useTaskRunner } from '@/products/tasks/runner'
import { hubApi } from '@/services/hubApi'
import { isAdmin } from '@/utils/roles'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'
import { CommandPalette } from './nav/CommandPalette'
import { Sidebar } from './nav/Sidebar'

const DRAWER = 280

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const catalog = useLoad(hubApi.catalog)
  useTaskRunner(user?.id)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const firstPath = useRef(pathname)
  const initial = (user?.username ?? '?').charAt(0).toUpperCase()
  // One sidebar in the DOM at a time: a hidden twin would duplicate the landmarks.
  // Without matchMedia (tests) it assumes a wide screen.
  const wide = useMediaQuery(useTheme().breakpoints.up('md'), { noSsr: true, defaultMatches: true })

  // Ctrl K / Cmd K from anywhere, like the editors and dashboards people already know.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A route change moves focus to the new page, so screen readers start from its title.
  useEffect(() => {
    if (pathname === firstPath.current) return
    firstPath.current = pathname
    mainRef.current?.focus({ preventScroll: false })
  }, [pathname])

  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  const sidebar = (
    <Sidebar
      onNavigate={() => setDrawer(false)}
      onSearch={() => {
        setDrawer(false)
        setPalette(true)
      }}
    />
  )

  return (
    <CatalogContext.Provider value={{ result: catalog.result, reload: catalog.reload }}>
      <Box
        component="a"
        href="#conteudo"
        sx={{
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: 2000,
          px: 2,
          py: 1,
          borderRadius: '8px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontWeight: 700,
          '&:focus': { top: 8 },
        }}
      >
        Pular para o conteúdo
      </Box>

      <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
        {wide ? (
          <Drawer
            variant="permanent"
            sx={{ width: DRAWER, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' } }}
          >
            {sidebar}
          </Drawer>
        ) : (
          <Drawer variant="temporary" open={drawer} onClose={() => setDrawer(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER, maxWidth: '85vw' } }}>
            {sidebar}
          </Drawer>
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar sx={{ gap: 1 }}>
              <IconButton
                edge="start"
                aria-label="Abrir menu de navegação"
                onClick={() => setDrawer(true)}
                sx={{ display: wide ? 'none' : 'inline-flex' }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1 }}>{!wide && <Brand compact />}</Box>
              <Tooltip title="Buscar ou ir para (Ctrl K)">
                <IconButton aria-label="Buscar ou ir para" aria-keyshortcuts="Control+K Meta+K" onClick={() => setPalette(true)}>
                  <SearchOutlined />
                </IconButton>
              </Tooltip>
              <ThemeToggle />
              <Tooltip title="Conta">
                <IconButton
                  onClick={(e) => setAnchor(e.currentTarget)}
                  aria-label="Abrir menu da conta"
                  aria-haspopup="menu"
                  aria-expanded={Boolean(anchor)}
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
                {isAdmin(user?.permissions) && (
                  <MenuItem onClick={() => go('/admin/services')}>
                    <ListItemIcon>
                      <AdminPanelSettingsOutlined fontSize="small" />
                    </ListItemIcon>
                    Serviços do catálogo
                  </MenuItem>
                )}
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

          <Box
            component="main"
            id="conteudo"
            ref={mainRef}
            tabIndex={-1}
            sx={{ flexGrow: 1, outline: 'none', px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, sm: 4 }, width: '100%', maxWidth: 1280, mx: 'auto', boxSizing: 'border-box' }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </CatalogContext.Provider>
  )
}

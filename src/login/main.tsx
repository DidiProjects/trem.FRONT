import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from '@/theme'
import { flowSlug } from './flowSlug'
import { LoginApp } from './LoginApp'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      <LoginApp slug={flowSlug(window.location.pathname)} query={window.location.search.replace(/^\?/, '')} />
    </ThemeProvider>
  </StrictMode>,
)

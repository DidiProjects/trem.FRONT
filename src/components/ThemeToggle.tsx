import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import DarkMode from '@mui/icons-material/DarkMode'
import LightMode from '@mui/icons-material/LightMode'

export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  const current = mode === 'system' ? systemMode : mode
  if (!current) return null

  const next = current === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Usar tema escuro' : 'Usar tema claro'
  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(next)} color="inherit">
        {current === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  )
}

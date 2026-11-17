import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1f4e79' },
        secondary: { main: '#c2410c' },
        background: { default: '#f5f7fa', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#7fb2e5' },
        secondary: { main: '#fb923c' },
        background: { default: '#0f1419', paper: '#171d24' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700 },
    h2: { fontSize: '1.375rem', fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
  },
})

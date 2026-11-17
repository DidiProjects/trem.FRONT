import '@fontsource-variable/nunito'
import { createTheme } from '@mui/material/styles'

// Flat, saturated palette on deep navy: vivid accents carry the hierarchy, no shadows or outlines.
// Light-mode accents are darkened so text on them and on paper stays at WCAG AA (4.5:1).
const navy = '#0b1437'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2c4bd8', contrastText: '#ffffff' },
        secondary: { main: '#c42a62', contrastText: '#ffffff' },
        success: { main: '#0d8a5f' },
        warning: { main: '#b45309' },
        error: { main: '#d1294b' },
        info: { main: '#6a4fd8' },
        background: { default: '#eef0ff', paper: '#ffffff' },
        text: { primary: '#141a4a', secondary: '#4a5390' },
        divider: 'rgba(20, 26, 74, 0.12)',
      },
    },
    dark: {
      palette: {
        primary: { main: '#4dd4ff', contrastText: navy },
        secondary: { main: '#ff5c8a', contrastText: navy },
        success: { main: '#3ee0a1' },
        warning: { main: '#ffc23d' },
        error: { main: '#ff6b7f' },
        info: { main: '#a393ff' },
        background: { default: navy, paper: '#16215a' },
        text: { primary: '#f4f2ff', secondary: '#aeb7ea' },
        divider: 'rgba(174, 183, 234, 0.16)',
      },
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Nunito Variable", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    h1: { fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.375rem', fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.default,
          backgroundImage: 'none',
        }),
      },
    },
  },
})

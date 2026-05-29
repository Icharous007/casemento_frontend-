import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#c8a2c8',      // lavanda rosada
      light: '#e8d5e8',
      dark: '#9a759a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c9a84c',      // dourado elegante
      light: '#f0d078',
      dark: '#967a2a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#faf8f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#3d2b2b',
      secondary: '#7a6060',
    },
  },
  typography: {
    fontFamily: '"Lato", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 300, letterSpacing: '0.05em' },
    h2: { fontWeight: 300, letterSpacing: '0.04em' },
    h3: { fontWeight: 400, letterSpacing: '0.03em' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#7d98da',
      light: '#a9c8ea',
      dark: '#6483cb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b59ac7',
      light: '#d5b7e3',
      dark: '#9677aa',
      contrastText: '#ffffff',
    },
    info: {
      main: '#a9c8ea',
      light: '#d8e7f6',
      dark: '#86a8cd',
      contrastText: '#20324e',
    },
    warning: {
      main: '#d8c0e3',
      light: '#f1e4f6',
      dark: '#b292bf',
      contrastText: '#4b3f5d',
    },
    success: {
      main: '#7d98da',
      light: '#a9c8ea',
      dark: '#6483cb',
      contrastText: '#ffffff',
    },
    error: {
      main: '#9f84b3',
      light: '#c6b2d1',
      dark: '#7b628c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fff8f5',
      paper: '#fffdfb',
    },
    text: {
      primary: '#4b3f5d',
      secondary: '#7c6f8d',
    },
    divider: '#eadfec',
  },
  typography: {
    fontFamily: '"Lato", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '4rem', letterSpacing: '0.05em', color: '#4b3f5d' },
    h2: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '3.2rem', letterSpacing: '0.04em', color: '#4b3f5d' },
    h3: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '2.6rem', letterSpacing: '0.03em', color: '#4b3f5d' },
    h4: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '2rem', color: '#4b3f5d' },
    h5: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '1.6rem', color: '#4b3f5d' },
    h6: { fontFamily: '"Lavishly Yours", cursive', fontWeight: 400, fontSize: '1.3rem', color: '#4b3f5d' },
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
          borderRadius: 999,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 12px 28px rgba(120, 95, 160, 0.10)',
        },
      },
    },
  },
});

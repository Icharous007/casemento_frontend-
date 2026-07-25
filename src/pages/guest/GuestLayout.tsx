import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HomeIcon from '@mui/icons-material/Home';

export default function GuestLayout({ children, title, showHomeButton = true }: Readonly<{ children: ReactNode; title?: string; showHomeButton?: boolean }>) {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'center', position: 'relative', minHeight: { xs: 64 } }}>
          {showHomeButton && (
            <Button
              onClick={() => navigate('/home')}
              aria-label="Voltar para o início"
              startIcon={<HomeIcon sx={{ fontSize: '1.4rem !important' }} />}
              sx={{
                position: 'absolute',
                left: 8,
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: 0.3,
                borderRadius: 999,
                px: 1.5,
                py: 0.75,
                bgcolor: 'rgba(200, 162, 200, 0.15)',
                '&:hover': { bgcolor: 'rgba(200, 162, 200, 0.30)' },
              }}
            >
              Início
            </Button>
          )}
          <FavoriteIcon sx={{ color: 'primary.main', mr: 1, fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 400, letterSpacing: 2 }}>
            {title ?? 'Nosso Casamento'}
          </Typography>
          <FavoriteIcon sx={{ color: 'primary.main', ml: 1, fontSize: 18 }} />
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, py: 4 }}>
        {children}
      </Box>
    </Box>
  );
}

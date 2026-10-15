import { type ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, GlobalStyles } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HomeIcon from '@mui/icons-material/Home';
import { useAnimatedNavigate } from '../../hooks/useAnimatedNavigate';

export default function GuestLayout({ children, title, showHomeButton = true }: Readonly<{ children: ReactNode; title?: string; showHomeButton?: boolean }>) {
  const navigate = useAnimatedNavigate();

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'transparent' }}>
      <GlobalStyles
        styles={{
          html: { height: '100%' },
          body: {
            minHeight: '100svh',
            overscrollBehaviorY: 'none',
          },
          '#root': {
            width: '100%',
            maxWidth: '100%',
            margin: 0,
            borderInline: 'none',
            minHeight: '100svh',
            display: 'block',
            textAlign: 'initial',
          },
        }}
      />
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        className="guest-appbar-transition"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          pt: 'env(safe-area-inset-top)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'center', position: 'relative', minHeight: { xs: 56, sm: 64 } }}>
          {showHomeButton && (
            <Button
              onClick={() => navigate('/home', { direction: 'back' })}
              aria-label="Voltar para o início"
              className="guest-home-btn"
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
          <Box component="span" className="guest-header-heart" sx={{ mr: 1 }}>
            <FavoriteIcon sx={{ color: 'primary.main', fontSize: 18 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 400, letterSpacing: 2 }}>
            {title ?? 'Nosso Casamento'}
          </Typography>
          <Box component="span" className="guest-header-heart" sx={{ ml: 1 }}>
            <FavoriteIcon sx={{ color: 'primary.main', fontSize: 18 }} />
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        className="guest-page-content-enter"
        sx={{ maxWidth: 600, mx: 'auto', px: 2, py: 4, pb: 'max(32px, env(safe-area-inset-bottom))' }}
      >
        {children}
      </Box>
    </Box>
  );
}

import { type ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

export default function GuestLayout({ children, title }: { children: ReactNode; title?: string }) {
    return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'center' }}>
          <FavoriteIcon sx={{ color: 'primary.main', mr: 1, fontSize: 18 }} />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 400, letterSpacing: 2 }}>
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

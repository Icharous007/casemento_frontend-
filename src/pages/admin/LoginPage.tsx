import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'E-mail ou senha inválidos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'transparent',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ textAlign: 'center', mb: 0.5, fontWeight: 500 }} color="primary">
            Casamento Admin
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', mb: 3 }} color="text.secondary">
            Acesso restrito à equipe
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} noValidate>
            <TextField
              label="E-mail"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

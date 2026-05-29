import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert, Button, TextField } from '@mui/material';
import { useGuestAuth } from '../../contexts/GuestAuthContext';
import { setGuestToken } from '../../api/client';
import GuestLayout from './GuestLayout';

export default function AccessPage() {
  const [searchParams] = useSearchParams();
  const { resolve } = useGuestAuth();
  const navigate = useNavigate();

  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tokenFromUrl = searchParams.get('token') ?? '';

  useEffect(() => {
    if (tokenFromUrl) {
      handleResolve(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function handleResolve(token: string) {
    if (!token.trim()) return;
    setError('');
    setLoading(true);
    try {
      const data = await resolve(token.trim());
      if (data.requiresProfileCompletion) {
        navigate('/primeiro-acesso', { state: { token: token.trim() } });
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Token inválido ou expirado.';
      setError(msg);
      setGuestToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GuestLayout>
      <Box sx={{ textAlign: "center" }}>
        {loading && (
          <Box sx={{ py: 6 }}>
            <CircularProgress color="primary" />
            <Typography sx={{ mt: 2 }} color="text.secondary">Verificando seu convite...</Typography>
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ py: 4 }}>
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Cole o código do seu convite abaixo:
            </Typography>
            <TextField
              fullWidth
              label="Código do convite"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => handleResolve(manualToken)}
              disabled={!manualToken.trim()}
            >
              Acessar meu convite
            </Button>
          </Box>
        )}

        {!loading && !error && !tokenFromUrl && (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" color="primary" sx={{ mb: 1, fontWeight: 400 }}>
              Bem-vindo(a)!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Cole o código do seu convite para acessar o evento:
            </Typography>
            <TextField
              fullWidth
              label="Código do convite"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => handleResolve(manualToken)}
              disabled={!manualToken.trim()}
            >
              Acessar meu convite
            </Button>
          </Box>
        )}
      </Box>
    </GuestLayout>
  );
}

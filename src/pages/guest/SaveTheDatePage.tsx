import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Alert, Button, TextField, CircularProgress,
  Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import { useGuestAuth } from '../../contexts/GuestAuthContext';
import { registerGuestAccess } from '../../api/guestApi';
import GuestLayout from './GuestLayout';

const ERROR_MESSAGES: Record<string, string> = {
  TERMS_NOT_ACCEPTED: 'Você precisa aceitar os termos para continuar.',
  PHONE_INVALID: 'Número de telefone inválido. Verifique e tente novamente.',
  GUEST_BLOCKED: 'Acesso indisponível. Fale com os noivos.',
  NOT_FOUND: 'Evento não encontrado. Verifique o link ou QR code.',
};

function resolveError(err: unknown): string {
  const resp = (err as any)?.response;
  const code: string | undefined = resp?.data?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (resp?.status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (resp?.status === 429) return 'Muitas requisições. Aguarde um momento e tente novamente.';
  return resp?.data?.message ?? 'Erro inesperado. Tente novamente.';
}

export default function SaveTheDatePage() {
  const [searchParams] = useSearchParams();
  const { loginWithRegisteredAccess } = useGuestAuth();
  const navigate = useNavigate();

  const eventSlug = searchParams.get('event') ?? '';

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await registerGuestAccess({
        eventSlug,
        phone,
        displayName,
        acceptedTerms,
      });
      loginWithRegisteredAccess(res);
      navigate('/home');
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── No event slug in URL ──────────────────────────────────────────────────
  if (!eventSlug) {
    return (
      <GuestLayout>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Link inválido. Escaneie o QR code do evento para acessar.
          </Alert>
        </Box>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <Box sx={{ textAlign: 'center' }}>
        <Box sx={{ py: 4 }}>
          <Typography variant="h5" color="primary" sx={{ mb: 1, fontWeight: 400 }}>
            Bem-vindo(a)!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Informe seus dados para acessar a área do convidado.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Seu nome ou apelido"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Telefone (WhatsApp)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            sx={{ mb: 2 }}
          />

          <Divider sx={{ mb: 2 }} />

          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                Aceito que meus dados sejam usados para organização do evento e confirmação de presença.
              </Typography>
            }
            sx={{ mb: 3, alignItems: 'flex-start', textAlign: 'left' }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={loading || !phone.trim() || !displayName.trim() || !acceptedTerms}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </Box>
      </Box>
    </GuestLayout>
  );
}

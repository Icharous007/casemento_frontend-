import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Checkbox,
  FormControlLabel, Alert, CircularProgress, Divider,
} from '@mui/material';
import { completeProfile } from '../../api/guestApi';
import GuestLayout from './GuestLayout';

export default function FirstAccessPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Você precisa aceitar os termos para continuar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeProfile({
        confirmedName: name,
        confirmedEmail: email,
        confirmedPhone: phone || undefined,
        acceptedTerms: true,
      });
      navigate('/home');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GuestLayout title="Primeiro Acesso">
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, mb: 1, textAlign: "center" }}>
        Complete seu perfil
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        Precisamos de algumas informações para confirmar sua presença.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nome completo *"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          label="E-mail *"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Telefone (opcional)"
          type="tel"
          fullWidth
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={{ mb: 3 }}
          placeholder="(11) 99999-9999"
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
          sx={{ mb: 3, alignItems: 'flex-start' }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !name || !email || !acceptedTerms}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {loading ? 'Salvando...' : 'Continuar'}
        </Button>
      </Box>
    </GuestLayout>
  );
}

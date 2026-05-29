import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, ToggleButton, ToggleButtonGroup,
  TextField, Alert, CircularProgress, Card, CardContent, Divider,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { getMe } from '../../api/guestApi';
import { submitRsvp } from '../../api/rsvpApi';
import GuestLayout from './GuestLayout';

export default function GuestRsvpPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery({ queryKey: ['guest', 'me'], queryFn: getMe });

  const [attendance, setAttendance] = useState<'ATTENDING' | 'DECLINED' | null>(null);
  const [dietary, setDietary] = useState('');
  const [allergies, setAllergies] = useState('');
  const [additional, setAdditional] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitRsvp({
        attendanceStatus: attendance!,
        dietaryRestrictions: dietary || undefined,
        allergies: allergies || undefined,
        additionalInfo: additional || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'me'] });
      setSuccess(true);
      setTimeout(() => navigate('/home'), 2500);
    },
  });

  if (isLoading) {
    return (
      <GuestLayout>
        <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>
      </GuestLayout>
    );
  }

  const deadline = me?.event.rsvpDeadlineAt ? new Date(me.event.rsvpDeadlineAt) : null;
  const isPastDeadline = deadline && new Date() > deadline;

  return (
    <GuestLayout title="RSVP">
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, textAlign: "center", mb: 1 }}>
        Confirmação de Presença
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        {me?.event.coupleNames}
        {deadline && ` · Prazo: ${deadline.toLocaleDateString('pt-BR')}`}
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Confirmação registrada com sucesso! Redirecionando...
        </Alert>
      )}

      {isPastDeadline && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          O prazo para confirmação encerrou em {deadline?.toLocaleDateString('pt-BR')}.
        </Alert>
      )}

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(mutation.error as any)?.response?.data?.message ?? 'Erro ao confirmar. Tente novamente.'}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 2, textAlign: "center" }}>
            Você vai comparecer?
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <ToggleButtonGroup
              value={attendance}
              exclusive
              onChange={(_, v) => v && setAttendance(v)}
              size="large"
            >
              <ToggleButton value="ATTENDING" color="success" sx={{ px: 3 }}>
                <CheckCircleOutlinedIcon sx={{ mr: 1 }} />
                Sim, vou!
              </ToggleButton>
              <ToggleButton value="DECLINED" color="error" sx={{ px: 3 }}>
                <CancelOutlinedIcon sx={{ mr: 1 }} />
                Não poderei ir
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {attendance === 'ATTENDING' && (
            <>
              <Divider sx={{ mb: 2 }} />
              <TextField
                label="Restrições alimentares"
                fullWidth
                multiline
                rows={2}
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Ex: vegetariano, sem glúten..."
                sx={{ mb: 2 }}
              />
              <TextField
                label="Alergias"
                fullWidth
                multiline
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ex: amendoim, frutos do mar..."
                sx={{ mb: 2 }}
              />
              <TextField
                label="Informações adicionais"
                fullWidth
                multiline
                rows={2}
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
                sx={{ mb: 2 }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        disabled={!attendance || mutation.isPending || isPastDeadline || success}
        onClick={() => mutation.mutate()}
        startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined}
      >
        {mutation.isPending ? 'Confirmando...' : 'Confirmar resposta'}
      </Button>

      <Button
        variant="text"
        fullWidth
        onClick={() => navigate('/home')}
        sx={{ mt: 1 }}
      >
        Voltar
      </Button>
    </GuestLayout>
  );
}

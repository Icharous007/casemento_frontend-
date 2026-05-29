import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip,
  CircularProgress, Alert, Divider, Stack,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { getMe } from '../../api/guestApi';
import GuestLayout from './GuestLayout';

const rsvpLabel: Record<string, string> = {
  ATTENDING: '✓ Presença confirmada',
  DECLINED: '✗ Presença recusada',
  PENDING: 'Aguardando confirmação',
};

const rsvpColor: Record<string, 'success' | 'error' | 'warning'> = {
  ATTENDING: 'success',
  DECLINED: 'error',
  PENDING: 'warning',
};

export default function GuestHomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'me'],
    queryFn: getMe,
  });

  if (isLoading) {
    return (
      <GuestLayout>
        <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>
      </GuestLayout>
    );
  }

  if (isError || !data) {
    return (
      <GuestLayout>
        <Alert severity="error">
          Não foi possível carregar as informações. Tente novamente.
        </Alert>
      </GuestLayout>
    );
  }

  const { event, displayName, rsvpStatus } = data;
  const eventDate = event.eventStartAt ? new Date(event.eventStartAt) : null;

  return (
    <GuestLayout title={event.title}>
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, textAlign: "center", mb: 0.5 }}>
        Olá, {displayName}! 💕
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        Você está convidado(a) para celebrar conosco.
      </Typography>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 500, mb: 2, textAlign: "center" }}>
            {event.coupleNames}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.5}>
            {eventDate && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonthIcon color="action" fontSize="small" />
                <Typography variant="body2">
                  {eventDate.toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                  {' — '}
                  {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            )}
            {event.venueName && (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <LocationOnIcon color="action" fontSize="small" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{event.venueName}</Typography>
                  {event.venueAddress && (
                    <Typography variant="body2" color="text.secondary">{event.venueAddress}</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HowToRegIcon color="action" />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Sua confirmação</Typography>
            </Box>
            <Chip
              label={rsvpLabel[rsvpStatus] ?? rsvpStatus}
              color={rsvpColor[rsvpStatus] ?? 'default'}
            />
          </Box>

          {event.rsvpDeadlineAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Prazo: {new Date(event.rsvpDeadlineAt).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={() => navigate('/rsvp')}
        sx={{ mb: 2 }}
      >
        {rsvpStatus === 'PENDING' ? 'Confirmar presença' : 'Alterar confirmação'}
      </Button>
    </GuestLayout>
  );
}

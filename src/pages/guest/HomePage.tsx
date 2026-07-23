import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, GlobalStyles, Stack, Typography,
} from '@mui/material';
import { getMe } from '../../api/guestApi';
import saveTheDateImage from '../../assets/save_the_date.png';
import './HomePage.css';

const rsvpLabel: Record<string, string> = {
  ATTENDING: '✓ Presença confirmada',
  DECLINED: '✗ Presença recusada',
  PENDING: 'Aguardando confirmação',
};

const rsvpColor: Record<string, 'primary' | 'secondary' | 'info'> = {
  ATTENDING: 'primary',
  DECLINED: 'secondary',
  PENDING: 'info',
};

export default function GuestHomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'me'],
    queryFn: getMe,
  });

  const guestName = data?.displayName;
  const eventTitle = data?.event.title ?? 'Nosso Casamento';
  const coupleNames = data?.event.coupleNames;
  const rsvpStatus = data?.rsvpStatus;
  const rsvpDeadline = data?.event.rsvpDeadlineAt
    ? new Date(data.event.rsvpDeadlineAt).toLocaleDateString('pt-BR')
    : null;

  return (
    <>
      <GlobalStyles
        styles={{
          body: { backgroundColor: '#fff8f5' },
          '#root': {
            width: '100%',
            maxWidth: '100%',
            margin: 0,
            borderInline: 'none',
            minHeight: '100svh',
            display: 'block',
          },
        }}
      />

      <Box className="save-date-page">
        <Box
          className="save-date-backdrop"
          sx={{ backgroundImage: `linear-gradient(180deg, rgba(255, 248, 245, 0.30), rgba(181, 154, 199, 0.22)), url(${saveTheDateImage})` }}
        />

        <Box className="save-date-shell">
          <Box className="save-date-posterFrame">
            <Box
              component="img"
              src={saveTheDateImage}
              alt="Save the date do casamento"
              className="save-date-poster"
            />
          </Box>

          <Box className="save-date-panel">
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} className="save-date-badges">
              <Chip label={eventTitle} className="save-date-chip save-date-chip--soft" />
              {rsvpStatus && (
                <Chip
                  label={rsvpLabel[rsvpStatus] ?? rsvpStatus}
                  color={rsvpColor[rsvpStatus] ?? 'default'}
                  className="save-date-chip"
                />
              )}
            </Stack>

            <Typography className="save-date-eyebrow">
              {guestName ? `Olá, ${guestName}` : 'Você está convidado(a)'}
            </Typography>

            <Typography className="save-date-title">
              {coupleNames ?? 'Reserve esta data para celebrar conosco'}
            </Typography>

            <Typography className="save-date-description">
              Uma prévia do nosso grande dia. Explore sua confirmação, lista de presentes, galeria e mural a partir desta página.
            </Typography>

            {isLoading && (
              <Box className="save-date-inlineStatus">
                <CircularProgress size={20} color="inherit" />
                <Typography variant="body2">Carregando seus detalhes do convite...</Typography>
              </Box>
            )}

            {isError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                Não foi possível carregar seus dados agora. Você ainda pode navegar pelas demais áreas.
              </Alert>
            )}

            {rsvpDeadline && !isError && (
              <Typography className="save-date-meta">
                RSVP até {rsvpDeadline}
              </Typography>
            )}

            <Stack spacing={1.5} className="save-date-actions">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/rsvp')}
                sx={{ borderRadius: 999, py: 1.5 }}
              >
                {rsvpStatus === 'PENDING' ? 'Confirmar presença' : 'Ver confirmação'}
              </Button>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/presentes')}
                  sx={{ borderRadius: 999, py: 1.5 }}
                >
                  Presentes
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/galeria')}
                  sx={{ borderRadius: 999, py: 1.5 }}
                >
                  Galeria
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/mural')}
                  sx={{ borderRadius: 999, py: 1.5 }}
                >
                  Mural
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}

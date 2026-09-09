import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, GlobalStyles, Stack, Typography,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getMe } from '../../api/guestApi';
import { EVENT_LOCATIONS } from '../../api/locationsApi';
import { useGuestAuth } from '../../contexts/GuestAuthContext';
import saveTheDateImage from '../../assets/save_the_date.png';
import ceremonyImage from '../../assets/local_cerimonia_casamento.png';
import partyImage from '../../assets/local_festa_casamento.png';
import './HomePage.css';

const locationImages: Record<string, string> = {
  cerimonia: ceremonyImage,
  festa: partyImage,
};

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
  const { guest } = useGuestAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'me'],
    queryFn: getMe,
  });

  const guestName = guest?.displayName || data?.displayName;
  const eventTitle = data?.event.title ?? 'Nosso Casamento';
  const coupleNames = data?.event.coupleNames;
  const rsvpStatus = data?.rsvpStatus;
  const rsvpDeadline = '30/09/2026';

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

            {rsvpDeadline && (
              <Typography className="save-date-meta">
                RSVP até {rsvpDeadline}
              </Typography>
            )}

            <Stack spacing={1.5} className="save-date-actions">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/minha-familia')}
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

            {/* ─── Localização ─────────────────────────────────────────── */}
            <Box className="location-section">
              <Typography
                className="location-heading"
                sx={{
                  fontSize: { xs: '1.5rem', sm: '0.92rem' },
                  fontWeight: { xs: 600, sm: 500 },
                  letterSpacing: { xs: '0.03em', sm: '0.22em' },
                  textTransform: { xs: 'none', sm: 'uppercase' },
                }}
              >
                <PlaceIcon sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: { xs: 26, sm: 20 } }} />
                Como chegar
              </Typography>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, sm: 2 }} className="location-cards">
                {EVENT_LOCATIONS.map((loc) => (
                  <Box
                    key={loc.id}
                    component="a"
                    href={loc.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="location-card"
                    aria-label={`Ver ${loc.label} no Google Maps`}
                  >
                    <Box
                      component="img"
                      src={locationImages[loc.id]}
                      alt={`Local da ${loc.label} – ${loc.subtitle}`}
                      className="location-card__img"
                    />
                    <Box className="location-card__body">
                      <Typography className="location-card__label" sx={{ fontSize: { xs: '1.3rem', sm: '1.15rem' } }}>
                        {loc.label}
                      </Typography>
                      <Typography className="location-card__subtitle" sx={{ fontSize: { xs: '0.92rem', sm: '0.82rem' } }}>
                        {loc.subtitle}
                      </Typography>
                      <Typography className="location-card__address" sx={{ fontSize: { xs: '0.88rem', sm: '0.78rem' } }}>
                        {loc.address}
                      </Typography>
                      <Box className="location-card__cta">
                        <OpenInNewIcon fontSize="inherit" />
                        <span>Ver no Maps</span>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

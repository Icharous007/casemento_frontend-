import { useQuery } from '@tanstack/react-query';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { listGuests } from '../../api/adminGuestsApi';
import { getRsvpSummary, listRsvps } from '../../api/adminRsvpApi';

function StatCard({
  label, value, icon, color,
}: Readonly<{ label: string; value: number | string; icon: React.ReactNode; color: 'primary' | 'secondary' | 'info' | 'warning' | 'error' }>) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.dark`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const guestsQuery = useQuery({ queryKey: ['admin', 'guests'], queryFn: () => listGuests({ pageSize: 1 }) });
  const rsvpQuery = useQuery({ queryKey: ['admin', 'rsvps'], queryFn: () => listRsvps() });
  const summaryQuery = useQuery({ queryKey: ['admin', 'rsvp-summary'], queryFn: () => getRsvpSummary() });

  const summary = summaryQuery.data;
  const totalGuests = summary?.totalGuests ?? '—';
  const attending = summary?.attending ?? '—';
  const declined = summary?.declined ?? '—';
  const pending = summary?.pending ?? '—';

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3 }}>
        Dashboard
      </Typography>

      {(guestsQuery.isLoading || rsvpQuery.isLoading || summaryQuery.isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total de convidados" value={totalGuests} icon={<PeopleIcon />} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Confirmados" value={attending} icon={<HowToRegIcon />} color="secondary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Recusados" value={declined} icon={<DoNotDisturbIcon />} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Pendentes" value={pending} icon={<HourglassEmptyIcon />} color="info" />
        </Grid>
      </Grid>

      {summary && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
          <Chip label={`Adultos confirmados: ${summary.attendingAdults}`} color="primary" />
          <Chip label={`Crianças confirmadas: ${summary.attendingChildren}`} color="secondary" />
          <Chip label={`Com restrições: ${summary.withDietaryRestrictions}`} />
          <Chip label={`Com alergias: ${summary.withAllergies}`} />
        </Box>
      )}

      {rsvpQuery.data && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Confirmações recentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {rsvpQuery.data.items.slice(0, 10).map((r) => (
              <Chip
                key={r.guestId}
                label={r.attendanceStatus === 'ATTENDING' ? '✓ Confirmado' : '✗ Recusado'}
                color={r.attendanceStatus === 'ATTENDING' ? 'primary' : 'secondary'}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { listGuests } from '../../api/adminGuestsApi';
import { listRsvps } from '../../api/adminRsvpApi';

function StatCard({
  label, value, icon, color,
}: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: `${color}20`,
              color,
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

  const totalGuests = guestsQuery.data?.total ?? '—';
  const attending = rsvpQuery.data?.summary.attending ?? '—';
  const declined = rsvpQuery.data?.summary.declined ?? '—';
  const pending = (typeof totalGuests === 'number' && typeof attending === 'number' && typeof declined === 'number')
    ? totalGuests - attending - declined
    : '—';

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3 }}>
        Dashboard
      </Typography>

      {(guestsQuery.isLoading || rsvpQuery.isLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total de convidados" value={totalGuests} icon={<PeopleIcon />} color="#c8a2c8" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Confirmados" value={attending} icon={<HowToRegIcon />} color="#4caf50" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Recusados" value={declined} icon={<DoNotDisturbIcon />} color="#f44336" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Pendentes" value={pending} icon={<HourglassEmptyIcon />} color="#ff9800" />
        </Grid>
      </Grid>

      {rsvpQuery.data && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Confirmações recentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {rsvpQuery.data.items.slice(0, 10).map((r) => (
              <Chip
                key={r.guestId}
                label={r.attendanceStatus === 'ATTENDING' ? '✓ Confirmado' : '✗ Recusado'}
                color={r.attendanceStatus === 'ATTENDING' ? 'success' : 'error'}
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

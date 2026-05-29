import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, CircularProgress,
} from '@mui/material';
import { listRsvps } from '../../api/adminRsvpApi';
import { listGuests } from '../../api/adminGuestsApi';

export default function AdminRsvpPage() {
  const rsvpQuery = useQuery({ queryKey: ['admin', 'rsvps'], queryFn: () => listRsvps() });
  const guestsQuery = useQuery({ queryKey: ['admin', 'guests', 'total'], queryFn: () => listGuests({ pageSize: 1 }) });

  const summary = rsvpQuery.data?.summary;
  const total = guestsQuery.data?.total ?? 0;
  const responded = (summary?.attending ?? 0) + (summary?.declined ?? 0);
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  const attendingPct = responded > 0 ? Math.round(((summary?.attending ?? 0) / responded) * 100) : 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3 }}>
        Confirmações de Presença (RSVP)
      </Typography>

      {rsvpQuery.isLoading && <CircularProgress />}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="success.main">
              {summary?.attending ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">Confirmados</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="error.main">
              {summary?.declined ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">Recusados</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="warning.main">
              {total - responded}
            </Typography>
            <Typography variant="body2" color="text.secondary">Sem resposta</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card elevation={1} sx={{ mb: 4, p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Taxa de resposta: {responseRate}% ({responded}/{total})
        </Typography>
        <LinearProgress variant="determinate" value={responseRate} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Confirmados entre respondidos: {attendingPct}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={attendingPct}
          color="success"
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Card>

      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Convidado (ID)</TableCell>
              <TableCell>Resposta</TableCell>
              <TableCell>Respondido em</TableCell>
              <TableCell>Atualizado em</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rsvpQuery.data?.items.map((r) => (
              <TableRow key={r.guestId} hover>
                <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{r.guestId}</TableCell>
                <TableCell>
                  <Chip
                    label={r.attendanceStatus === 'ATTENDING' ? 'Confirmado' : 'Recusado'}
                    color={r.attendanceStatus === 'ATTENDING' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(r.respondedAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{new Date(r.lastChangedAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
            {!rsvpQuery.isLoading && !rsvpQuery.data?.items.length && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Nenhuma confirmação registrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

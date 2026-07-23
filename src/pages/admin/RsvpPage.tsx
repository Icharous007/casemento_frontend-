import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, CircularProgress, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Select, MenuItem, TextField, FormControl, InputLabel, Stack,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { listRsvps, overrideRsvp } from '../../api/adminRsvpApi';
import { listGuests } from '../../api/adminGuestsApi';

export default function AdminRsvpPage() {
  const qc = useQueryClient();
  const rsvpQuery = useQuery({ queryKey: ['admin', 'rsvps'], queryFn: () => listRsvps() });
  const guestsQuery = useQuery({ queryKey: ['admin', 'guests', 'all'], queryFn: () => listGuests({ pageSize: 1000 }) });

  // Build a guestId → name map
  const guestNameMap = new Map<string, string>(
    (guestsQuery.data?.items ?? []).map((g) => [g.id, g.name])
  );

  const summary = rsvpQuery.data?.summary;
  const total = guestsQuery.data?.total ?? 0;
  const responded = (summary?.attending ?? 0) + (summary?.declined ?? 0);
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  const attendingPct = responded > 0 ? Math.round(((summary?.attending ?? 0) / responded) * 100) : 0;

  // Override dialog state
  const [overrideTarget, setOverrideTarget] = useState<{ guestId: string; name: string; currentStatus: string } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('ATTENDING');
  const [overrideDietary, setOverrideDietary] = useState('');
  const [overrideAllergies, setOverrideAllergies] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const overrideMut = useMutation({
    mutationFn: () => overrideRsvp(overrideTarget?.guestId ?? '', {
      attendanceStatus: overrideStatus,
      dietaryRestrictions: overrideDietary || undefined,
      allergies: overrideAllergies || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'rsvps'] });
      setOverrideTarget(null);
    },
    onError: (err: any) => setOverrideError(err?.response?.data?.message ?? 'Erro ao alterar confirmação.'),
  });

  function openOverride(guestId: string, currentStatus: string) {
    setOverrideStatus(currentStatus);
    setOverrideDietary('');
    setOverrideAllergies('');
    setOverrideError('');
    setOverrideTarget({ guestId, name: guestNameMap.get(guestId) ?? guestId, currentStatus });
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3 }}>
        Confirmações de Presença (RSVP)
      </Typography>

      {rsvpQuery.isLoading && <CircularProgress />}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="primary.main">
              {summary?.attending ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">Confirmados</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="secondary.main">
              {summary?.declined ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">Recusados</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }} elevation={2}>
          <CardContent>
            <Typography variant="h3" sx={{ fontWeight: 600 }} color="info.main">
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
          color="primary"
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Card>

      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Convidado</TableCell>
              <TableCell>Resposta</TableCell>
              <TableCell>Respondido em</TableCell>
              <TableCell>Atualizado em</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rsvpQuery.data?.items.map((r) => (
              <TableRow key={r.guestId} hover>
                <TableCell>
                  <Typography variant="body2">
                    {guestNameMap.get(r.guestId) ?? r.guestId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.attendanceStatus === 'ATTENDING' ? 'Confirmado' : 'Recusado'}
                    color={r.attendanceStatus === 'ATTENDING' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(r.respondedAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{new Date(r.lastChangedAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Alterar confirmação">
                    <IconButton size="small" onClick={() => openOverride(r.guestId, r.attendanceStatus)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!rsvpQuery.isLoading && !rsvpQuery.data?.items.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Nenhuma confirmação registrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Override dialog */}
      <Dialog open={!!overrideTarget} onClose={() => setOverrideTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Alterar confirmação</DialogTitle>
        <DialogContent>
          {overrideError && <Alert severity="error" sx={{ mb: 2 }}>{overrideError}</Alert>}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Convidado: <strong>{overrideTarget?.name}</strong>
          </Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Resposta</InputLabel>
              <Select
                value={overrideStatus}
                label="Resposta"
                onChange={(e) => setOverrideStatus(e.target.value)}
              >
                <MenuItem value="ATTENDING">Confirmado</MenuItem>
                <MenuItem value="DECLINED">Recusado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Restrições alimentares"
              size="small"
              fullWidth
              value={overrideDietary}
              onChange={(e) => setOverrideDietary(e.target.value)}
            />
            <TextField
              label="Alergias"
              size="small"
              fullWidth
              value={overrideAllergies}
              onChange={(e) => setOverrideAllergies(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideTarget(null)} disabled={overrideMut.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => overrideMut.mutate()}
            disabled={overrideMut.isPending}
          >
            {overrideMut.isPending ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

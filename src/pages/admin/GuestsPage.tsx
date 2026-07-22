import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Pagination, Tooltip, Stack, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import {
  listGuests, createGuest, deleteGuest, blockGuest, importGuestsFile,
  getQrCodesExportUrl, getEventQrCodeUrl,
} from '../../api/adminGuestsApi';

const PAGE_SIZE = 20;

const statusColor: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  INVITED: 'default',
  ACTIVE: 'success',
  BLOCKED: 'error',
};

const rsvpColor: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  ATTENDING: 'success',
  DECLINED: 'error',
  PENDING: 'warning',
};

export default function GuestsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'guests', page, search],
    queryFn: () => listGuests({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });

  const createMut = useMutation({
    mutationFn: () => createGuest({ displayName: newName, phone: newPhone || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'guests'] });
      setCreateOpen(false);
      setNewName('');
      setNewPhone('');
      setCreateError('');
    },
    onError: (err: any) => setCreateError(err?.response?.data?.message ?? 'Erro ao criar convidado.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGuest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'guests'] }),
  });

  const blockMut = useMutation({
    mutationFn: (id: string) => blockGuest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'guests'] }),
  });

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importGuestsFile(file);
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['admin', 'guests'] });
    } catch {
      setImportResult({ imported: 0, errors: [{ reason: 'Erro ao enviar arquivo.' }] });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Convidados</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>
            Importar CSV/Excel
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleImport} />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            href={getQrCodesExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Exportar QR
          </Button>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            href={getEventQrCodeUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            QR do evento
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Novo convidado
          </Button>
        </Stack>
      </Stack>

      {importResult && (
        <Alert
          severity={importResult.errors.length > 0 ? 'warning' : 'success'}
          onClose={() => setImportResult(null)}
          sx={{ mb: 2 }}
        >
          {importResult.imported} importados.
          {importResult.errors.length > 0 && ` ${importResult.errors.length} erros.`}
          {' '}Formato esperado: nome, telefone.
        </Alert>
      )}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nome..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" size="small"><SearchIcon /></IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>RSVP</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            )}
            {data?.items.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.phone ?? '—'}</TableCell>
                <TableCell>
                  <Chip label={g.status} color={statusColor[g.status] ?? 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={g.rsvpStatus} color={rsvpColor[g.rsvpStatus] ?? 'default'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver QR code do evento">
                    <IconButton
                      size="small"
                      onClick={() => {
                        window.open(getEventQrCodeUrl(), '_blank');
                      }}
                    >
                      <QrCodeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Bloquear">
                    <IconButton size="small" onClick={() => blockMut.mutate(g.id)} color="warning">
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton size="small" onClick={() => deleteMut.mutate(g.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !data?.items.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Nenhum convidado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo convidado</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            label="Nome *"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            autoFocus
          />
          <TextField
            label="Telefone (opcional)"
            type="tel"
            fullWidth
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => createMut.mutate()}
            disabled={!newName.trim() || createMut.isPending}
          >
            {createMut.isPending ? <CircularProgress size={20} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

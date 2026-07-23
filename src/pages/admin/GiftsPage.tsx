import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Stack, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import {
  adminListGifts,
  adminCreateGift,
  adminUpdateGift,
  adminDeleteGift,
  adminUnmarkGiftPurchased,
  type GiftItemAdmin,
  type CreateGiftRequest,
} from '../../api/giftsApi';

const PAGE_SIZE = 20;

const emptyForm: CreateGiftRequest = {
  title: '',
  description: '',
  externalUrl: '',
  imageUrl: '',
  priceRange: '',
  displayOrder: 0,
};

export default function AdminGiftsPage() {
  const qc = useQueryClient();
  const [page] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<GiftItemAdmin | null>(null);
  const [form, setForm] = useState<CreateGiftRequest>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GiftItemAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'gifts', page],
    queryFn: () => adminListGifts({ page, pageSize: PAGE_SIZE }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'gifts'] });

  const createMut = useMutation({
    mutationFn: () => adminCreateGift(form),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Erro ao salvar.'),
  });

  const updateMut = useMutation({
    mutationFn: () => adminUpdateGift(editItem?.id ?? '', form),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: any) => setFormError(err?.response?.data?.message ?? 'Erro ao salvar.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteGift(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const unmarkMut = useMutation({
    mutationFn: (id: string) => adminUnmarkGiftPurchased(id),
    onSuccess: () => invalidate(),
  });

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(item: GiftItemAdmin) {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      externalUrl: item.externalUrl ?? '',
      imageUrl: item.imageUrl ?? '',
      priceRange: item.priceRange ?? '',
      displayOrder: item.displayOrder,
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditItem(null);
    setForm(emptyForm);
    setFormError('');
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Lista de Presentes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Novo Presente
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Faixa de Preço</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Comprado por</TableCell>
                <TableCell>Ordem</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                      Nenhum presente cadastrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {(data?.items ?? []).map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.title}</Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {item.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{item.priceRange ?? '—'}</TableCell>
                  <TableCell>
                    {(() => {
                      let giftStatusLabel = 'Indisponível';
                      let giftStatusColor: 'default' | 'primary' | 'secondary' = 'secondary';
                      if (item.status === 'AVAILABLE') {
                        giftStatusLabel = 'Disponível';
                        giftStatusColor = 'primary';
                      } else if (item.status === 'PURCHASED') {
                        giftStatusLabel = 'Comprado';
                      }
                      return <Chip size="small" label={giftStatusLabel} color={giftStatusColor} />;
                    })()}
                  </TableCell>
                  <TableCell>
                    {item.purchasedBy?.name ? (
                      <Box>
                        <Typography variant="body2">{item.purchasedBy.name}</Typography>
                        {item.purchasedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.purchasedAt).toLocaleDateString('pt-BR')}
                          </Typography>
                        )}
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{item.displayOrder}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      {item.status === 'PURCHASED' && (
                        <Tooltip title="Desfazer compra">
                          <IconButton size="small" onClick={() => unmarkMut.mutate(item.id)}>
                            <UndoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem ? 'Editar Presente' : 'Novo Presente'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Título *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <TextField
              label="Faixa de preço (ex: R$ 100–200)"
              value={form.priceRange}
              onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Link externo do produto"
              value={form.externalUrl}
              onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
              fullWidth
              size="small"
              type="url"
            />
            <TextField
              label="URL da imagem"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              fullWidth
              size="small"
              type="url"
            />
            <TextField
              label="Ordem de exibição"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              fullWidth
              size="small"
              type="number"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={saving || !form.title.trim()}
            onClick={() => editItem ? updateMut.mutate() : createMut.mutate()}
          >
            {saving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir presente</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja excluir <strong>{deleteTarget?.title}</strong>? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMut.isPending}
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
          >
            {deleteMut.isPending ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

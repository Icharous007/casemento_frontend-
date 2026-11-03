import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Stack, Tooltip, Tabs, Tab, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  adminListGifts,
  adminCreateGift,
  adminUpdateGift,
  adminDeleteGift,
  adminUnmarkGiftPurchased,
  getPixSettings,
  updatePixSettings,
  type GiftItemAdmin,
  type CreateGiftRequest,
  type GiftCategory,
  type PixSettings,
} from '../../api/giftsApi';
import { getApiErrorData } from '../../utils/apiError';

const PAGE_SIZE = 20;

const emptyForm: CreateGiftRequest = {
  title: '',
  description: '',
  externalUrl: '',
  imageUrl: '',
  priceRange: '',
  displayOrder: 0,
  category: 'WEDDING',
  priceAmount: null,
};

export default function AdminGiftsPage() {
  const qc = useQueryClient();
  const [page] = useState(1);
  const [category, setCategory] = useState<GiftCategory>('WEDDING');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<GiftItemAdmin | null>(null);
  const [form, setForm] = useState<CreateGiftRequest>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GiftItemAdmin | null>(null);
  const [pixSettingsOpen, setPixSettingsOpen] = useState(false);
  const [pixForm, setPixForm] = useState<PixSettings>({ pixKey: '00115205152', pixKeyType: 'CPF', merchantName: '', merchantCity: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'gifts', page, category],
    queryFn: () => adminListGifts({ page, pageSize: PAGE_SIZE, category }),
  });

  const pixSettingsQuery = useQuery({ queryKey: ['admin', 'pix-settings'], queryFn: getPixSettings });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'gifts'] });

  const createMut = useMutation({
    mutationFn: () => adminCreateGift(form),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: unknown) => setFormError(getApiErrorData(err).message ?? 'Erro ao salvar.'),
  });

  const updateMut = useMutation({
    mutationFn: () => adminUpdateGift(editItem?.id ?? '', { ...form, clearPriceAmount: form.priceAmount == null }),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: unknown) => setFormError(getApiErrorData(err).message ?? 'Erro ao salvar.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteGift(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const unmarkMut = useMutation({
    mutationFn: (id: string) => adminUnmarkGiftPurchased(id),
    onSuccess: () => invalidate(),
  });

  const pixSettingsMut = useMutation({
    mutationFn: () => updatePixSettings(pixForm),
    onSuccess: (settings) => {
      qc.setQueryData(['admin', 'pix-settings'], settings);
      setPixSettingsOpen(false);
    },
  });

  function openCreate() {
    setEditItem(null);
    setForm({ ...emptyForm, category });
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
      category: item.category,
      priceAmount: item.priceAmount ?? null,
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditItem(null);
    setForm({ ...emptyForm, category });
    setFormError('');
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Lista de Presentes</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => {
            setPixForm(pixSettingsQuery.data ?? { pixKey: '00115205152', pixKeyType: 'CPF', merchantName: '', merchantCity: '' });
            setPixSettingsOpen(true);
          }}>
            Chave PIX
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Novo Presente</Button>
        </Stack>
      </Stack>

      <Tabs value={category} onChange={(_, value: GiftCategory) => setCategory(value)} sx={{ mb: 2 }}>
        <Tab value="WEDDING" label="Casamento" />
        <Tab value="BRIDAL_SHOWER" label="Chá de Panela" />
      </Tabs>

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
                <TableCell>Contribuições</TableCell>
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
                  <TableCell>{item.priceAmount != null ? item.priceAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : item.priceRange ?? '—'}</TableCell>
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
                    {item.contributions?.length ? (
                      <Stack spacing={0.4}>
                        {item.contributions.map((contribution) => (
                          <Typography variant="caption" key={contribution.id}>
                            {contribution.giverName} · {new Date(contribution.purchasedAt).toLocaleDateString('pt-BR')}
                            {contribution.paymentMethod === 'PIX' ? ' · Pix informado' : ''}
                          </Typography>
                        ))}
                      </Stack>
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
              label="Valor exato para Pix (R$)"
              value={form.priceAmount ?? ''}
              onChange={(e) => setForm({ ...form, priceAmount: e.target.value === '' ? null : Number(e.target.value) })}
              fullWidth
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              helperText="Opcional. Ao preencher, o presente terá QR Code e Pix Copia e Cola."
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

      <Dialog open={pixSettingsOpen} onClose={() => setPixSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Recebimento por Pix</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Tipo de chave" value={pixForm.pixKeyType}
              onChange={(e) => setPixForm({ ...pixForm, pixKeyType: e.target.value as PixSettings['pixKeyType'] })}
              fullWidth size="small"
            >
              {['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </TextField>
            <TextField label="Chave Pix" value={pixForm.pixKey} onChange={(e) => setPixForm({ ...pixForm, pixKey: e.target.value })} fullWidth size="small" />
            <TextField label="Nome do recebedor (máx. 25 caracteres)" value={pixForm.merchantName ?? ''} onChange={(e) => setPixForm({ ...pixForm, merchantName: e.target.value })} fullWidth size="small" />
            <TextField label="Cidade do recebedor (obrigatória)" value={pixForm.merchantCity ?? ''} onChange={(e) => setPixForm({ ...pixForm, merchantCity: e.target.value })} fullWidth size="small" />
            <Alert severity="info">A chave informada é exibida aos convidados no QR Code e no Pix Copia e Cola. O site não confirma automaticamente se o pagamento foi concluído.</Alert>
            {pixSettingsMut.isError && <Alert severity="error">Não foi possível salvar as configurações do Pix.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPixSettingsOpen(false)} disabled={pixSettingsMut.isPending}>Cancelar</Button>
          <Button variant="contained" disabled={pixSettingsMut.isPending || !pixForm.pixKey.trim() || !pixForm.merchantCity?.trim()} onClick={() => pixSettingsMut.mutate()}>
            {pixSettingsMut.isPending ? <CircularProgress size={20} /> : 'Salvar'}
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

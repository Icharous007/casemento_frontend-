import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, CardMedia, CardActions,
  Button, Chip, CircularProgress, Alert, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GuestLayout from './GuestLayout';
import { listGifts, markGiftPurchased, type GiftItem } from '../../api/giftsApi';

export default function GiftsPage() {
  const qc = useQueryClient();
  const [confirmItem, setConfirmItem] = useState<GiftItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'gifts'],
    queryFn: listGifts,
  });

  const markMut = useMutation({
    mutationFn: (giftId: string) => markGiftPurchased(giftId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'gifts'] });
      setConfirmItem(null);
      setErrorMsg('');
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      setErrorMsg(
        code === 'GIFT_ALREADY_PURCHASED'
          ? 'Este presente já foi marcado como comprado por outro convidado.'
          : 'Não foi possível registrar a compra. Tente novamente.'
      );
    },
  });

  if (isLoading) {
    return (
      <GuestLayout>
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      </GuestLayout>
    );
  }

  if (isError || !data) {
    return (
      <GuestLayout>
        <Alert severity="error">Não foi possível carregar a lista de presentes.</Alert>
      </GuestLayout>
    );
  }

  const items = data.items;

  return (
    <GuestLayout title="Lista de Presentes">
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, textAlign: 'center', mb: 0.5 }}>
        Lista de Presentes 🎁
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        Escolha um presente e marque como comprado para reservar.
      </Typography>

      {items.length === 0 && (
        <Alert severity="info">Nenhum presente cadastrado ainda.</Alert>
      )}

      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
            <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {item.imageUrl && (
                <CardMedia
                  component="img"
                  height="190"
                  image={item.imageUrl}
                  alt={item.title}
                  sx={{
                    objectFit: 'contain',
                    objectPosition: 'center',
                    bgcolor: 'grey.100',
                    p: 1.5,
                  }}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {item.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={item.status === 'AVAILABLE' ? 'Disponível' : 'Comprado'}
                    color={item.status === 'AVAILABLE' ? 'success' : 'default'}
                    icon={item.status === 'PURCHASED' ? <CheckCircleIcon /> : undefined}
                  />
                </Box>
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                )}
                {item.priceRange && (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                    {item.priceRange}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                {item.externalUrl && (
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<OpenInNewIcon />}
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver produto
                  </Button>
                )}
                {item.status === 'AVAILABLE' && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ShoppingBagIcon />}
                    onClick={() => { setConfirmItem(item); setErrorMsg(''); }}
                  >
                    Vou presentear
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Confirm dialog */}
      <Dialog open={!!confirmItem} onClose={() => setConfirmItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar presente</DialogTitle>
        <DialogContent>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          <Typography variant="body1">
            Deseja marcar <strong>{confirmItem?.title}</strong> como comprado?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Ao confirmar, o presente ficará reservado para você e não aparecerá disponível para outros convidados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmItem(null)} disabled={markMut.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => confirmItem && markMut.mutate(confirmItem.id)}
            disabled={markMut.isPending}
          >
            {markMut.isPending ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </GuestLayout>
  );
}

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import type { GiftItem, PixContributionRequest, PixPaymentResponse } from '../api/giftsApi';

type Props = {
  open: boolean;
  item: GiftItem | null;
  onClose: () => void;
  loadPayment: (giftId: string) => Promise<PixPaymentResponse>;
  reportPayment: (giftId: string, body: PixContributionRequest) => Promise<void>;
  initialName?: string;
};

const currency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PixPaymentDialog({
  open, item, onClose, loadPayment, reportPayment, initialName = '',
}: Props) {
  const [giverName, setGiverName] = useState(initialName);
  const [giverPhone, setGiverPhone] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pixQuery = useQuery({
    queryKey: ['gift-pix', item?.id],
    queryFn: () => loadPayment(item!.id),
    enabled: open && !!item && !!item.priceAmount,
  });

  const contributionMutation = useMutation({
    mutationFn: () => reportPayment(item!.id, { giverName: giverName.trim(), giverPhone: giverPhone.trim(), message: message.trim() || undefined }),
    onSuccess: () => setSubmitted(true),
  });

  async function copyPix() {
    if (!pixQuery.data) return;
    try {
      await navigator.clipboard.writeText(pixQuery.data.payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function sharePix() {
    if (!pixQuery.data || !navigator.share) return;
    await navigator.share({ title: `Pix para ${pixQuery.data.title}`, text: pixQuery.data.payload });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Presentear com Pix</DialogTitle>
      <DialogContent>
        {submitted ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Obrigado pelo carinho! Registramos seu aviso de pagamento. A transferência não é confirmada automaticamente pelo site.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {item && <Typography variant="subtitle1">{item.title} · {currency(item.priceAmount ?? 0)}</Typography>}
            {pixQuery.isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>}
            {pixQuery.isError && <Alert severity="error">Não foi possível gerar o Pix. Confira as configurações de recebimento com os anfitriões.</Alert>}
            {pixQuery.data && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: 2, alignItems: 'center' }}>
                <Box component="img"
                  src={`data:image/png;base64,${pixQuery.data.qrCodeBase64}`}
                  alt="QR Code Pix"
                  sx={{ width: 180, maxWidth: '100%', justifySelf: 'center', imageRendering: 'pixelated' }}
                />
                <Stack spacing={1}>
                  <Typography variant="body2">Recebedor: {pixQuery.data.receiverName}</Typography>
                  <Typography variant="body2">Chave {pixQuery.data.pixKeyType}: {pixQuery.data.pixKey}</Typography>
                  <TextField
                    label="Pix Copia e Cola"
                    value={pixQuery.data.payload}
                    multiline
                    minRows={3}
                    fullWidth
                    slotProps={{ input: { readOnly: true } }}
                    size="small"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<ContentCopyIcon />} onClick={copyPix} variant="outlined">
                      {copied ? 'Copiado' : 'Copiar código'}
                    </Button>
                    {typeof navigator !== 'undefined' && !!navigator.share && (
                      <Button startIcon={<ShareIcon />} onClick={sharePix} variant="outlined">Compartilhar</Button>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    No celular, use o Pix Copia e Cola no app do seu banco. Em outra tela, escaneie o QR Code. Confira o recebedor e o valor antes de pagar.
                  </Typography>
                </Stack>
              </Box>
            )}
            <TextField label="Seu nome" value={giverName} onChange={(event) => setGiverName(event.target.value)} required fullWidth />
            <TextField label="WhatsApp" value={giverPhone} onChange={(event) => setGiverPhone(event.target.value)} required fullWidth inputMode="tel" />
            <TextField label="Recado (opcional)" value={message} onChange={(event) => setMessage(event.target.value)} fullWidth multiline minRows={2} />
            <Alert severity="info">Ao confirmar, você apenas informa que fez o Pix; não recebemos confirmação automática do banco.</Alert>
            {contributionMutation.isError && <Alert severity="error">Não foi possível registrar seu aviso. Tente novamente.</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{submitted ? 'Fechar' : 'Cancelar'}</Button>
        {!submitted && (
          <Button
            variant="contained"
            disabled={!pixQuery.data || !giverName.trim() || !giverPhone.trim() || contributionMutation.isPending}
            onClick={() => contributionMutation.mutate()}
            startIcon={contributionMutation.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            Já fiz o Pix
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

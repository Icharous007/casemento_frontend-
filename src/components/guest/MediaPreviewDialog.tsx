import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import { formatFileSize, isPhotoFile, isVideoFile } from '../../utils/mediaFile';

type Props = Readonly<{
  file: File | null;
  uploading: boolean;
  uploadProgress: number | null;
  onDiscard: () => void;
  onPreviewRenderFailed: () => void;
  onPublish: () => void;
  caption: string;
  onCaptionChange: (caption: string) => void;
}>;

export default function MediaPreviewDialog({
  file, uploading, uploadProgress, onDiscard, onPreviewRenderFailed, onPublish,
  caption, onCaptionChange,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const photo = file ? isPhotoFile(file) : false;
  const video = file ? isVideoFile(file) : false;
  const previewFailed = !!previewUrl && failedSrc === previewUrl;

  return (
    <Dialog
      open={!!file}
      onClose={uploading ? undefined : onDiscard}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Publicar na galeria</DialogTitle>
      <DialogContent>
        {previewUrl && photo && !previewFailed && (
          <Box
            component="img"
            src={previewUrl}
            alt="Prévia da foto"
            onError={() => {
              setFailedSrc(previewUrl);
              onPreviewRenderFailed();
            }}
            sx={{
              display: 'block',
              width: '100%',
              maxHeight: 360,
              objectFit: 'contain',
              borderRadius: 2,
              bgcolor: 'rgba(181, 154, 199, 0.12)',
            }}
          />
        )}
        {previewUrl && video && (
          <Box
            component="video"
            src={previewUrl}
            controls
            playsInline
            onError={onPreviewRenderFailed}
            sx={{
              display: 'block',
              width: '100%',
              maxHeight: 360,
              borderRadius: 2,
              bgcolor: '#1a1224',
            }}
          />
        )}
        {photo && previewFailed && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Não foi possível mostrar a prévia neste navegador. A foto ainda pode ser enviada.
          </Typography>
        )}
        {file && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {file.name} · {formatFileSize(file.size)}
          </Typography>
        )}
        <TextField
          label="Legenda (opcional)"
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          disabled={uploading}
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${caption.length}/500`}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onDiscard} disabled={uploading}>Descartar</Button>
        <Button variant="contained" onClick={onPublish} disabled={uploading || !file}>
          {uploading
            ? <>{uploadProgress == null ? <CircularProgress size={18} color="inherit" /> : `Enviando ${uploadProgress}%`}</>
            : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

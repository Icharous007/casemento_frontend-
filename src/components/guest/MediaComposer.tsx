import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { uploadMedia } from '../../api/mediaApi';
import { prepareMediaFile, uploadErrorMessage, validateMediaFile } from '../../utils/mediaFile';
import MediaCaptureBar from './MediaCaptureBar';
import MediaPreviewDialog from './MediaPreviewDialog';

export default function MediaComposer() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFile(file: File) {
    setError('');
    const prepared = prepareMediaFile(file);
    const message = validateMediaFile(prepared);
    if (message) {
      setPending(null);
      setError(message);
      return;
    }
    setPending(prepared);
  }

  async function handlePublish() {
    if (!pending) return;
    setUploading(true);
    setError('');
    try {
      await uploadMedia(pending);
      qc.invalidateQueries({ queryKey: ['guest', 'media'] });
      setPending(null);
    } catch (err) {
      setError(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <MediaCaptureBar disabled={uploading} onFile={handleFile} />
      <MediaPreviewDialog
        file={pending}
        uploading={uploading}
        onDiscard={() => setPending(null)}
        onPublish={() => { void handlePublish(); }}
      />
    </Box>
  );
}

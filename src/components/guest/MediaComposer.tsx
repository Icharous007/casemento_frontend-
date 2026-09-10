import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { uploadMedia } from '../../api/mediaApi';
import {
  compressImage,
  inferMediaContentType,
  isPhotoFile,
  isVideoFile,
  prepareMediaFile,
  uploadErrorMessage,
  validateMediaFile,
  validateVideoDuration,
} from '../../utils/mediaFile';
import MediaCaptureBar from './MediaCaptureBar';
import MediaPreviewDialog from './MediaPreviewDialog';
import {
  classifyMediaError,
  elapsedSince,
  logMediaEvent,
  mediaTypeFromMime,
  type MediaAttempt,
} from '../../utils/mediaTelemetry';

export default function MediaComposer() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [pending, setPending] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [pendingAttempt, setPendingAttempt] = useState<MediaAttempt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  async function handleFile(file: File, attempt: MediaAttempt) {
    setError('');
    setCaption('');
    let prepared = prepareMediaFile(file);
    const contentType = inferMediaContentType(prepared);
    const mediaType = mediaTypeFromMime(contentType);
    logMediaEvent('guest_media_file_selected', attempt, {
      mediaType,
      contentType,
      sizeBytes: prepared.size,
      extension: prepared.name.split('.').pop()?.toLowerCase() || undefined,
    });
    if (isVideoFile(prepared)) {
      const durationMessage = await validateVideoDuration(prepared);
      if (durationMessage) {
        setPending(null);
        setPendingAttempt(null);
        setError(durationMessage);
        logMediaEvent('guest_media_validation_failed', attempt, {
          reason: 'video_too_long',
          mediaType,
          contentType,
          sizeBytes: prepared.size,
        });
        return;
      }
    } else if (isPhotoFile(prepared)) {
      prepared = await compressImage(prepared);
    }
    const finalContentType = inferMediaContentType(prepared);
    const message = validateMediaFile(prepared);
    if (message) {
      setPending(null);
      setPendingAttempt(null);
      setError(message);
      logMediaEvent('guest_media_validation_failed', attempt, {
        reason: !isPhotoFile(prepared) && !prepared.type.startsWith('video/')
          ? 'unsupported_type'
          : mediaType === 'photo' ? 'photo_too_large' : 'video_too_large',
        mediaType,
        contentType: finalContentType,
        sizeBytes: prepared.size,
      });
      return;
    }
    setPending(prepared);
    setCaption('');
    setPendingAttempt(attempt);
    logMediaEvent('guest_media_preview_opened', attempt, {
      mediaType,
      contentType: finalContentType,
      sizeBytes: prepared.size,
    });
  }

  async function handlePublish() {
    if (!pending || !pendingAttempt) return;
    const startedAt = performance.now();
    const contentType = inferMediaContentType(pending);
    const mediaType = mediaTypeFromMime(contentType);
    setUploading(true);
    setUploadProgress(0);
    setError('');
    logMediaEvent('guest_media_upload_started', pendingAttempt, {
      mediaType,
      contentType,
      sizeBytes: pending.size,
    });
    try {
      await uploadMedia(pending, pendingAttempt.attemptId, caption, setUploadProgress);
      qc.invalidateQueries({ queryKey: ['guest', 'media'] });
      logMediaEvent('guest_media_upload_succeeded', pendingAttempt, {
        mediaType,
        contentType,
        sizeBytes: pending.size,
        elapsedMs: elapsedSince(startedAt),
      });
      setPending(null);
      setCaption('');
      setPendingAttempt(null);
    } catch (err) {
      setError(uploadErrorMessage(err));
      logMediaEvent('guest_media_upload_failed', pendingAttempt, {
        mediaType,
        contentType,
        sizeBytes: pending.size,
        elapsedMs: elapsedSince(startedAt),
        ...classifyMediaError(err),
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <MediaCaptureBar disabled={uploading} onFile={handleFile} />
      <MediaPreviewDialog
        file={pending}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onDiscard={() => {
          if (pendingAttempt && pending) {
            logMediaEvent('guest_media_discarded', pendingAttempt, {
              stage: 'preview',
              mediaType: mediaTypeFromMime(inferMediaContentType(pending)),
              sizeBytes: pending.size,
            });
          }
          setPending(null);
          setCaption('');
          setPendingAttempt(null);
        }}
        onPreviewRenderFailed={() => {
          if (pendingAttempt && pending) {
            logMediaEvent('guest_media_preview_render_failed', pendingAttempt, {
              mediaType: mediaTypeFromMime(inferMediaContentType(pending)),
              contentType: inferMediaContentType(pending),
              sizeBytes: pending.size,
            });
          }
        }}
        onPublish={() => { void handlePublish(); }}
        caption={caption}
        onCaptionChange={setCaption}
      />
    </Box>
  );
}

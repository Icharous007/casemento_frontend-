import { useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { ACCEPT_MEDIA, ACCEPT_VIDEO } from '../../utils/mediaFile';
import {
  createMediaAttempt,
  logMediaEvent,
  type MediaAttempt,
  type MediaCaptureSource,
} from '../../utils/mediaTelemetry';

type Props = Readonly<{
  disabled?: boolean;
  onFile: (file: File, attempt: MediaAttempt) => void;
}>;

type AttemptState = {
  attempt: MediaAttempt;
  startedAt: number;
  cleanupReturn?: () => void;
};

function pickFile(input: HTMLInputElement | null, onFile: Props['onFile'], state: AttemptState) {
  const file = input?.files?.[0];
  if (input) input.value = '';
  state.cleanupReturn?.();
  logMediaEvent('guest_media_native_returned', state.attempt, {
    outcome: file ? 'selected' : 'cancelled_or_unknown',
    hasFile: !!file,
    elapsedMs: Math.max(0, Math.round(performance.now() - state.startedAt)),
    visibilityState: document.visibilityState,
  });
  if (file) onFile(file, state.attempt);
}

export default function MediaCaptureBar({ disabled, onFile }: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const attemptsRef = useRef(new WeakMap<HTMLInputElement, AttemptState>());

  function openPicker(input: HTMLInputElement | null, source: MediaCaptureSource) {
    if (!input) return;
    const attempt = createMediaAttempt(source);
    const startedAt = performance.now();
    logMediaEvent('guest_media_capture_intent', attempt, {
      captureMode: source === 'gallery' ? 'file_picker' : 'native_camera',
      disabled: !!disabled,
      online: navigator.onLine,
    });
    const state: AttemptState = { attempt, startedAt };
    attemptsRef.current.set(input, state);
    if (source !== 'gallery') {
      let returned = false;
      const logReturn = () => {
        if (returned || performance.now() - startedAt < 300 || document.visibilityState !== 'visible') return;
        returned = true;
        logMediaEvent('guest_media_native_returned', attempt, {
          outcome: 'returned_to_browser',
          hasFile: false,
          elapsedMs: Math.max(0, Math.round(performance.now() - startedAt)),
          visibilityState: document.visibilityState,
        });
        state.cleanupReturn?.();
      };
      state.cleanupReturn = () => {
        window.removeEventListener('focus', logReturn);
        document.removeEventListener('visibilitychange', logReturn);
      };
      window.addEventListener('focus', logReturn);
      document.addEventListener('visibilitychange', logReturn);
    }
    input.click();
  }

  return (
    <Box>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const state = attemptsRef.current.get(event.currentTarget);
          if (state) pickFile(event.currentTarget, onFile, state);
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept={ACCEPT_VIDEO}
        capture="environment"
        hidden
        onChange={(event) => {
          const state = attemptsRef.current.get(event.currentTarget);
          if (state) pickFile(event.currentTarget, onFile, state);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT_MEDIA}
        hidden
        onChange={(event) => {
          const state = attemptsRef.current.get(event.currentTarget);
          if (state) pickFile(event.currentTarget, onFile, state);
        }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          startIcon={<PhotoCameraIcon />}
          onClick={() => openPicker(photoRef.current, 'photo')}
        >
          Fotografar
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            disabled={disabled}
            startIcon={<VideocamIcon />}
            onClick={() => openPicker(videoRef.current, 'video')}
          >
            Gravar vídeo
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
            MP4 · até 200 MB / 60s
          </Typography>
        </Box>
        <Button
          variant="outlined"
          fullWidth
          disabled={disabled}
          startIcon={<PhotoLibraryIcon />}
          onClick={() => openPicker(galleryRef.current, 'gallery')}
          sx={{ alignSelf: { sm: 'flex-start' } }}
        >
          Galeria
        </Button>
      </Stack>
    </Box>
  );
}

import { useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { ACCEPT_MEDIA } from '../../utils/mediaFile';

type Props = Readonly<{
  disabled?: boolean;
  onFile: (file: File) => void;
}>;

function pickFile(input: HTMLInputElement | null, onFile: (file: File) => void) {
  const file = input?.files?.[0];
  if (input) input.value = '';
  if (file) onFile(file);
}

export default function MediaCaptureBar({ disabled, onFile }: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => pickFile(event.currentTarget, onFile)}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(event) => pickFile(event.currentTarget, onFile)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT_MEDIA}
        hidden
        onChange={(event) => pickFile(event.currentTarget, onFile)}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          fullWidth
          disabled={disabled}
          startIcon={<PhotoCameraIcon />}
          onClick={() => photoRef.current?.click()}
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
            onClick={() => videoRef.current?.click()}
          >
            Gravar vídeo
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
            Até 50 MB
          </Typography>
        </Box>
        <Button
          variant="outlined"
          fullWidth
          disabled={disabled}
          startIcon={<PhotoLibraryIcon />}
          onClick={() => galleryRef.current?.click()}
          sx={{ alignSelf: { sm: 'flex-start' } }}
        >
          Galeria
        </Button>
      </Stack>
    </Box>
  );
}

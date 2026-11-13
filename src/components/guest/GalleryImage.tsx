import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import type { MediaItem } from '../../api/mediaApi';
import { createMediaAttempt, recordMediaError } from '../../utils/mediaTelemetry';

export default function GalleryImage({ item, viewer = false, onRetry }: {
  item: MediaItem;
  viewer?: boolean;
  onRetry: () => void;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const sources = [...new Set(viewer
    ? [item.displayUrl, item.thumbnailUrl, item.mediaType === 'PHOTO' ? item.url : null]
    : [item.thumbnailUrl, item.displayUrl, item.mediaType === 'PHOTO' ? item.url : null])]
    .filter((source): source is string => !!source);
  const src = sources.find((source) => !failedSources.includes(source));

  if (!src) {
    return (
      <Box
        role="status"
        sx={{
          position: viewer ? 'absolute' : 'relative',
          inset: viewer ? 0 : undefined,
          zIndex: viewer ? 2 : undefined,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', width: '100%', height: '100%',
          color: viewer ? '#fff' : 'text.secondary', textAlign: 'center', p: 1,
          pointerEvents: 'none',
        }}
      >
        <Typography variant={viewer ? 'body1' : 'caption'}>
          {item.mediaType === 'PHOTO'
            ? 'Não foi possível exibir esta foto.'
            : 'Prévia do vídeo indisponível.'}
        </Typography>
        <Button
          size="small"
          sx={{ color: 'inherit', pointerEvents: 'auto' }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setFailedSources([]);
            setRetry((current) => current + 1);
            onRetry();
          }}
        >
          Tentar novamente
        </Button>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      key={`${src}-${retry}`}
      src={src}
      alt={viewer ? 'Foto ampliada' : item.mediaType === 'PHOTO' ? 'foto' : 'pré-visualização do vídeo'}
      loading={viewer ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={viewer ? 'gallery-reel-media' : undefined}
      onError={() => {
        recordMediaError(createMediaAttempt('gallery'), 'gallery_image_render_failed', 'unknown', {
          mediaType: item.mediaType,
          contentType: item.contentType,
          errorMessage: `Image decode/load failed for ${viewer ? 'viewer' : 'grid'} preview`,
          retryable: true,
        });
        setFailedSources((current) => current.includes(src) ? current : [...current, src]);
      }}
      sx={viewer ? undefined : {
        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        transition: 'transform 220ms ease',
      }}
    />
  );
}

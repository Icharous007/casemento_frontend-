import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardMedia, CardActions,
  IconButton, Button, TextField, CircularProgress, Alert,
  Grid, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Divider, Chip,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import GuestLayout from './GuestLayout';
import {
  listMedia,
  uploadMedia,
  addMediaLike,
  removeMediaLike,
  addMediaComment,
  listMediaComments,
  type MediaItem,
} from '../../api/mediaApi';

const ACCEPTED_PHOTO = 'image/jpeg,image/png,image/heic';
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm';
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export default function GalleryPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [page] = useState(1);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'media', sort, page],
    queryFn: () => listMedia({ page, pageSize: 20, sort }),
  });

  const { data: dialogComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['guest', 'media', selectedMedia?.id, 'comments'],
    queryFn: () => listMediaComments(selectedMedia?.id ?? ''),
    enabled: !!selectedMedia,
  });

  const likeMut = useMutation({
    mutationFn: ({ mediaId, likedByMe }: { mediaId: string; likedByMe: boolean }) =>
      likedByMe ? removeMediaLike(mediaId) : addMediaLike(mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guest', 'media'] }),
  });

  const commentMut = useMutation({
    mutationFn: ({ mediaId, content }: { mediaId: string; content: string }) =>
      addMediaComment(mediaId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'media'] });
      qc.invalidateQueries({ queryKey: ['guest', 'media', selectedMedia?.id, 'comments'] });
      setCommentText('');
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadError('');

    const isPhoto = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isPhoto && !isVideo) {
      setUploadError('Tipo de arquivo não suportado. Use fotos (JPEG/PNG/HEIC) ou vídeos (MP4/MOV/WebM).');
      return;
    }
    if (isPhoto && file.size > MAX_PHOTO_BYTES) {
      setUploadError('Foto muito grande. Tamanho máximo: 10 MB.');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setUploadError('Vídeo muito grande. Tamanho máximo: 50 MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadMedia(file);
      qc.invalidateQueries({ queryKey: ['guest', 'media'] });
    } catch {
      setUploadError('Falha no envio. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

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
        <Alert severity="error">Não foi possível carregar a galeria.</Alert>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout title="Galeria">
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, textAlign: 'center', mb: 0.5 }}>
        Galeria de Fotos e Vídeos 📸
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        Compartilhe seus momentos especiais do evento!
      </Typography>

      {/* Upload */}
      <Box sx={{ mb: 3 }}>
        {uploadError && <Alert severity="error" sx={{ mb: 1 }}>{uploadError}</Alert>}
        <input
          ref={fileRef}
          type="file"
          accept={`${ACCEPTED_PHOTO},${ACCEPTED_VIDEO}`}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Button
          variant="contained"
          fullWidth
          startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Enviando...' : 'Enviar foto ou vídeo'}
        </Button>
      </Box>

      {/* Sort */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          label="Mais recentes"
          variant={sort === 'recent' ? 'filled' : 'outlined'}
          color="primary"
          onClick={() => setSort('recent')}
        />
        <Chip
          label="Mais curtidos"
          variant={sort === 'popular' ? 'filled' : 'outlined'}
          color="primary"
          onClick={() => setSort('popular')}
        />
      </Stack>

      {data.items.length === 0 && (
        <Alert severity="info">Nenhuma mídia publicada ainda. Seja o primeiro!</Alert>
      )}

      <Grid container spacing={2}>
        {data.items.map((item) => (
          <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
            <Card elevation={2}>
              {item.mediaType === 'PHOTO' ? (
                <CardMedia
                  component="img"
                  height="200"
                  image={item.thumbnailUrl ?? item.url}
                  alt="foto"
                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setSelectedMedia(item)}
                />
              ) : (
                <Box
                  sx={{
                    height: 200,
                    bgcolor: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedMedia(item)}
                >
                  <PlayCircleOutlineIcon sx={{ fontSize: 64, color: 'white' }} />
                </Box>
              )}
              <CardActions sx={{ px: 1, py: 0.5 }}>
                <IconButton
                  size="small"
                  color={item.likedByMe ? 'error' : 'default'}
                  onClick={() => likeMut.mutate({ mediaId: item.id, likedByMe: item.likedByMe })}
                  disabled={likeMut.isPending}
                >
                  {item.likedByMe ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                <Typography variant="body2" sx={{ mr: 1 }}>{item.likeCount}</Typography>
                <IconButton size="small" onClick={() => setSelectedMedia(item)}>
                  <ChatBubbleOutlineIcon />
                </IconButton>
                <Typography variant="body2">{item.commentCount}</Typography>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Media detail dialog */}
      <Dialog
        open={!!selectedMedia}
        onClose={() => { setSelectedMedia(null); setCommentText(''); }}
        maxWidth="sm"
        fullWidth
      >
        {selectedMedia && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              {selectedMedia.mediaType === 'PHOTO' ? 'Foto' : 'Vídeo'}
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              {selectedMedia.mediaType === 'PHOTO' ? (
                <Box
                  component="img"
                  src={selectedMedia.url}
                  alt="foto"
                  sx={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
                />
              ) : (
                <Box component="video" controls sx={{ width: '100%', maxHeight: 400 }}>
                  <source src={selectedMedia.url} />
                </Box>
              )}

              <Box sx={{ px: 2, py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <IconButton
                    size="small"
                    color={selectedMedia.likedByMe ? 'error' : 'default'}
                  onClick={() => likeMut.mutate({ mediaId: selectedMedia.id, likedByMe: selectedMedia.likedByMe })}
                  >
                    {selectedMedia.likedByMe ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <Typography variant="body2">{selectedMedia.likeCount} curtidas</Typography>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {commentsLoading && <CircularProgress size={16} sx={{ display: 'block', mx: 'auto', mb: 1 }} />}
                {(dialogComments ?? []).length > 0 && (
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {(dialogComments ?? []).map((c) => (
                      <Box key={c.id}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.guestName}</Typography>
                        <Typography variant="body2" color="text.secondary">{c.content}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}

                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Adicionar comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        commentMut.mutate({ mediaId: selectedMedia.id, content: commentText.trim() });
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!commentText.trim() || commentMut.isPending}
                    onClick={() => commentMut.mutate({ mediaId: selectedMedia.id, content: commentText.trim() })}
                  >
                    Enviar
                  </Button>
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setSelectedMedia(null); setCommentText(''); }}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </GuestLayout>
  );
}

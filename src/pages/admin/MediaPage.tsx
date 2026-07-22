import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, CircularProgress,
  Stack, Tooltip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import CommentIcon from '@mui/icons-material/Comment';
import {
  adminListMedia,
  adminHideMedia,
  adminDeleteMedia,
  adminDeleteComment,
  adminListMediaComments,
  type MediaItemAdmin,
} from '../../api/mediaApi';

const PAGE_SIZE = 20;

export default function AdminMediaPage() {
  const qc = useQueryClient();
  const [page] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [commentsItem, setCommentsItem] = useState<MediaItemAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItemAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'media', page, statusFilter],
    queryFn: () => adminListMedia({ page, pageSize: PAGE_SIZE, status: statusFilter || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'media'] });

  const hideMut = useMutation({
    mutationFn: (id: string) => adminHideMedia(id),
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteMedia(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const deleteCommentMut = useMutation({
    mutationFn: ({ commentId }: { commentId: string }) =>
      adminDeleteComment(commentId),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['admin', 'media', 'comments'] });
    },
  });

  const { data: mediaComments } = useQuery({
    queryKey: ['admin', 'media', 'comments', commentsItem?.id],
    queryFn: () => adminListMediaComments(commentsItem!.id),
    enabled: !!commentsItem,
  });

  const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    ACTIVE: 'success',
    HIDDEN: 'warning',
    DELETED: 'error',
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: 'Ativo',
    HIDDEN: 'Oculto',
    DELETED: 'Excluído',
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Mídias e Galeria</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ACTIVE">Ativos</MenuItem>
            <MenuItem value="HIDDEN">Ocultos</MenuItem>
            <MenuItem value="DELETED">Excluídos</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Convidado</TableCell>
                <TableCell>Curtidas</TableCell>
                <TableCell>Comentários</TableCell>
                <TableCell>Tamanho</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                      Nenhuma mídia encontrada.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {(data?.items ?? []).map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.mediaType === 'PHOTO' ? 'Foto' : 'Vídeo'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{item.guestName}</TableCell>
                  <TableCell>{item.likeCount}</TableCell>
                  <TableCell>{item.commentCount ?? 0}</TableCell>
                  <TableCell>
                    {item.fileSizeBytes
                      ? `${(item.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(item.uploadedAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabel[item.status ?? ''] ?? item.status}
                      color={statusColor[item.status ?? ''] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      {item.commentCount > 0 && (
                        <Tooltip title="Ver comentários">
                          <IconButton size="small" onClick={() => setCommentsItem(item)}>
                            <CommentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {item.status === 'ACTIVE' && (
                        <Tooltip title="Ocultar">
                          <IconButton
                            size="small"
                            onClick={() => hideMut.mutate(item.id)}
                            disabled={hideMut.isPending}
                          >
                            <VisibilityOffIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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

      {/* Comments dialog */}
      <Dialog open={!!commentsItem} onClose={() => setCommentsItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Comentários — {commentsItem?.guestName}</DialogTitle>
        <DialogContent>
          {mediaComments?.length === 0 && (
            <Alert severity="info">Sem comentários.</Alert>
          )}
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {mediaComments?.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.guestName}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.content}</Typography>
                </Box>
                <Tooltip title="Remover comentário">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      deleteCommentMut.mutate({ commentId: c.id })
                    }
                    disabled={deleteCommentMut.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsItem(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir mídia</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja excluir permanentemente esta mídia de <strong>{deleteTarget?.guestName}</strong>?
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

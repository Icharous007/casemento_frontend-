import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, CircularProgress,
  Stack, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Card, CardContent, Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MicIcon from '@mui/icons-material/Mic';
import {
  adminListWallPosts,
  adminGetWallSummary,
  adminDeleteWallPost,
  type WallPostAdmin,
} from '../../api/wallApi';

const PAGE_SIZE = 50;

export default function AdminWallPage() {
  const qc = useQueryClient();
  const [page] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<WallPostAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'wall', page],
    queryFn: () => adminListWallPosts({ page, pageSize: PAGE_SIZE }),
  });

  const { data: summary } = useQuery({
    queryKey: ['admin', 'wall', 'summary'],
    queryFn: () => adminGetWallSummary(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteWallPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wall'] });
      setDeleteTarget(null);
    },
  });

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Mural de Mensagens</Typography>
      </Stack>

      {/* Summary cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={4}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: '12px !important' }}>
                <Typography variant="h4" color="primary">{summary.totalActive + summary.totalRemoved}</Typography>
                <Typography variant="caption" color="text.secondary">Total</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={4}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: '12px !important' }}>
                <Typography variant="h4" color="primary">{summary.textPosts}</Typography>
                <Typography variant="caption" color="text.secondary">Textos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={4}>
            <Card elevation={1}>
              <CardContent sx={{ textAlign: 'center', py: '12px !important' }}>
                <Typography variant="h4" color="primary">{summary.audioPosts}</Typography>
                <Typography variant="caption" color="text.secondary">Áudios</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Convidado</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Conteúdo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                      Nenhuma mensagem publicada.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {(data?.items ?? []).map((post) => (
                <TableRow key={post.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{post.guestName}</Typography>
                  </TableCell>
                  <TableCell>
                    {post.postType === 'AUDIO' ? (
                      <Chip size="small" icon={<MicIcon />} label="Áudio" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Texto" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    {post.postType === 'TEXT' && post.content && (
                      <Typography variant="body2" noWrap>{post.content}</Typography>
                    )}
                    {post.postType === 'AUDIO' && post.audioUrl && (
                      <Box component="audio" controls src={post.audioUrl} sx={{ height: 32 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={post.status === 'ACTIVE' ? 'Ativo' : post.status === 'HIDDEN' ? 'Oculto' : 'Excluído'}
                      color={post.status === 'ACTIVE' ? 'success' : post.status === 'HIDDEN' ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Excluir">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(post)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir mensagem</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja excluir a mensagem de <strong>{deleteTarget?.guestName}</strong>?
            Esta ação não pode ser desfeita.
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

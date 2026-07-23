import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, Card, CardContent,
  CircularProgress, Alert, Stack, Chip, Fab,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import GuestLayout from './GuestLayout';
import {
  listWallPosts,
  createTextPost,
  createAudioPost,
  type WallPost,
} from '../../api/wallApi';

const PAGE_SIZE = 20;

const wallCardSx = {
  border: '1px solid rgba(181, 154, 199, 0.20)',
  borderRadius: 4,
  background: 'linear-gradient(180deg, rgba(255, 253, 251, 0.96), rgba(215, 198, 234, 0.88))',
  boxShadow: '0 18px 46px rgba(128, 102, 167, 0.14)',
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WallPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page] = useState(1);
  const [textContent, setTextContent] = useState('');
  const [postError, setPostError] = useState('');
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'wall', page],
    queryFn: () => listWallPosts({ page, pageSize: PAGE_SIZE }),
  });

  const textMut = useMutation({
    mutationFn: () => createTextPost(textContent.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'wall'] });
      setTextContent('');
      setPostError('');
    },
    onError: (err: any) => {
      setPostError(err?.response?.data?.message ?? 'Erro ao publicar. Tente novamente.');
    },
  });

  const audioMut = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) =>
      createAudioPost(new File([blob], 'audio.webm', { type: blob.type }), duration),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'wall'] });
      setAudioBlob(null);
      setAudioDialogOpen(false);
      setPostError('');
    },
    onError: (err: any) => {
      setPostError(err?.response?.data?.message ?? 'Erro ao enviar áudio. Tente novamente.');
    },
  });

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      setAudioDuration(0);

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      timerRef.current = setInterval(() => setAudioDuration((d) => d + 1), 1000);
    } catch {
      setPostError('Não foi possível acessar o microfone.');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function discardAudio() {
    setAudioBlob(null);
    setAudioDuration(0);
    setAudioDialogOpen(false);
  }

  let audioDialogBody;
  if (recording) {
    audioDialogBody = (
      <>
        <Typography variant="h4" color="error">{formatDuration(audioDuration)}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Gravando...</Typography>
        <Fab color="error" onClick={stopRecording}>
          <StopIcon />
        </Fab>
      </>
    );
  } else if (audioBlob) {
    audioDialogBody = (
      <>
        <GraphicEqIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gravação: {formatDuration(audioDuration)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Button variant="outlined" onClick={discardAudio}>Descartar</Button>
          <Button
            variant="contained"
            disabled={audioMut.isPending}
            onClick={() => audioMut.mutate({ blob: audioBlob, duration: audioDuration })}
          >
            {audioMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Enviar'}
          </Button>
        </Stack>
      </>
    );
  } else {
    audioDialogBody = (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clique para iniciar a gravação
        </Typography>
        <Fab color="primary" onClick={startRecording}>
          <MicIcon />
        </Fab>
      </>
    );
  }

  return (
    <GuestLayout title="Mural">
      <Typography variant="h5" color="primary" sx={{ fontWeight: 400, textAlign: 'center', mb: 0.5 }}>
        Mural de Mensagens 💌
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        Deixe uma mensagem especial para os noivos!
      </Typography>

      <Button
        variant="text"
        onClick={() => navigate('/home')}
        sx={{ mb: 2 }}
      >
        Voltar para Home
      </Button>

      {postError && <Alert severity="error" sx={{ mb: 2 }}>{postError}</Alert>}

      {/* Text post */}
      <Card elevation={0} sx={{ ...wallCardSx, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="Escreva sua mensagem..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            size="small"
            sx={{ mb: 1 }}
          />
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {textContent.length}/500
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MicIcon />}
                onClick={() => setAudioDialogOpen(true)}
              >
                Áudio
              </Button>
              <Button
                variant="contained"
                size="small"
                endIcon={<SendIcon />}
                disabled={!textContent.trim() || textMut.isPending}
                onClick={() => textMut.mutate()}
              >
                {textMut.isPending ? <CircularProgress size={16} color="inherit" /> : 'Publicar'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Post list */}
      {isLoading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Não foi possível carregar o mural.</Alert>}

      <Stack spacing={2}>
        {(data?.items ?? []).map((post) => (
          <WallPostCard key={post.id} post={post} />
        ))}
        {data?.items.length === 0 && (
          <Alert severity="info">Nenhuma mensagem ainda. Seja o primeiro!</Alert>
        )}
      </Stack>

      {/* Audio recording dialog */}
      <Dialog open={audioDialogOpen} onClose={discardAudio} maxWidth="xs" fullWidth>
        <DialogTitle>Gravar mensagem de voz</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {audioDialogBody}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={discardAudio} disabled={recording}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </GuestLayout>
  );
}

function WallPostCard({ post }: Readonly<{ post: WallPost }>) {
  const date = new Date(post.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Card elevation={0} sx={wallCardSx}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{post.guestName}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {post.postType === 'AUDIO' && (
              <Chip size="small" icon={<MicIcon />} label="Áudio" variant="outlined" />
            )}
            <Typography variant="caption" color="text.secondary">{date}</Typography>
          </Stack>
        </Stack>
        {post.postType === 'TEXT' && post.content && (
          <Typography variant="body2" color="text.primary">{post.content}</Typography>
        )}
        {post.postType === 'AUDIO' && post.audioUrl && (
          <Box component="audio" controls src={post.audioUrl} sx={{ width: '100%', mt: 0.5 }} />
        )}
      </CardContent>
    </Card>
  );
}

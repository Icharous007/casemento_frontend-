import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, IconButton, Button, TextField, CircularProgress, Alert,
  Stack, Drawer, Avatar,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import GuestLayout from './GuestLayout';
import MediaComposer from '../../components/guest/MediaComposer';
import { useGuestAuth } from '../../contexts/GuestAuthContext';
import { getMe } from '../../api/guestApi';
import {
  listMedia,
  addMediaLike,
  removeMediaLike,
  addMediaComment,
  listMediaComments,
  type MediaItem,
  type MediaListResponse,
} from '../../api/mediaApi';
import './GalleryPage.css';

const DOUBLE_TAP_MS = 450;
const DOUBLE_TAP_MIN_MS = 40;
const DOUBLE_TAP_SLOP = 56;
const VIEWER_Z = 1300;
const COMMENTS_Z = 1400;

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')} mil`;
  }
  return String(value);
}

function formatUploadedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function mediaSrc(item: MediaItem) {
  if (item.mediaType === 'VIDEO') {
    return item.thumbnailUrl || item.displayUrl || undefined;
  }
  return item.thumbnailUrl || item.displayUrl || item.url;
}

function fallbackImage(event: SyntheticEvent<HTMLImageElement>, item: MediaItem) {
  const fallback = item.displayUrl || item.url;
  if (fallback && event.currentTarget.src !== fallback) {
    event.currentTarget.src = fallback;
  }
}

function guestIdFromUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const folder = parts.findIndex((part) => part === 'photos' || part === 'videos');
    if (folder >= 0 && parts[folder + 1]) return parts[folder + 1];
  } catch {
    return undefined;
  }
  return undefined;
}

function mediaGuestName(item: MediaItem, me?: { guestId?: string; displayName?: string } | null) {
  const named = item.guestName?.trim();
  if (named) return named;
  const mediaGuestId = item.guestId || guestIdFromUrl(item.url) || guestIdFromUrl(item.thumbnailUrl ?? undefined);
  if (me?.displayName && mediaGuestId && me.guestId && mediaGuestId === me.guestId) {
    return me.displayName;
  }
  return 'Convidado';
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

type TapPoint = { time: number; id: string; x: number; y: number };

function isDoubleTap(last: TapPoint, itemId: string, x: number, y: number) {
  const dt = performance.now() - last.time;
  return last.id === itemId
    && dt >= DOUBLE_TAP_MIN_MS
    && dt < DOUBLE_TAP_MS
    && Math.abs(x - last.x) < DOUBLE_TAP_SLOP
    && Math.abs(y - last.y) < DOUBLE_TAP_SLOP;
}

export default function GalleryPage() {
  const qc = useQueryClient();
  const { guest } = useGuestAuth();
  const reelsRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastTapRef = useRef<TapPoint>({ time: 0, id: '', x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastLikeGestureRef = useRef(0);
  const pendingScrollIndex = useRef<number | null>(null);
  const skipObserverRef = useRef(false);
  const pausedByUserRef = useRef(false);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [page, setPage] = useState(1);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [pausedMediaId, setPausedMediaId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest', 'media', sort, page],
    queryFn: () => listMedia({ page, pageSize: 24, sort }),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const viewerOpen = viewerIndex != null;
  const selectedMedia = viewerIndex != null ? items[viewerIndex] ?? null : null;
  const paused = selectedMedia?.id != null && selectedMedia.id === pausedMediaId;

  const { data: me } = useQuery({
    queryKey: ['guest', 'me'],
    queryFn: getMe,
  });

  const currentGuest = {
    guestId: guest?.guestId || me?.guestId,
    displayName: me?.displayName || guest?.displayName,
  };

  const { data: dialogComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['guest', 'media', selectedMedia?.id, 'comments'],
    queryFn: () => listMediaComments(selectedMedia?.id ?? ''),
    enabled: !!selectedMedia && commentsOpen,
  });

  const likeMut = useMutation({
    mutationFn: ({ mediaId, likedByMe }: { mediaId: string; likedByMe: boolean }) =>
      likedByMe ? removeMediaLike(mediaId) : addMediaLike(mediaId),
    onMutate: async ({ mediaId, likedByMe }) => {
      await qc.cancelQueries({ queryKey: ['guest', 'media'] });
      const snapshots = qc.getQueriesData<MediaListResponse>({ queryKey: ['guest', 'media'] });
      qc.setQueriesData<MediaListResponse>({ queryKey: ['guest', 'media'] }, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) => {
            if (item.id !== mediaId) return item;
            const nextLiked = !likedByMe;
            return {
              ...item,
              likedByMe: nextLiked,
              likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)),
            };
          }),
        };
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, cached]) => {
        qc.setQueryData(key, cached);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'media'] });
    },
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

  const visibleReelIds = useMemo(
    () => (viewerIndex == null
      ? []
      : items.slice(Math.max(0, viewerIndex - 1), viewerIndex + 2).map((item) => item.id)),
    [items, viewerIndex],
  );

  useEffect(() => {
    if (viewerIndex == null) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [viewerIndex]);

  useEffect(() => {
    if (!viewerOpen || pendingScrollIndex.current == null) return;
    const index = pendingScrollIndex.current;
    pendingScrollIndex.current = null;
    requestAnimationFrame(() => {
      const node = reelsRef.current?.children[index] as HTMLElement | undefined;
      node?.scrollIntoView({ block: 'start' });
      window.setTimeout(() => {
        skipObserverRef.current = false;
      }, 180);
    });
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return undefined;
    const root = reelsRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (skipObserverRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.65)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(index) && index !== viewerIndex) {
          pausedByUserRef.current = false;
          setViewerIndex(index);
        }
      },
      { root, threshold: [0.65, 0.9] },
    );

    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [viewerOpen, items.length, viewerIndex]);

  function openViewer(index: number) {
    pendingScrollIndex.current = index;
    skipObserverRef.current = true;
    pausedByUserRef.current = false;
    setPausedMediaId(null);
    setViewerIndex(index);
    setCommentsOpen(false);
    setCommentText('');
  }

  function closeViewer() {
    if (singleTapTimerRef.current != null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    pausedByUserRef.current = false;
    setPausedMediaId(null);
    Object.values(videoRefs.current).forEach((video) => video?.pause());
    setViewerIndex(null);
    setCommentsOpen(false);
    setCommentText('');
    setHeartBurstId(null);
  }

  function togglePause(item: MediaItem) {
    if (item.mediaType !== 'VIDEO') return;
    const video = videoRefs.current[item.id];
    if (!video) return;
    if (paused || video.paused) {
      pausedByUserRef.current = false;
      video.volume = 1;
      void video.play().catch(() => undefined);
      setPausedMediaId(null);
      return;
    }
    pausedByUserRef.current = true;
    video.pause();
    setPausedMediaId(item.id);
  }

  function handleMuteToggle() {
    setMuted((value) => !value);
  }

  function showHeartBurst(itemId: string) {
    setHeartBurstId(itemId);
    window.setTimeout(() => {
      setHeartBurstId((current) => (current === itemId ? null : current));
    }, 700);
  }

  function toggleLike(item: MediaItem, burst = false) {
    if (burst && !item.likedByMe) showHeartBurst(item.id);
    likeMut.mutate({ mediaId: item.id, likedByMe: item.likedByMe });
  }

  function likeFromGesture(item: MediaItem) {
    const now = performance.now();
    if (now - lastLikeGestureRef.current < 420) return;
    lastLikeGestureRef.current = now;
    if (!item.likedByMe) toggleLike(item, true);
    else showHeartBurst(item.id);
  }

  function handleMediaTap(item: MediaItem, x: number, y: number) {
    const last = lastTapRef.current;
    if (isDoubleTap(last, item.id, x, y)) {
      if (singleTapTimerRef.current != null) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = { time: 0, id: '', x: 0, y: 0 };
      likeFromGesture(item);
      return;
    }
    lastTapRef.current = { time: performance.now(), id: item.id, x, y };
    if (item.mediaType !== 'VIDEO') return;
    if (muted) {
      setMuted(false);
      return;
    }
    if (singleTapTimerRef.current != null) window.clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      togglePause(item);
    }, DOUBLE_TAP_MS);
  }

  function handleTapPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleTapPointerUp(event: ReactPointerEvent<HTMLElement>, item: MediaItem) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start && (Math.abs(event.clientX - start.x) > 16 || Math.abs(event.clientY - start.y) > 16)) {
      return;
    }
    handleMediaTap(item, event.clientX, event.clientY);
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
      <Typography variant="h5" sx={{ fontWeight: 400, textAlign: 'center', mb: 0.5 }}>
        Galeria de Fotos e Vídeos 📸
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
        Compartilhe seus momentos especiais do evento!
      </Typography>

      <MediaComposer />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={sort === 'recent' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setSort('recent');
            setPage(1);
          }}
          sx={{
            borderRadius: 999,
            px: 2.5,
            ...(sort !== 'recent' && { bgcolor: 'background.paper' }),
          }}
        >
          Mais recentes
        </Button>
        <Button
          variant={sort === 'popular' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setSort('popular');
            setPage(1);
          }}
          sx={{
            borderRadius: 999,
            px: 2.5,
            ...(sort !== 'popular' && { bgcolor: 'background.paper' }),
          }}
        >
          Mais curtidos
        </Button>
      </Stack>

      {items.length === 0 && (
        <Alert severity="info">Nenhuma mídia publicada ainda. Seja o primeiro!</Alert>
      )}

      <Box
        sx={{
          mx: { xs: -2, sm: 0 },
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
        }}
      >
        {items.map((item, index) => (
          <Box
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => openViewer(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') openViewer(index);
            }}
            sx={{
              position: 'relative',
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: 'rgba(75, 63, 93, 0.08)',
              '&:hover img, &:hover video': { transform: 'scale(1.04)' },
            }}
          >
            {item.mediaType === 'PHOTO' ? (
              <Box
                component="img"
                src={mediaSrc(item)}
                onError={(event) => fallbackImage(event, item)}
                alt="foto"
                loading="lazy"
                decoding="async"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 220ms ease',
                }}
              />
            ) : (
              <Box
                component="img"
                src={mediaSrc(item)}
                onError={(event) => fallbackImage(event, item)}
                alt="pré-visualização do vídeo"
                loading="lazy"
                decoding="async"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 220ms ease',
                }}
              />
            )}
            {item.mediaType === 'VIDEO' && (
              <PlayArrowRoundedIcon
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 4,
                  color: '#fff',
                  fontSize: 22,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.55))',
                }}
              />
            )}
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                position: 'absolute',
                left: 6,
                bottom: 6,
                color: '#fff',
                textShadow: '0 1px 4px rgba(0,0,0,.7)',
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              <FavoriteIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {formatCount(item.likeCount)}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2, justifyContent: 'center' }}>
        {page > 1 && (
          <Button variant="outlined" size="small" onClick={() => setPage((current) => current - 1)}>
            Anterior
          </Button>
        )}
        {data.hasMore && (
          <Button variant="contained" size="small" onClick={() => setPage((current) => current + 1)}>
            Ver mais
          </Button>
        )}
      </Stack>

      {viewerIndex != null && selectedMedia && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: VIEWER_Z,
            bgcolor: '#0d0b12',
            height: '100dvh',
            width: '100vw',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              pt: 'max(8px, env(safe-area-inset-top))',
              background: 'linear-gradient(180deg, rgba(0,0,0,.55), transparent)',
            }}
          >
            <IconButton aria-label="Fechar" onClick={closeViewer} sx={{ color: '#fff' }}>
              <CloseRoundedIcon />
            </IconButton>
            <Typography sx={{ color: '#fff', fontWeight: 600, letterSpacing: 0.4 }}>
              Momentos
            </Typography>
            <IconButton
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
              onClick={handleMuteToggle}
              sx={{
                color: '#fff',
                visibility: selectedMedia.mediaType === 'VIDEO' ? 'visible' : 'hidden',
              }}
            >
              {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
          </Box>

          <Box ref={reelsRef} className={`gallery-reels${commentsOpen ? ' is-locked' : ''}`}>
            {items.map((item, index) => {
              const active = item.id === selectedMedia.id;
              const shouldMountMedia = visibleReelIds.includes(item.id);
              const authorName = mediaGuestName(item, currentGuest);
              return (
                <Box key={item.id} className="gallery-reel" data-index={index}>
                  {shouldMountMedia && item.mediaType === 'PHOTO' && (
                    <Box
                      component="img"
                      src={item.displayUrl || item.url}
                      alt={authorName}
                      draggable={false}
                      className="gallery-reel-media"
                    />
                  )}
                  {shouldMountMedia && item.mediaType === 'VIDEO' && (
                    <Box
                      component="video"
                      ref={(node: HTMLVideoElement | null) => {
                        videoRefs.current[item.id] = node;
                        if (node && !active) node.pause();
                      }}
                      src={item.url}
                      poster={item.thumbnailUrl || item.displayUrl || undefined}
                      playsInline
                      loop
                      muted={muted}
                      autoPlay={active && !paused}
                      preload={active ? 'auto' : 'none'}
                      disablePictureInPicture
                      className="gallery-reel-media is-video"
                      onPlay={() => {
                        if (active) setPausedMediaId(null);
                      }}
                      onPause={() => {
                        if (active && pausedByUserRef.current) setPausedMediaId(item.id);
                      }}
                    />
                  )}

                  <Box
                    className="gallery-reel-tap"
                    sx={{ WebkitTapHighlightColor: 'transparent' }}
                    onPointerDown={handleTapPointerDown}
                    onPointerUp={(event) => handleTapPointerUp(event, item)}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      if (singleTapTimerRef.current != null) {
                        window.clearTimeout(singleTapTimerRef.current);
                        singleTapTimerRef.current = null;
                      }
                      lastTapRef.current = { time: 0, id: '', x: 0, y: 0 };
                      likeFromGesture(item);
                    }}
                  />

                  {heartBurstId === item.id && (
                    <FavoriteIcon className="gallery-heart-burst" />
                  )}

                  {item.mediaType === 'VIDEO' && active && paused && (
                    <PlayArrowRoundedIcon
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 4,
                        fontSize: 88,
                        color: 'rgba(255,255,255,.92)',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.45))',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  <Box
                    sx={{
                      position: 'absolute',
                      right: 10,
                      bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 88px))',
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                      color: '#fff',
                    }}
                  >
                    {item.mediaType === 'VIDEO' && (
                      <Box sx={{ textAlign: 'center' }}>
                        <IconButton
                          aria-label={paused && active ? 'Reproduzir' : 'Pausar'}
                          onPointerUp={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (singleTapTimerRef.current != null) {
                              window.clearTimeout(singleTapTimerRef.current);
                              singleTapTimerRef.current = null;
                            }
                            togglePause(item);
                          }}
                          sx={{
                            color: '#fff',
                            bgcolor: 'rgba(0,0,0,.28)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,.42)' },
                          }}
                        >
                          {paused && active ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
                        </IconButton>
                      </Box>
                    )}
                    <Box sx={{ textAlign: 'center' }}>
                      <IconButton
                        aria-label={item.likedByMe ? 'Remover curtida' : 'Curtir'}
                        onClick={() => toggleLike(item, !item.likedByMe)}
                        sx={{
                          color: item.likedByMe ? '#ff4d6d' : '#fff',
                          bgcolor: 'rgba(0,0,0,.28)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,.42)' },
                        }}
                      >
                        {item.likedByMe ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      </IconButton>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                        {formatCount(item.likeCount)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <IconButton
                        aria-label="Abrir comentários"
                        onPointerUp={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewerIndex(index);
                          setCommentsOpen(true);
                        }}
                        sx={{
                          color: '#fff',
                          bgcolor: 'rgba(0,0,0,.28)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,.42)' },
                        }}
                      >
                        <ChatBubbleOutlineIcon />
                      </IconButton>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                        {formatCount(item.commentCount)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      position: 'absolute',
                      left: 16,
                      right: 72,
                      bottom: 'max(20px, env(safe-area-inset-bottom))',
                      zIndex: 2,
                      color: '#fff',
                      pb: 2,
                      pt: 6,
                      background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.45))',
                      mx: -2,
                      px: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ mb: 0.75, alignItems: 'center' }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#7d98da', fontSize: 13 }}>
                        {initialsFromName(authorName)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                          {authorName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, opacity: 0.82 }}>
                          {item.mediaType === 'VIDEO' ? 'Vídeo' : 'Foto'} · {formatUploadedAt(item.uploadedAt)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography sx={{ fontSize: 13, opacity: 0.92 }}>
                      Toque para pausar · toque duas vezes para curtir
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Drawer
            anchor="bottom"
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            keepMounted
            ModalProps={{
              keepMounted: true,
              sx: { zIndex: COMMENTS_Z },
            }}
            slotProps={{
              root: { sx: { zIndex: COMMENTS_Z } },
              paper: {
                sx: {
                  zIndex: COMMENTS_Z,
                  maxHeight: 'min(72dvh, 620px)',
                  pb: 'max(16px, env(safe-area-inset-bottom))',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  px: 2,
                  pt: 1.5,
                  bgcolor: 'background.paper',
                },
              },
            }}
          >
            <Box sx={{ width: 42, height: 4, borderRadius: 99, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
            <Typography sx={{ fontWeight: 700, mb: 1.5, textAlign: 'center' }}>
              Comentários
            </Typography>
            <Box sx={{ overflowY: 'auto', minHeight: 160, maxHeight: '38dvh', mb: 1.5 }}>
              {commentsLoading && (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} /></Box>
              )}
              {!commentsLoading && (dialogComments ?? []).length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Seja o primeiro a comentar.
                </Typography>
              )}
              <Stack spacing={1.5}>
                {(dialogComments ?? []).map((comment) => (
                  <Stack key={comment.id} direction="row" spacing={1.25}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.light', color: 'text.primary', fontSize: 13 }}>
                      {comment.guestName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {comment.guestName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {comment.content}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Adicionar comentário..."
                value={commentText}
                autoComplete="off"
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && commentText.trim() && selectedMedia) {
                    event.preventDefault();
                    commentMut.mutate({ mediaId: selectedMedia.id, content: commentText.trim() });
                  }
                }}
                slotProps={{
                  htmlInput: {
                    enterKeyHint: 'send',
                    style: { fontSize: 16 },
                  },
                }}
              />
              <IconButton
                color="primary"
                disabled={!commentText.trim() || commentMut.isPending || !selectedMedia}
                onClick={() => {
                  if (!selectedMedia || !commentText.trim()) return;
                  commentMut.mutate({ mediaId: selectedMedia.id, content: commentText.trim() });
                }}
              >
                <SendRoundedIcon />
              </IconButton>
            </Stack>
          </Drawer>
        </Box>
      )}
    </GuestLayout>
  );
}

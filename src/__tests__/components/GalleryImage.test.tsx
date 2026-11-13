import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GalleryImage from '../../components/guest/GalleryImage';
import type { MediaItem } from '../../api/mediaApi';
import { recordMediaError } from '../../utils/mediaTelemetry';

vi.mock('../../utils/mediaTelemetry', () => ({
  createMediaAttempt: () => ({ flowId: 'test', attemptId: 'test', source: 'gallery' }),
  recordMediaError: vi.fn(),
}));

const item: MediaItem = {
  id: 'media', mediaType: 'PHOTO', status: 'ACTIVE', url: '/original.heic',
  thumbnailUrl: '/thumb.jpg', displayUrl: '/display.jpg', contentType: 'image/heic',
  caption: null, fileSizeBytes: 100, likeCount: 0, likedByMe: false, commentCount: 0,
  uploadedAt: '2026-11-13T10:00:00Z', guestId: 'guest', guestName: 'Guest',
};

describe('gallery image failures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tries grid alternatives once each, then shows an actionable error', () => {
    const retry = vi.fn();
    const openViewer = vi.fn();
    render(<div onClick={openViewer}><GalleryImage item={item} onRetry={retry} /></div>);
    expect(screen.getByAltText('foto')).toHaveAttribute('src', '/thumb.jpg');
    fireEvent.error(screen.getByAltText('foto'));
    expect(screen.getByAltText('foto')).toHaveAttribute('src', '/display.jpg');
    fireEvent.error(screen.getByAltText('foto'));
    expect(screen.getByAltText('foto')).toHaveAttribute('src', '/original.heic');
    fireEvent.error(screen.getByAltText('foto'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível exibir esta foto.')).toBeInTheDocument();
    expect(recordMediaError).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(openViewer).not.toHaveBeenCalled();
    expect(screen.getByAltText('foto')).toHaveAttribute('src', '/thumb.jpg');
  });

  it('deduplicates sources and offers viewer retry without triggering the media tap layer', () => {
    render(<GalleryImage item={{ ...item, thumbnailUrl: '/display.jpg' }} viewer onRetry={vi.fn()} />);
    expect(screen.getByAltText('Foto ampliada')).toHaveAttribute('src', '/display.jpg');
    fireEvent.error(screen.getByAltText('Foto ampliada'));
    expect(screen.getByAltText('Foto ampliada')).toHaveAttribute('src', '/original.heic');
    fireEvent.error(screen.getByAltText('Foto ampliada'));
    expect(recordMediaError).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível exibir esta foto.');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });

  it('uses a newly generated JPEG after the feed is refreshed', () => {
    const original = { ...item, thumbnailUrl: null, displayUrl: null };
    const { rerender } = render(<GalleryImage item={original} viewer onRetry={vi.fn()} />);
    fireEvent.error(screen.getByAltText('Foto ampliada'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<GalleryImage item={{ ...original, displayUrl: '/recovered.jpg' }} viewer onRetry={vi.fn()} />);
    expect(screen.getByAltText('Foto ampliada')).toHaveAttribute('src', '/recovered.jpg');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('never falls back to a video file as an image', () => {
    render(<GalleryImage item={{ ...item, mediaType: 'VIDEO', url: '/original.mp4' }} onRetry={vi.fn()} />);
    fireEvent.error(screen.getByAltText('pré-visualização do vídeo'));
    fireEvent.error(screen.getByAltText('pré-visualização do vídeo'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Prévia do vídeo indisponível.')).toBeInTheDocument();
  });
});

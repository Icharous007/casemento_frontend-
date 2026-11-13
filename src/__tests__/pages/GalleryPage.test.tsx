import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import GalleryPage from '../../pages/guest/GalleryPage';
import {
  addMediaComment, addMediaLike, listMediaComments, listMediaFeed,
  type MediaFeedResponse, type MediaItem,
} from '../../api/mediaApi';

vi.mock('../../contexts/GuestAuthContext', () => ({
  useGuestAuth: () => ({ guest: { guestId: 'guest-1', displayName: 'Test guest' } }),
}));
vi.mock('../../pages/guest/GuestLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('../../components/guest/MediaComposer', () => ({
  default: ({ onPublished }: { onPublished: () => void }) => (
    <button onClick={onPublished}>Publicar teste</button>
  ),
}));
vi.mock('../../api/guestApi', () => ({
  getMe: vi.fn().mockResolvedValue({ guestId: 'guest-1', displayName: 'Test guest' }),
}));
vi.mock('../../api/mediaApi', () => ({
  listMediaFeed: vi.fn(),
  addMediaLike: vi.fn(),
  removeMediaLike: vi.fn(),
  addMediaComment: vi.fn(),
  listMediaComments: vi.fn().mockResolvedValue([]),
}));

class Observer implements IntersectionObserver {
  static instances: Observer[] = [];
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  readonly targets = new Set<Element>();
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    Observer.instances.push(this);
  }

  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
  takeRecords() { return []; }

  intersect() {
    this.callback([...this.targets].map((target) => ({
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: performance.now(),
    })), this);
  }
}

function item(index: number): MediaItem {
  return {
    id: `media-${index}`, mediaType: 'PHOTO', status: 'ACTIVE',
    url: `/original-${index}.jpg`, thumbnailUrl: `/thumb-${index}.jpg`,
    displayUrl: `/display-${index}.jpg`, contentType: 'image/jpeg',
    caption: null, fileSizeBytes: 100, likeCount: 0, likedByMe: false,
    commentCount: 0, uploadedAt: '2026-11-13T10:00:00Z', guestId: 'guest-1',
    guestName: 'Test guest',
  };
}

function page(start: number, count: number, nextCursor: number | null): MediaFeedResponse {
  return {
    items: Array.from({ length: count }, (_, index) => item(start + index)),
    nextCursor, hasMore: nextCursor != null, galleryHidden: false,
  };
}

let client: QueryClient;

function showGallery() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><GalleryPage /></QueryClientProvider>);
}

async function reachEnd() {
  await waitFor(() => {
    expect(Observer.instances.some((observer) => observer.rootMargin === '600px 0px'
      && observer.targets.size > 0)).toBe(true);
  });
  act(() => {
    Observer.instances.filter((observer) => observer.rootMargin === '600px 0px').forEach((observer) => {
      observer.intersect();
      observer.intersect();
    });
  });
}

describe('dynamic gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Observer.instances = [];
    vi.stubGlobal('IntersectionObserver', Observer);
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    client?.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initially requests exactly 10 random media and only mounts lazy thumbnails in the grid', async () => {
    vi.mocked(listMediaFeed).mockResolvedValue(page(0, 10, 10));
    const { container } = showGallery();
    expect(await screen.findAllByAltText('foto')).toHaveLength(10);
    expect(listMediaFeed).toHaveBeenCalledExactlyOnceWith({
      feedId: expect.any(String), sort: 'random', cursor: 0, pageSize: 10,
    }, expect.any(AbortSignal));
    expect(screen.queryByText('Ver mais')).not.toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
    container.querySelectorAll('img').forEach((image) => {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('decoding', 'async');
      expect(image.getAttribute('src')).toContain('/thumb-');
    });
  });

  it('generates valid feed UUIDs on HTTP development origins without crypto.randomUUID', async () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    vi.mocked(listMediaFeed).mockResolvedValue(page(0, 1, null));
    showGallery();
    await screen.findAllByAltText('foto');
    expect(vi.mocked(listMediaFeed).mock.calls[0][0].feedId)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('appends pages automatically without concurrent requests and stops at the end', async () => {
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, 10)).mockResolvedValueOnce(page(10, 3, null));
    showGallery();
    await screen.findAllByAltText('foto');
    await reachEnd();
    await waitFor(() => expect(screen.getAllByAltText('foto')).toHaveLength(13));
    expect(listMediaFeed).toHaveBeenCalledTimes(2);
    expect(vi.mocked(listMediaFeed).mock.calls[1][0]).toEqual({
      ...vi.mocked(listMediaFeed).mock.calls[0][0], cursor: 10,
    });
    expect(screen.getByText('Você viu todos os momentos.')).toBeInTheDocument();
  });

  it('keeps already-loaded media on failure and retries the same cursor', async () => {
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, 10))
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(10, 2, null));
    showGallery();
    await screen.findAllByAltText('foto');
    await reachEnd();
    expect(await screen.findByText(/Não foi possível carregar as mídias/)).toBeInTheDocument();
    expect(screen.getAllByAltText('foto')).toHaveLength(10);
    expect(listMediaFeed).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getAllByAltText('foto')).toHaveLength(12));
    expect(vi.mocked(listMediaFeed).mock.calls[2][0].cursor).toBe(10);
  });

  it('loads the next batch from the viewer before reaching its last reel and preserves the selected media', async () => {
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, 10)).mockResolvedValueOnce(page(10, 10, null));
    const { container } = showGallery();
    const photos = await screen.findAllByAltText('foto');
    fireEvent.click(photos[7]);
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelectorAll('.gallery-reel')).toHaveLength(20));
    const mountedPhotos = container.querySelectorAll('.gallery-reel img');
    expect(mountedPhotos).toHaveLength(3);
    expect([...mountedPhotos].map((image) => image.getAttribute('src'))).toEqual([
      '/display-6.jpg', '/display-7.jpg', '/display-8.jpg',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getAllByAltText('foto')).toHaveLength(20);
  });

  it('mounts only the active and adjacent videos and only preloads the active one', async () => {
    const response = page(0, 10, null);
    response.items.forEach((media) => { media.mediaType = 'VIDEO'; });
    vi.mocked(listMediaFeed).mockResolvedValue(response);
    const { container } = showGallery();
    const previews = await screen.findAllByAltText('pré-visualização do vídeo');
    expect(container.querySelectorAll('video')).toHaveLength(0);
    fireEvent.click(previews[4]);
    const videos = container.querySelectorAll('video');
    expect(videos).toHaveLength(3);
    expect([...videos].map((video) => video.getAttribute('preload'))).toEqual(['none', 'auto', 'none']);
  });

  it('preserves the selected ID when moderation removes earlier items during a refetch', async () => {
    const updated = page(3, 7, null);
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, null)).mockResolvedValue(updated);
    const { container } = showGallery();
    const photos = await screen.findAllByAltText('foto');
    fireEvent.click(photos[4]);
    await act(async () => { await client.invalidateQueries({ queryKey: ['guest', 'media', 'feed'] }); });
    expect([...container.querySelectorAll('.gallery-reel img')].map((image) => image.getAttribute('src')))
      .toEqual(['/display-3.jpg', '/display-4.jpg', '/display-5.jpg']);
  });

  it('closes the viewer and unlocks scrolling if a later page reports a closed gallery', async () => {
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, 10)).mockResolvedValueOnce({
      items: [], nextCursor: null, hasMore: false, galleryHidden: true,
    });
    showGallery();
    const photos = await screen.findAllByAltText('foto');
    fireEvent.click(photos[8]);
    expect(await screen.findByText('A galeria deste evento foi encerrada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('updates optimistic likes across infinite pages without changing the feed identity on refetch', async () => {
    const first = page(0, 10, null);
    const liked = page(0, 10, null);
    liked.items[4].likedByMe = true;
    liked.items[4].likeCount = 1;
    vi.mocked(listMediaFeed).mockResolvedValueOnce(first).mockResolvedValue(liked);
    vi.mocked(addMediaLike).mockResolvedValue({ mediaId: 'media-4', liked: true });
    showGallery();
    const photos = await screen.findAllByAltText('foto');
    fireEvent.click(photos[4]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Curtir' })[4]);
    await waitFor(() => expect(addMediaLike).toHaveBeenCalledWith('media-4'));
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(2));
    expect(vi.mocked(listMediaFeed).mock.calls[1][0]).toEqual(vi.mocked(listMediaFeed).mock.calls[0][0]);
    expect(screen.getByRole('button', { name: 'Remover curtida' })).toBeInTheDocument();
  });

  it('starts fresh feeds when changing the sort, refreshing or publishing', async () => {
    vi.mocked(listMediaFeed).mockResolvedValue(page(0, 2, null));
    showGallery();
    await screen.findAllByAltText('foto');
    fireEvent.click(screen.getByRole('button', { name: 'Mais recentes' }));
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(2));
    expect(vi.mocked(listMediaFeed).mock.calls[1][0]).toMatchObject({ sort: 'recent', cursor: 0, pageSize: 10 });
    fireEvent.click(await screen.findByRole('button', { name: 'Mais curtidos' }));
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(3));
    expect(vi.mocked(listMediaFeed).mock.calls[2][0].sort).toBe('popular');
    fireEvent.click(await screen.findByRole('button', { name: 'Atualizar galeria' }));
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(4));
    expect(vi.mocked(listMediaFeed).mock.calls[3][0].feedId).not.toBe(vi.mocked(listMediaFeed).mock.calls[2][0].feedId);
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar teste' }));
    await waitFor(() => expect(listMediaFeed).toHaveBeenCalledTimes(5));
    expect(vi.mocked(listMediaFeed).mock.calls[4][0].feedId).not.toBe(vi.mocked(listMediaFeed).mock.calls[3][0].feedId);
  });

  it('provides a load button only when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.mocked(listMediaFeed).mockResolvedValueOnce(page(0, 10, 10)).mockResolvedValueOnce(page(10, 2, null));
    showGallery();
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(screen.getAllByAltText('foto')).toHaveLength(12));
  });

  it('refetches comments and counters without reshuffling the selected media', async () => {
    const first = page(0, 10, null);
    const updated = page(0, 10, null);
    updated.items[4].commentCount = 1;
    vi.mocked(listMediaFeed).mockResolvedValueOnce(first).mockResolvedValue(updated);
    const comment = {
      id: 'comment-1', guestId: 'guest-1', guestName: 'Test guest',
      content: 'Muito bom!', createdAt: '2026-11-13T10:00:00Z',
    };
    vi.mocked(addMediaComment).mockResolvedValue(comment);
    vi.mocked(listMediaComments).mockResolvedValueOnce([]).mockResolvedValue([comment]);
    showGallery();
    const photos = await screen.findAllByAltText('foto');
    fireEvent.click(photos[4]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir comentários' })[4]);
    fireEvent.change(await screen.findByPlaceholderText('Adicionar comentário...'), {
      target: { value: 'Muito bom!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }));
    expect(await screen.findByText('Muito bom!')).toBeInTheDocument();
    expect(addMediaComment).toHaveBeenCalledWith('media-4', 'Muito bom!');
    expect(vi.mocked(listMediaFeed).mock.calls[1][0]).toEqual(vi.mocked(listMediaFeed).mock.calls[0][0]);
  });

  it('shows initial errors with recovery and respects a closed gallery', async () => {
    vi.mocked(listMediaFeed).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      items: [], nextCursor: null, hasMore: false, galleryHidden: true,
    });
    showGallery();
    expect(await screen.findByText('Não foi possível carregar a galeria.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('A galeria deste evento foi encerrada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar teste' })).not.toBeInTheDocument();
  });
});

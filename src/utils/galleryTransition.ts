import type { MediaItem } from '../api/mediaApi';

export const GALLERY_TRANSITION_EFFECTS = [
  'fade',
  'push-left',
  'push-right',
  'push-up',
  'push-down',
  'wipe-left',
  'wipe-right',
  'split-horizontal',
  'split-vertical',
  'zoom',
  'flip',
  'circle',
  'dissolve',
] as const;

export type TransitionEffect = (typeof GALLERY_TRANSITION_EFFECTS)[number];

let galleryPhotos: string[] = [];
let lastPhoto: string | null = null;
let lastEffect: TransitionEffect | null = null;

export function rememberGalleryPhotos(
  items: Pick<MediaItem, 'mediaType' | 'url' | 'thumbnailUrl' | 'displayUrl'>[],
): void {
  const photos = items
    .filter((item) => item.mediaType === 'PHOTO')
    .map((item) => item.displayUrl || item.thumbnailUrl || item.url)
    .filter(Boolean);

  if (photos.length > 0) {
    galleryPhotos = [...new Set(photos)];
  }
}

export function chooseGalleryTransitionPhoto(): string | null {
  if (galleryPhotos.length === 0) return null;
  const choices = galleryPhotos.filter((photo) => photo !== lastPhoto);
  const pool = choices.length > 0 ? choices : galleryPhotos;
  lastPhoto = pool[Math.floor(Math.random() * pool.length)];
  return lastPhoto;
}

export function chooseTransitionEffect(): TransitionEffect {
  const choices = GALLERY_TRANSITION_EFFECTS.filter((effect) => effect !== lastEffect);
  lastEffect = choices[Math.floor(Math.random() * choices.length)];
  return lastEffect;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chooseGalleryTransitionPhoto, chooseTransitionEffect, GALLERY_TRANSITION_EFFECTS, rememberGalleryPhotos,
} from './galleryTransition';

describe('gallery transitions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers at least ten effects and does not repeat the previous effect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    const effects = Array.from({ length: 50 }, () => chooseTransitionEffect());

    expect(GALLERY_TRANSITION_EFFECTS.length).toBeGreaterThanOrEqual(10);
    expect(effects.every((effect, index) => index === 0 || effect !== effects[index - 1])).toBe(true);
  });

  it('selects only gallery photos and avoids repeating the previous photo when possible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    rememberGalleryPhotos([
      { mediaType: 'PHOTO', url: '/photo-1.jpg', thumbnailUrl: '/thumb-1.jpg', displayUrl: '/display-1.jpg' },
      { mediaType: 'PHOTO', url: '/photo-2.jpg', thumbnailUrl: '/thumb-2.jpg', displayUrl: null },
      { mediaType: 'VIDEO', url: '/video.mp4', thumbnailUrl: '/video-poster.jpg', displayUrl: null },
    ]);

    expect(chooseGalleryTransitionPhoto()).toBe('/display-1.jpg');
    expect(chooseGalleryTransitionPhoto()).toBe('/thumb-2.jpg');
  });
});

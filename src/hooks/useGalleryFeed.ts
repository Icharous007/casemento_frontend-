import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listMediaFeed, type MediaSort } from '../api/mediaApi';

function createFeedId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createFeedIds(): Record<MediaSort, string> {
  return {
    random: createFeedId(),
    recent: createFeedId(),
    popular: createFeedId(),
  };
}

export function useGalleryFeed(guestId: string | undefined) {
  const [sort, setSort] = useState<MediaSort>('random');
  const [feedIds, setFeedIds] = useState(createFeedIds);
  const query = useInfiniteQuery({
    queryKey: ['guest', 'media', 'feed', guestId, sort, feedIds[sort]],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      listMediaFeed({ feedId: feedIds[sort], sort, cursor: pageParam, pageSize: 10 }, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!guestId,
    staleTime: 60_000,
    retry: false,
  });

  return {
    ...query,
    sort,
    setSort,
    refresh: () => setFeedIds(createFeedIds()),
  };
}

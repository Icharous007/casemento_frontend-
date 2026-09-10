import axios from 'axios';
import { guestClient, adminClient } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaComment {
  id: string;
  guestId: string;
  guestName: string;
  content: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  status: string;
  url: string;
  thumbnailUrl: string | null;
  displayUrl: string | null;
  contentType: string;
  caption: string | null;
  fileSizeBytes: number;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  uploadedAt: string;
  guestId: string;
  guestName: string;
}

export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  galleryHidden: boolean;
}

export interface LikeResponse {
  mediaId: string;
  liked: boolean;
}

interface MediaUploadIntentResponse {
  mediaId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  uploadUrl: string | null;
  uploadExpiresAt: string;
}

export interface AddCommentResponse {
  id: string;
  guestId: string;
  guestName: string;
  content: string;
  createdAt: string;
}

// Admin types
export interface MediaItemAdmin extends MediaItem {
  guestId: string;
  guestName: string;
  storageKey?: string;
}

export interface MediaListAdminResponse {
  items: MediaItemAdmin[];
  total: number;
}

// ─── Guest API ────────────────────────────────────────────────────────────────

export async function listMedia(params?: {
  page?: number;
  pageSize?: number;
  sort?: 'recent' | 'popular';
}): Promise<MediaListResponse> {
  const { data } = await guestClient.get<MediaListResponse>('/media', { params });
  return data;
}

export async function uploadMedia(
  file: File,
  idempotencyKey: string,
  caption: string,
  onProgress?: (percentage: number) => void,
): Promise<MediaItem> {
  const contentType = file.type.toLowerCase().trim();
  if (import.meta.env.DEV && import.meta.env.VITE_DIRECT_R2_UPLOAD !== 'true') {
    const form = new FormData();
    form.append('file', file);
    form.append('caption', caption.trim());
    const { data } = await guestClient.post<MediaItem>('/media/upload', form, {
      headers: { 'Content-Type': undefined },
      timeout: 600_000,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  }

  const { data: intent } = await guestClient.post<MediaUploadIntentResponse>('/media/upload-intents', {
    filename: file.name,
    contentType,
    fileSizeBytes: file.size,
    caption: caption.trim() || null,
  }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

  if (intent.status !== 'COMPLETED') {
    if (!intent.uploadUrl) {
      throw new Error('Não foi possível preparar o envio do arquivo.');
    }
    await axios.put(intent.uploadUrl, file, {
      headers: { 'Content-Type': contentType },
      timeout: 600_000,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
  }

  const { data } = await guestClient.post<MediaItem>(`/media/upload-intents/${intent.mediaId}/complete`);
  return data;
}

export async function addMediaLike(mediaId: string): Promise<LikeResponse> {
  const { data } = await guestClient.post<LikeResponse>(`/media/${mediaId}/like`);
  return data;
}

export async function removeMediaLike(mediaId: string): Promise<LikeResponse> {
  const { data } = await guestClient.delete<LikeResponse>(`/media/${mediaId}/like`);
  return data;
}

export async function listMediaComments(mediaId: string): Promise<MediaComment[]> {
  const { data } = await guestClient.get<MediaComment[]>(`/media/${mediaId}/comments`);
  return data;
}

export async function addMediaComment(mediaId: string, content: string): Promise<AddCommentResponse> {
  const { data } = await guestClient.post<AddCommentResponse>(`/media/${mediaId}/comments`, { content });
  return data;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function adminListMedia(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<MediaListAdminResponse> {
  const { data } = await adminClient.get<MediaItemAdmin[] | MediaListAdminResponse>('/admin/media', { params });
  // Backend returns a flat array; normalise to { items, total }
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return data;
}

export async function adminHideMedia(id: string): Promise<void> {
  await adminClient.put(`/admin/media/${id}/hide`);
}

export async function adminDeleteMedia(id: string): Promise<void> {
  await adminClient.delete(`/admin/media/${id}`);
}

export async function adminDeleteComment(commentId: string): Promise<void> {
  await adminClient.delete(`/admin/media/comments/${commentId}`);
}

export async function adminListMediaComments(mediaId: string): Promise<MediaComment[]> {
  const { data } = await adminClient.get<MediaComment[]>(`/admin/media/${mediaId}/comments`);
  return data;
}

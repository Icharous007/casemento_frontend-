import { guestClient, adminClient } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WallPost {
  id: string;
  postType: 'TEXT' | 'AUDIO';
  content?: string;
  audioUrl?: string;
  durationSec?: number;
  guestName: string;
  createdAt: string;
}

export interface WallListResponse {
  items: WallPost[];
  total: number;
  page: number;
  pageSize: number;
}

// Admin types
export interface WallPostAdmin extends WallPost {
  status: 'ACTIVE' | 'HIDDEN' | 'DELETED';
}

export interface WallListAdminResponse {
  items: WallPostAdmin[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WallSummary {
  totalActive: number;
  totalRemoved: number;
  textPosts: number;
  audioPosts: number;
}

// ─── Guest API ────────────────────────────────────────────────────────────────

export async function listWallPosts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<WallListResponse> {
  const { data } = await guestClient.get<WallListResponse>('/wall', { params });
  return data;
}

export async function createTextPost(content: string): Promise<WallPost> {
  const { data } = await guestClient.post<WallPost>('/wall', { content });
  return data;
}

export async function createAudioPost(file: File, durationSec: number): Promise<WallPost> {
  const form = new FormData();
  form.append('file', file);
  form.append('durationSec', String(durationSec));
  const { data } = await guestClient.post<WallPost>('/wall/audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function adminListWallPosts(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  eventId?: string;
}): Promise<WallListAdminResponse> {
  const { data } = await adminClient.get<WallListAdminResponse>('/admin/wall', { params });
  return data;
}

export async function adminGetWallSummary(eventId?: string): Promise<WallSummary> {
  const { data } = await adminClient.get<WallSummary>('/admin/wall/summary', {
    params: eventId ? { eventId } : undefined,
  });
  return data;
}

export async function adminDeleteWallPost(postId: string): Promise<void> {
  await adminClient.delete(`/admin/wall/${postId}`);
}

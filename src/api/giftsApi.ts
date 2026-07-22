import { guestClient, adminClient } from './client';

// ─── Guest types ──────────────────────────────────────────────────────────────

export interface GiftItem {
  id: string;
  title: string;
  description?: string;
  externalUrl?: string;
  imageUrl?: string;
  priceRange?: string;
  status: 'AVAILABLE' | 'PURCHASED' | 'UNAVAILABLE';
}

export interface GiftListResponse {
  items: GiftItem[];
}

export interface MarkPurchasedResponse {
  giftId: string;
  status: string;
  markedAt: string;
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface GiftItemAdmin extends GiftItem {
  displayOrder: number;
  visibleToGuests: boolean;
  purchasedBy?: { guestId: string; name: string } | null;
  purchasedAt?: string | null;
}

export interface GiftListAdminResponse {
  items: GiftItemAdmin[];
  total: number;
}

export interface CreateGiftRequest {
  title: string;
  description?: string;
  externalUrl?: string;
  imageUrl?: string;
  priceRange?: string;
  displayOrder?: number;
}

export type UpdateGiftRequest = Partial<CreateGiftRequest>;

// ─── Guest API ────────────────────────────────────────────────────────────────

export async function listGifts(): Promise<GiftListResponse> {
  const { data } = await guestClient.get<GiftItem[] | GiftListResponse>('/gifts');
  // Backend returns a flat array; normalise to { items }
  if (Array.isArray(data)) {
    return { items: data };
  }
  return data;
}

export async function markGiftPurchased(giftId: string): Promise<MarkPurchasedResponse> {
  const { data } = await guestClient.post<MarkPurchasedResponse>(`/gifts/${giftId}/mark-purchased`);
  return data;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function adminListGifts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<GiftListAdminResponse> {
  const { data } = await adminClient.get<GiftItemAdmin[] | GiftListAdminResponse>('/admin/gifts', { params });
  // Backend returns a flat array; normalise to { items, total }
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return data;
}

export async function adminCreateGift(body: CreateGiftRequest): Promise<GiftItemAdmin> {
  const { data } = await adminClient.post<GiftItemAdmin>('/admin/gifts', body);
  return data;
}

export async function adminUpdateGift(id: string, body: UpdateGiftRequest): Promise<GiftItemAdmin> {
  const { data } = await adminClient.put<GiftItemAdmin>(`/admin/gifts/${id}`, body);
  return data;
}

export async function adminDeleteGift(id: string): Promise<void> {
  await adminClient.delete(`/admin/gifts/${id}`);
}

export async function adminUnmarkGiftPurchased(id: string): Promise<GiftItemAdmin> {
  const { data } = await adminClient.put<GiftItemAdmin>(`/admin/gifts/${id}/unmark-purchased`);
  return data;
}

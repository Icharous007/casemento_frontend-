import { guestClient, adminClient, publicClient } from './client';

export type GiftCategory = 'WEDDING' | 'BRIDAL_SHOWER';

// ─── Guest types ──────────────────────────────────────────────────────────────

export interface GiftItem {
  id: string;
  title: string;
  description?: string;
  externalUrl?: string;
  imageUrl?: string;
  priceRange?: string;
  priceAmount?: number | null;
  category: GiftCategory;
  displayOrder?: number;
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
  purchasedBy?: { guestId: string | null; displayName: string | null } | null;
  purchasedAt?: string | null;
  contributions: Array<{
    id: string;
    giverName: string;
    giverPhone?: string | null;
    message?: string | null;
    paymentMethod: 'MANUAL' | 'PIX';
    paymentStatus: 'UNVERIFIED' | 'REPORTED';
    amount?: number | null;
    purchasedAt: string;
  }>;
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
  category?: GiftCategory;
  priceAmount?: number | null;
}

export type UpdateGiftRequest = Partial<CreateGiftRequest> & { clearPriceAmount?: boolean };

export interface PixPaymentResponse {
  title: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
  receiverName: string;
  receiverCity: string;
  payload: string;
  qrCodeBase64: string;
}

export interface PixContributionRequest {
  giverName: string;
  giverPhone: string;
  message?: string;
}

export interface PixSettings {
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  merchantName?: string | null;
  merchantCity: string;
}

export interface BridalShowerResponse {
  coupleNames: string;
  items: GiftItem[];
}

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
  category?: GiftCategory;
}): Promise<GiftListAdminResponse> {
  const { data } = await adminClient.get<GiftItemAdmin[] | GiftListAdminResponse>('/admin/gifts', { params });
  // Backend returns a flat array; normalise to { items, total }
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return data;
}

export async function getWeddingPix(giftId: string): Promise<PixPaymentResponse> {
  const { data } = await guestClient.get<PixPaymentResponse>(`/gifts/${giftId}/pix`);
  return data;
}

export async function reportWeddingPix(giftId: string, body: PixContributionRequest): Promise<void> {
  await guestClient.post(`/gifts/${giftId}/pix-contributions`, body);
}

export async function getBridalShower(): Promise<BridalShowerResponse> {
  const { data } = await publicClient.get<BridalShowerResponse>('/public/cha-de-panela');
  return data;
}

export async function getBridalShowerPix(giftId: string): Promise<PixPaymentResponse> {
  const { data } = await publicClient.get<PixPaymentResponse>(`/public/cha-de-panela/gifts/${giftId}/pix`);
  return data;
}

export async function reportBridalShowerPix(giftId: string, body: PixContributionRequest): Promise<void> {
  await publicClient.post(`/public/cha-de-panela/gifts/${giftId}/contributions`, body);
}

export async function getPixSettings(): Promise<PixSettings> {
  const { data } = await adminClient.get<PixSettings>('/admin/gifts/pix-settings');
  return data;
}

export async function updatePixSettings(body: PixSettings): Promise<PixSettings> {
  const { data } = await adminClient.put<PixSettings>('/admin/gifts/pix-settings', body);
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

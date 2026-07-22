import { adminClient } from './client';

export interface GuestItem {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  source: string | null;
  inviteStatus: string | null;
  accessToken: string | null;
  qrCodeUrl: string;
  rsvpStatus: string;
  createdAt: string;
}

export interface GuestListResponse {
  items: GuestItem[];
  page: number;
  pageSize: number;
  total: number;
}

export async function listGuests(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
  eventId?: string;
}): Promise<GuestListResponse> {
  const { data } = await adminClient.get<GuestListResponse>('/admin/guests', { params });
  return data;
}

export async function createGuest(body: {
  displayName: string;
  phone?: string;
  notes?: string;
}): Promise<GuestItem> {
  const { data } = await adminClient.post<GuestItem>('/admin/guests', body);
  return data;
}

export async function getGuest(guestId: string): Promise<GuestItem> {
  const { data } = await adminClient.get<GuestItem>(`/admin/guests/${guestId}`);
  return data;
}

export async function deleteGuest(guestId: string): Promise<void> {
  await adminClient.delete(`/admin/guests/${guestId}`);
}

export async function blockGuest(guestId: string): Promise<void> {
  await adminClient.post(`/admin/guests/${guestId}/block`);
}

export async function importGuestsFile(file: File): Promise<{
  imported: number;
  skipped: number;
  total: number;
  errors: { row: number; reason: string }[];
}> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await adminClient.post('/admin/guests/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ─── QR codes ─────────────────────────────────────────────────────────────────

export function getEventQrCodeUrl(eventId?: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const qs = eventId ? `?eventId=${eventId}` : '';
  return `${base}/admin/guests/qr-code${qs}`;
}

export function getQrCodesExportUrl(eventId?: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const qs = eventId ? `?eventId=${eventId}` : '';
  return `${base}/admin/guests/qr-codes/export${qs}`;
}

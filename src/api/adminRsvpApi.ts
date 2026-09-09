import { adminClient } from './client';

export interface RsvpItem {
  guestId: string;
  guestName: string;
  phone: string | null;
  guestType: 'ADULT' | 'CHILD';
  age: number | null;
  attendanceStatus: string;
  dietaryRestrictions: string | null;
  allergies: string | null;
  additionalInfo: string | null;
  confirmedByGuestName: string | null;
  respondedAt: string;
  lastChangedAt: string;
}

export interface RsvpListResponse {
  items: RsvpItem[];
  summary: { attending: number; declined: number; total: number };
}

export interface RsvpSummary {
  totalGuests: number;
  attending: number;
  declined: number;
  pending: number;
  attendingAdults: number;
  attendingChildren: number;
  withDietaryRestrictions: number;
  withAllergies: number;
  withAdditionalInfo: number;
}

export async function listRsvps(eventId?: string): Promise<RsvpListResponse> {
  const { data } = await adminClient.get<RsvpListResponse>('/admin/rsvps', {
    params: eventId ? { eventId } : undefined,
  });
  return data;
}

export async function getRsvpSummary(eventId?: string): Promise<RsvpSummary> {
  const { data } = await adminClient.get<RsvpSummary>('/admin/rsvps/summary', {
    params: eventId ? { eventId } : undefined,
  });
  return data;
}

export function getConfirmedRsvpExportUrl(eventId?: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const qs = eventId ? `?eventId=${eventId}` : '';
  return `${base}/admin/rsvps/confirmed/export${qs}`;
}

export async function overrideRsvp(
  guestId: string,
  body: { attendanceStatus: string; dietaryRestrictions?: string; allergies?: string; additionalInfo?: string }
): Promise<RsvpItem> {
  const { data } = await adminClient.put<RsvpItem>(`/admin/rsvps/${guestId}`, body);
  return data;
}

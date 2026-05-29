import { adminClient } from './client';

export interface RsvpItem {
  guestId: string;
  attendanceStatus: string;
  respondedAt: string;
  lastChangedAt: string;
}

export interface RsvpListResponse {
  items: RsvpItem[];
  summary: { attending: number; declined: number; total: number };
}

export async function listRsvps(eventId?: string): Promise<RsvpListResponse> {
  const { data } = await adminClient.get<RsvpListResponse>('/admin/rsvps', {
    params: eventId ? { eventId } : undefined,
  });
  return data;
}

export async function overrideRsvp(
  guestId: string,
  body: { attendanceStatus: string; dietaryRestrictions?: string; allergies?: string; additionalInfo?: string }
): Promise<RsvpItem> {
  const { data } = await adminClient.put<RsvpItem>(`/admin/rsvps/${guestId}`, body);
  return data;
}

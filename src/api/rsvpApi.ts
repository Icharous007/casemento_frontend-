import { guestClient } from './client';

export interface RsvpResponse {
  guestId: string;
  attendanceStatus: string;
  respondedAt: string;
  lastChangedAt: string;
}

export async function submitRsvp(body: {
  attendanceStatus: 'ATTENDING' | 'DECLINED';
  dietaryRestrictions?: string;
  allergies?: string;
  additionalInfo?: string;
}): Promise<RsvpResponse> {
  const { data } = await guestClient.put<RsvpResponse>('/me/rsvp', body);
  return data;
}

import { guestClient } from './client';

export interface EventSummary {
  title: string;
  coupleNames: string;
  eventStartAt: string;
  rsvpDeadlineAt: string;
  venueName: string;
  venueAddress: string;
}

export interface GuestResolveResponse {
  guestId: string;
  eventId: string;
  displayName: string;
  requiresProfileCompletion: boolean;
  event: EventSummary;
}

export async function resolveGuestToken(token: string): Promise<GuestResolveResponse> {
  const { data } = await guestClient.post<GuestResolveResponse>('/guest-access/resolve', { token });
  return data;
}

export interface GuestMeResponse {
  guestId: string;
  displayName: string;
  email: string;
  rsvpStatus: string;
  event: EventSummary;
}

export async function getMe(): Promise<GuestMeResponse> {
  const { data } = await guestClient.get<GuestMeResponse>('/me');
  return data;
}

export async function completeProfile(body: {
  confirmedName: string;
  confirmedEmail: string;
  confirmedPhone?: string;
  acceptedTerms: boolean;
}): Promise<{ guestId: string; confirmedEmail: string; profileCompleted: boolean }> {
  const { data } = await guestClient.post('/guest-profile', body);
  return data;
}

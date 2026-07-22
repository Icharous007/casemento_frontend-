import { guestClient } from './client';

export interface EventSummary {
  title: string;
  coupleNames: string;
  eventStartAt: string;
  rsvpDeadlineAt: string;
  venueName: string;
  venueAddress: string;
}

// ─── Save the Date self-registration ─────────────────────────────────────────

export interface RegisterAccessRequest {
  eventSlug: string;
  phone: string;
  displayName: string;
  acceptedTerms: boolean;
}

export interface RegisterAccessResponse {
  guestId: string;
  eventId: string;
  displayName: string;
  requiresProfileCompletion: boolean;
  accessToken: string;
  event: EventSummary;
}

export async function registerGuestAccess(body: RegisterAccessRequest): Promise<RegisterAccessResponse> {
  const { data } = await guestClient.post<RegisterAccessResponse>('/guest-access/register', body);
  return data;
}

// ─── Guest self ───────────────────────────────────────────────────────────────

export interface GuestMeResponse {
  guestId: string;
  displayName: string;
  phone: string;
  rsvpStatus: string;
  event: EventSummary;
}

export async function getMe(): Promise<GuestMeResponse> {
  const { data } = await guestClient.get<GuestMeResponse>('/me');
  return data;
}

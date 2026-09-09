import { guestClient } from './client';

export interface AddPartyMemberRequest {
  name: string;
  phone?: string;
  guestType: 'ADULT' | 'CHILD';
  age?: number;
}

export interface PartyMemberResponse {
  guestId: string;
  name: string;
  phone: string;
  guestType: string;
  age?: number;
  rsvpStatus: 'PENDING' | 'ATTENDING' | 'DECLINED';
  isSelf: boolean;
  managedByMe: boolean;
  managedByName?: string;
  createdAt: string;
}

/**
 * GET /api/v1/me/party
 * Lists all party members (self + dependents/managed guests) with RSVP status.
 */
export async function listPartyMembers(): Promise<PartyMemberResponse[]> {
  const { data } = await guestClient.get<PartyMemberResponse[]>('/me/party');
  return data;
}

/**
 * POST /api/v1/me/party
 * Adds a new party member (dependent or linked adult).
 */
export async function addPartyMember(
  request: AddPartyMemberRequest
): Promise<PartyMemberResponse> {
  const { data } = await guestClient.post<PartyMemberResponse>('/me/party', request);
  return data;
}

/**
 * PUT /api/v1/me/party/{guestId}/rsvp
 * Confirms RSVP (attendance/decline) for a specific party member.
 */
export async function confirmPartyMemberRsvp(
  guestId: string,
  attendanceStatus: 'ATTENDING' | 'DECLINED'
): Promise<{ guestId: string; status: string }> {
  const { data } = await guestClient.put<{ guestId: string; status: string }>(
    `/me/party/${guestId}/rsvp`,
    { attendanceStatus }
  );
  return data;
}

/**
 * DELETE /api/v1/me/party/{guestId}
 * Removes a party member (only if they haven't self-registered).
 */
export async function removePartyMember(guestId: string): Promise<void> {
  await guestClient.delete(`/me/party/${guestId}`);
}

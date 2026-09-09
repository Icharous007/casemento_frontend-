import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as partyApi from '../../api/partyApi';
import axios from 'axios';

vi.mock('axios');

describe('partyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPartyMembers', () => {
    it('should fetch list of party members', async () => {
      const mockMembers = [
        { guestId: '1', name: 'Self', isSelf: true },
        { guestId: '2', name: 'Child', isSelf: false },
      ];
      
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockMembers });

      const result = await partyApi.listPartyMembers();

      expect(axios.get).toHaveBeenCalledWith('/api/v1/me/party');
      expect(result).toEqual(mockMembers);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(axios.get).mockRejectedValueOnce(error);

      await expect(partyApi.listPartyMembers()).rejects.toThrow('API Error');
    });
  });

  describe('addPartyMember', () => {
    it('should add a new party member', async () => {
      const request = {
        name: 'João',
        phone: null,
        guestType: 'CHILD',
        age: 7,
      };
      
      const mockResponse = {
        guestId: '3',
        name: 'João',
        guestType: 'CHILD',
        age: 7,
        rsvpStatus: 'PENDING',
      };
      
      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await partyApi.addPartyMember(request);

      expect(axios.post).toHaveBeenCalledWith('/api/v1/me/party', request);
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const request = {
        name: '',
        phone: null,
        guestType: 'CHILD',
        age: null,
      };
      
      const apiError = {
        response: {
          status: 400,
          data: { code: 'NAME_EMPTY' },
        },
      };
      
      vi.mocked(axios.post).mockRejectedValueOnce(apiError);

      await expect(partyApi.addPartyMember(request)).rejects.toThrow();
    });
  });

  describe('confirmPartyMemberRsvp', () => {
    it('should confirm RSVP status', async () => {
      const guestId = '2';
      const status = 'ATTENDING';
      
      vi.mocked(axios.put).mockResolvedValueOnce({ data: { ok: true } });

      await partyApi.confirmPartyMemberRsvp(guestId, status);

      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/me/party/${guestId}/rsvp`,
        { attendanceStatus: status }
      );
    });
  });

  describe('removePartyMember', () => {
    it('should remove a party member', async () => {
      const guestId = '2';
      
      vi.mocked(axios.delete).mockResolvedValueOnce({ data: null });

      await partyApi.removePartyMember(guestId);

      expect(axios.delete).toHaveBeenCalledWith(`/api/v1/me/party/${guestId}`);
    });

    it('should handle removal errors', async () => {
      const guestId = '1';
      const apiError = {
        response: {
          status: 409,
          data: { code: 'CANNOT_REMOVE_SELF_REGISTERED' },
        },
      };
      
      vi.mocked(axios.delete).mockRejectedValueOnce(apiError);

      await expect(partyApi.removePartyMember(guestId)).rejects.toThrow();
    });
  });
});

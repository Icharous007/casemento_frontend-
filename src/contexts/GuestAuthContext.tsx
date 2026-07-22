import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setGuestToken, getGuestToken } from '../api/client';
import { type RegisterAccessResponse, getMe, type GuestMeResponse } from '../api/guestApi';

interface GuestState {
  guestId: string;
  displayName: string;
  eventId: string;
}

interface GuestAuthContextType {
  guest: GuestState | null;
  isAuthenticated: boolean;
  loginWithRegisteredAccess: (response: RegisterAccessResponse) => void;
  logout: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | null>(null);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestState | null>(null);

  // Try to restore session from stored token on mount
  useEffect(() => {
    const token = getGuestToken();
    if (token && !guest) {
      getMe()
        .then((me: GuestMeResponse) => {
          setGuest({
            guestId: me.guestId,
            displayName: me.displayName,
            eventId: '',
          });
        })
        .catch(() => {
          setGuestToken(null);
        });
    }
  }, []);

  function loginWithRegisteredAccess(response: RegisterAccessResponse) {
    setGuestToken(response.accessToken);
    setGuest({
      guestId: response.guestId,
      displayName: response.displayName,
      eventId: response.eventId,
    });
  }

  function logout() {
    setGuestToken(null);
    setGuest(null);
  }

  return (
    <GuestAuthContext.Provider value={{ guest, isAuthenticated: !!guest, loginWithRegisteredAccess, logout }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be inside GuestAuthProvider');
  return ctx;
}

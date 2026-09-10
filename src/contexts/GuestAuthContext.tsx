import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getGuestSession, setGuestSession } from '../api/client';
import { type RegisterAccessResponse, getMe } from '../api/guestApi';

interface GuestState {
  guestId: string;
  displayName: string;
  eventId: string;
  requiresProfileCompletion: boolean;
}

interface GuestAuthContextType {
  guest: GuestState | null;
  isAuthenticated: boolean;
  loginWithRegisteredAccess: (response: RegisterAccessResponse) => void;
  logout: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | null>(null);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestState | null>(() => {
    const session = getGuestSession();
    if (!session?.accessToken) return null;

    return {
      guestId: session.guestId,
      displayName: session.displayName,
      eventId: session.eventId,
      requiresProfileCompletion: session.requiresProfileCompletion,
    };
  });

  // Try to validate stored token on mount; keep session identity from latest login response.
  useEffect(() => {
    const session = getGuestSession();
    if (session?.accessToken) {
      getMe()
        .then(() => {})
        .catch(() => {
          setGuestSession(null);
          setGuest(null);
        });
    }
  }, []);

  function loginWithRegisteredAccess(response: RegisterAccessResponse) {
    setGuestSession(response);
    setGuest({
      guestId: response.guestId,
      displayName: response.displayName,
      eventId: response.eventId,
      requiresProfileCompletion: response.requiresProfileCompletion,
    });
  }

  function logout() {
    setGuestSession(null);
    setGuest(null);
  }

  return (
    <GuestAuthContext.Provider value={{ guest, isAuthenticated: !!guest, loginWithRegisteredAccess, logout }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be inside GuestAuthProvider');
  return ctx;
}

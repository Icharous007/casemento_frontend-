import { createContext, useContext, useState, type ReactNode } from 'react';
import { setGuestToken } from '../api/client';
import { type GuestResolveResponse, resolveGuestToken } from '../api/guestApi';

interface GuestAuthContextType {
  guest: GuestResolveResponse | null;
  isAuthenticated: boolean;
  resolve: (token: string) => Promise<GuestResolveResponse>;
  logout: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | null>(null);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestResolveResponse | null>(null);

  async function resolve(token: string): Promise<GuestResolveResponse> {
    setGuestToken(token);
    const data = await resolveGuestToken(token);
    setGuest(data);
    return data;
  }

  function logout() {
    setGuestToken(null);
    setGuest(null);
  }

  return (
    <GuestAuthContext.Provider value={{ guest, isAuthenticated: !!guest, resolve, logout }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be inside GuestAuthProvider');
  return ctx;
}

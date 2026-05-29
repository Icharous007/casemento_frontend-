import { createContext, useContext, useState, type ReactNode } from 'react';
import { setAdminAccessToken } from '../api/client';
import { adminLogin, adminLogout, type LoginResponse } from '../api/adminAuthApi';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CERIMONIALISTA';
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);

  async function login(email: string, password: string) {
    const data: LoginResponse = await adminLogin(email, password);
    setAdminAccessToken(data.accessToken);
    localStorage.setItem('admin_refresh_token', data.refreshToken);
    setUser(data.user);
  }

  async function logout() {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    try {
      if (refreshToken) await adminLogout(refreshToken);
    } finally {
      setAdminAccessToken(null);
      localStorage.removeItem('admin_refresh_token');
      setUser(null);
    }
  }

  return (
    <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
}

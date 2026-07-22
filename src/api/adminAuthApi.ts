import { adminClient } from './client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: { id: string; name: string; email: string; role: 'ADMIN' | 'CERIMONIALISTA' };
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const { data } = await adminClient.post<LoginResponse>('/admin/auth/login', { email, password });
  return data;
}

export async function adminLogout(refreshToken: string): Promise<void> {
  await adminClient.post('/admin/auth/logout', { refreshToken });
}

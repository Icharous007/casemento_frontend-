import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ─── Admin client ─────────────────────────────────────────────────────────────
let _adminAccessToken: string | null = null;

export function setAdminAccessToken(token: string | null) {
  _adminAccessToken = token;
}

export const adminClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

adminClient.interceptors.request.use((config) => {
  if (_adminAccessToken) {
    config.headers.Authorization = `Bearer ${_adminAccessToken}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('admin_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/admin/auth/refresh`, { refreshToken });
          setAdminAccessToken(data.accessToken);
          if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return adminClient(original);
        } catch {
          setAdminAccessToken(null);
          localStorage.removeItem('admin_refresh_token');
          window.location.href = '/admin/login';
        }
      } else {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Guest client ─────────────────────────────────────────────────────────────
let _guestToken: string | null = localStorage.getItem('guest_access_token');

export function setGuestToken(token: string | null) {
  _guestToken = token;
  if (token) localStorage.setItem('guest_access_token', token);
  else localStorage.removeItem('guest_access_token');
}

export function getGuestToken(): string | null {
  return _guestToken;
}

export const guestClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

guestClient.interceptors.request.use((config) => {
  if (_guestToken) {
    config.headers['X-Guest-Access-Token'] = _guestToken;
  }
  return config;
});

export default adminClient;


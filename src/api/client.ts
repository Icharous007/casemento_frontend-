import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const GUEST_SESSION_KEY = 'guest_session';
const LEGACY_GUEST_TOKEN_KEY = 'guest_access_token';

export interface GuestSession {
  accessToken: string;
  guestId: string;
  eventId: string;
  displayName: string;
  requiresProfileCompletion: boolean;
  event: {
    title: string;
    coupleNames: string;
    eventStartAt: string;
    rsvpDeadlineAt: string;
    venueName: string;
    venueAddress: string;
  };
}

function loadStoredGuestSession(): GuestSession | null {
  const raw = localStorage.getItem(GUEST_SESSION_KEY);
  if (!raw) {
    const legacyToken = localStorage.getItem(LEGACY_GUEST_TOKEN_KEY);
    return legacyToken
      ? {
          accessToken: legacyToken,
          guestId: '',
          eventId: '',
          displayName: '',
          requiresProfileCompletion: false,
          event: {
            title: '',
            coupleNames: '',
            eventStartAt: '',
            rsvpDeadlineAt: '',
            venueName: '',
            venueAddress: '',
          },
        }
      : null;
  }

  try {
    return JSON.parse(raw) as GuestSession;
  } catch {
    localStorage.removeItem(GUEST_SESSION_KEY);
    return null;
  }
}

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
let _guestSession: GuestSession | null = loadStoredGuestSession();

export function setGuestSession(session: GuestSession | null) {
  _guestSession = session;
  if (session) {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LEGACY_GUEST_TOKEN_KEY, session.accessToken);
  } else {
    localStorage.removeItem(GUEST_SESSION_KEY);
    localStorage.removeItem(LEGACY_GUEST_TOKEN_KEY);
  }
}

export function getGuestSession(): GuestSession | null {
  return _guestSession;
}

export function setGuestToken(token: string | null) {
  if (!token) {
    setGuestSession(null);
    return;
  }

  setGuestSession({
    accessToken: token,
    guestId: _guestSession?.guestId ?? '',
    eventId: _guestSession?.eventId ?? '',
    displayName: _guestSession?.displayName ?? '',
    requiresProfileCompletion: _guestSession?.requiresProfileCompletion ?? false,
    event: _guestSession?.event ?? {
      title: '',
      coupleNames: '',
      eventStartAt: '',
      rsvpDeadlineAt: '',
      venueName: '',
      venueAddress: '',
    },
  });
}

export function getGuestToken(): string | null {
  return _guestSession?.accessToken ?? null;
}

export const guestClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

guestClient.interceptors.request.use((config) => {
  const token = getGuestToken();
  if (token) {
    config.headers['X-Guest-Access-Token'] = token;
  }
  return config;
});

guestClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const isInvalidOrRevoked = (status === 401 && code === 'TOKEN_INVALID') || (status === 410 && code === 'TOKEN_REVOKED');

    if (isInvalidOrRevoked) {
      setGuestSession(null);
      if (!window.location.pathname.startsWith('/save-the-date')) {
        window.location.href = '/save-the-date';
      }
    }

    return Promise.reject(error);
  }
);

export default adminClient;


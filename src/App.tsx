import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { GuestAuthProvider } from './contexts/GuestAuthContext';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import GuestsPage from './pages/admin/GuestsPage';
import AdminRsvpPage from './pages/admin/RsvpPage';

// Guest pages
import AccessPage from './pages/guest/AccessPage';
import FirstAccessPage from './pages/guest/FirstAccessPage';
import GuestHomePage from './pages/guest/HomePage';
import GuestRsvpPage from './pages/guest/RsvpPage';

function RequireAdminAuth() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <AdminLayout><Outlet /></AdminLayout>;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <GuestAuthProvider>
        <Routes>
          {/* Guest routes */}
          <Route path="/acesso" element={<AccessPage />} />
          <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          <Route path="/home" element={<GuestHomePage />} />
          <Route path="/rsvp" element={<GuestRsvpPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<RequireAdminAuth />}>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/convidados" element={<GuestsPage />} />
            <Route path="/admin/rsvp" element={<AdminRsvpPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/acesso" replace />} />
        </Routes>
      </GuestAuthProvider>
    </AdminAuthProvider>
  );
}


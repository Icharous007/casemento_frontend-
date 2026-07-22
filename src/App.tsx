import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { GuestAuthProvider } from './contexts/GuestAuthContext';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import GuestsPage from './pages/admin/GuestsPage';
import AdminRsvpPage from './pages/admin/RsvpPage';
import AdminGiftsPage from './pages/admin/GiftsPage';
import AdminMediaPage from './pages/admin/MediaPage';
import AdminWallPage from './pages/admin/WallPage';

// Guest pages
import SaveTheDatePage from './pages/guest/SaveTheDatePage';
import GuestHomePage from './pages/guest/HomePage';
import GuestRsvpPage from './pages/guest/RsvpPage';
import GiftsPage from './pages/guest/GiftsPage';
import GalleryPage from './pages/guest/GalleryPage';
import WallPage from './pages/guest/WallPage';

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
          <Route path="/save-the-date" element={<SaveTheDatePage />} />
          <Route path="/home" element={<GuestHomePage />} />
          <Route path="/rsvp" element={<GuestRsvpPage />} />
          <Route path="/presentes" element={<GiftsPage />} />
          <Route path="/galeria" element={<GalleryPage />} />
          <Route path="/mural" element={<WallPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<RequireAdminAuth />}>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/convidados" element={<GuestsPage />} />
            <Route path="/admin/rsvp" element={<AdminRsvpPage />} />
            <Route path="/admin/presentes" element={<AdminGiftsPage />} />
            <Route path="/admin/galeria" element={<AdminMediaPage />} />
            <Route path="/admin/mural" element={<AdminWallPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/save-the-date" replace />} />
        </Routes>
      </GuestAuthProvider>
    </AdminAuthProvider>
  );
}


import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Redirects authenticated users away from the public homepage
const RootRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'owner') return <Navigate to="/owner/dashboard" replace />;
    return <Navigate to="/courts" replace />;
  }
  return <HomePage />;
};

// Public pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import CourtsPage from '../pages/customer/CourtsPage';
import CourtDetailPage from '../pages/customer/CourtDetailPage';
import TournamentsPage from '../pages/tournament/TournamentsPage';
import TournamentDetailPage from '../pages/tournament/TournamentDetailPage';

// Customer pages
import BookingsPage from '../pages/customer/BookingsPage';
import PaymentPage from '../pages/customer/PaymentPage';
import PaymentSuccessPage from '../pages/customer/PaymentSuccessPage';
import ProfilePage from '../pages/customer/ProfilePage';
import NotificationsPage from '../pages/NotificationsPage';

// Owner pages
import OwnerDashboard from '../pages/owner/OwnerDashboard';
import CourtManagementPage from '../pages/owner/CourtManagementPage';
import CourtFormPage from '../pages/owner/CourtFormPage';
import OwnerBookingsPage from '../pages/owner/OwnerBookingsPage';

// Tournament pages
import TournamentFormPage from '../pages/tournament/TournamentFormPage';

// Admin pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCourtsPage from '../pages/admin/AdminCourtsPage';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage';

const AppRouter = () => (
  <Routes>
    {/* Public routes */}
    <Route element={<MainLayout />}>
      <Route index element={<RootRoute />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="courts" element={<CourtsPage />} />
      <Route path="courts/:id" element={<CourtDetailPage />} />
      <Route path="tournaments" element={<TournamentsPage />} />
      {/* Static route MUST come before dynamic :id route */}
      <Route path="tournaments/new" element={<ProtectedRoute roles={['owner', 'admin']}><TournamentFormPage /></ProtectedRoute>} />
      <Route path="tournaments/:id" element={<TournamentDetailPage />} />

      {/* Authenticated routes (any role) */}
      <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

      {/* Customer routes */}
      <Route path="my-bookings" element={<ProtectedRoute roles={['customer']}><BookingsPage /></ProtectedRoute>} />
      <Route path="payment/:bookingId" element={<ProtectedRoute roles={['customer']}><PaymentPage /></ProtectedRoute>} />
      <Route path="payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="payment/verify" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
    </Route>

    {/* Owner dashboard routes */}
    <Route path="owner" element={<ProtectedRoute roles={['owner']}><DashboardLayout /></ProtectedRoute>}>
      <Route path="dashboard" element={<OwnerDashboard />} />
      <Route path="courts" element={<CourtManagementPage />} />
      <Route path="courts/new" element={<CourtFormPage />} />
      <Route path="courts/:id/edit" element={<CourtFormPage />} />
      <Route path="bookings" element={<OwnerBookingsPage />} />
    </Route>

    {/* Admin routes */}
    <Route path="admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="courts" element={<AdminCourtsPage />} />
      <Route path="bookings" element={<AdminBookingsPage />} />
      <Route path="payments" element={<AdminPaymentsPage />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;

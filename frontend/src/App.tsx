import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import CategoriesPage from './pages/CategoriesPage';
import LoansPage from './pages/LoansPage';
import DevicesPage from './pages/DevicesPage';
import SensorsPage from './pages/SensorsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';
import SupportPage from './pages/SupportPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ui';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/sensors" element={<SensorsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
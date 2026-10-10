import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ShowcasePage from './pages/ShowcasePage';
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
import { RoleName, ROLE_ADMIN, ROLE_DOSEN } from './constants/roles';

const STAFF: RoleName[] = [ROLE_ADMIN, ROLE_DOSEN];
const ADMIN_ONLY: RoleName[] = [ROLE_ADMIN];

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
            {/* Semua peran punya dashboard sendiri sesuai perannya */}
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/showcase" element={<ShowcasePage />} />

            {/* Dosen dan Admin boleh masuk */}
            <Route element={<ProtectedRoute allowedRoles={STAFF} />}>
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/sensors" element={<SensorsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* Hanya Admin */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Semua peran */}
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/loans" element={<LoansPage />} />
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
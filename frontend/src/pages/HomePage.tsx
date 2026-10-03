import { useAuth } from '../context/AuthContext';
import { isStaffRole, ROLE_MAHASISWA } from '../constants/roles';
import DashboardPage from './DashboardPage';
import StudentDashboardPage from './StudentDashboardPage';
import UserHomePage from './UserHomePage';

/** Halaman `/` menyesuaikan dashboard dengan peran pengguna. */
export default function HomePage() {
  const { user } = useAuth();

  if (isStaffRole(user?.role)) return <DashboardPage />;
  if (user?.role === ROLE_MAHASISWA) return <StudentDashboardPage />;
  return <UserHomePage />;
}
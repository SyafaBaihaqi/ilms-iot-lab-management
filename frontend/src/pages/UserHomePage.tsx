import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../constants/roles';

const shortcuts = [
  { to: '/inventory', label: 'Inventori', desc: 'Lihat komponen yang tersedia', icon: '📦' },
  { to: '/loans', label: 'Peminjaman', desc: 'Ajukan atau pantau status peminjaman', icon: '🔁' },
  { to: '/support', label: 'Customer Service', desc: 'Ajukan tiket kalau ada kendala', icon: '🎧' }
];

export default function UserHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500">
          Halo {user?.fullName}, kamu masuk sebagai {roleLabel(user?.role)}.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm text-slate-600">
          Pilih menu di samping untuk mulai. Butuh bantuan? Hubungi Customer Service.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {shortcuts.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="card p-4 text-left transition-colors hover:border-blue-300"
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="mt-2 text-sm font-semibold text-slate-800">{item.label}</p>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
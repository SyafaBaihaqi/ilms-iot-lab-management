import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request, parseError } from '../services/api';
import { StatCard, Loading, EmptyState, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../constants/roles';

interface Summary {
  inventory: { totalComponents: number; stockTotal: number; stockAvailable: number; stockBorrowed: number };
  loans: { total: number; pending: number; borrowed: number; overdue: number };
  users: { total: number };
  devices: { total: number; online: number; offline: number };
  recentActivity: any[];
  categories: { name: string; count: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaffRole(user?.role)) {
      navigate('/inventory');
      return;
    }

    request<any>('GET', '/dashboard/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!isStaffRole(user?.role)) return null;
  if (loading) return <Loading text="Memuat dashboard..." />;
  if (error) return <div className="text-red-600 text-sm">Gagal memuat dashboard: {error}</div>;
  if (!data) return <EmptyState />;

  const maxCategory = Math.max(1, ...data.categories.map((c) => c.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard Laboratorium</h2>
        <p className="text-sm text-slate-500">Ringkasan kondisi laboratorium saat ini</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Komponen" value={data.inventory.totalComponents} icon="📦" />
        <StatCard label="Stok Total" value={data.inventory.stockTotal} icon="🗃️" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Stok Tersedia" value={data.inventory.stockAvailable} icon="✅" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Sedang Dipinjam" value={data.inventory.stockBorrowed} icon="📤" color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Pengajuan Pending" value={data.loans.pending} icon="⏳" color="bg-amber-50 text-amber-600" />
        <StatCard label="Transaksi Pinjam" value={data.loans.total} icon="🔁" color="bg-blue-50 text-blue-600" />
        <StatCard label="Terlambat" value={data.loans.overdue} icon="⏰" color="bg-red-50 text-red-600" />
        <StatCard label="Device Online" value={`${data.devices.online}/${data.devices.total}`} icon="📡" color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Distribusi Komponen per Kategori</h3>
          {data.categories.length === 0 ? (
            <EmptyState text="Belum ada kategori" />
          ) : (
            <div className="space-y-3">
              {data.categories.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{c.name}</span>
                    <span className="font-semibold text-slate-800">{c.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${(c.count / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Aktivitas Stok Terbaru</h3>
          {data.recentActivity.length === 0 ? (
            <EmptyState text="Belum ada aktivitas" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((act) => (
                <li key={act.id} className="py-2 flex items-center gap-3 text-sm">
                  <StatusBadge value={act.transactionType} />
                  <span className="flex-1 text-slate-600">
                    {act.quantity > 0 ? `+${act.quantity}` : act.quantity} · {act.component?.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(act.createdAt).toLocaleString('id-ID')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
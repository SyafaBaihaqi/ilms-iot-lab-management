import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request, parseError } from '../services/api';
import { StatCard, Loading, EmptyState, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

interface LoanDetail {
  id: string;
  quantity: number;
  component?: { id: string; name: string; inventoryCode: string } | null;
}

interface Loan {
  id: string;
  status: 'Pending' | 'Approved' | 'Borrowed' | 'Returned' | 'Rejected' | 'Overdue' | 'Cancelled';
  loanDate: string;
  dueDate: string;
  returnDate?: string | null;
  details: LoanDetail[];
}

interface Ticket {
  id: string;
  ticketNumber?: string;
  subject: string;
  status: 'Open' | 'In_Progress' | 'Resolved' | 'Closed';
  priority?: string;
  createdAt: string;
}

const fmtDate = (value: string) => new Date(value).toLocaleDateString('id-ID');
const isOverdue = (loan: Loan) =>
  loan.status === 'Overdue' ||
  (loan.status === 'Borrowed' && new Date(loan.dueDate).getTime() < Date.now());

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      request<any>('GET', '/loans?limit=100'),
      request<any>('GET', '/tickets?limit=100')
    ])
      .then(([loanRes, ticketRes]) => {
        setLoans(loanRes.data.items ?? []);
        setTickets(ticketRes.data.items ?? []);
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Memuat dashboard..." />;
  if (error) return <div className="text-red-600 text-sm">Gagal memuat dashboard: {error}</div>;

  const borrowed = loans.filter((l) => l.status === 'Borrowed');
  const pending = loans.filter((l) => l.status === 'Pending');
  const overdue = loans.filter(isOverdue);
  const openTickets = tickets.filter((t) => t.status === 'Open' || t.status === 'In_Progress');
  const trackedLoans = loans.filter(
    (l) => l.status === 'Pending' || l.status === 'Approved' || l.status === 'Borrowed' || isOverdue(l)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard Mahasiswa</h2>
        <p className="text-sm text-slate-500">Halo {user?.fullName}, ringkasan aktivitas peminjaman dan tiket kamu</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Sedang Dipinjam" value={borrowed.length} icon="📤" color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Menunggu Persetujuan" value={pending.length} icon="⏳" color="bg-amber-50 text-amber-600" />
        <StatCard label="Terlambat" value={overdue.length} icon="⏰" color="bg-red-50 text-red-600" />
        <StatCard label="Tiket Terbuka" value={openTickets.length} icon="🎧" color="bg-blue-50 text-blue-600" />
      </div>

      {overdue.length > 0 && (
        <div className="card border-l-4 border-l-red-500 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {overdue.length} peminjaman melewati jatuh tempo. Segera kembalikan ke laboratorium.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => navigate('/loans')}>
          Ajukan Peminjaman
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
          Lihat Inventori
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/support')}>
          Ajukan Tiket
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Peminjaman Saya</h3>
            <button className="text-xs font-medium text-blue-600 hover:underline" onClick={() => navigate('/loans')}>
              Lihat semua
            </button>
          </div>
          {trackedLoans.length === 0 ? (
            <EmptyState text="Belum ada peminjaman" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {trackedLoans.slice(0, 5).map((loan) => (
                <li key={loan.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {loan.details.map((d) => d.component?.name).filter(Boolean).join(', ') || 'Komponen'}
                    </span>
                    <StatusBadge value={isOverdue(loan) && loan.status !== 'Overdue' ? 'Overdue' : loan.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    #{loan.id.slice(0, 8).toUpperCase()} · Jatuh tempo {fmtDate(loan.dueDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Tiket Saya</h3>
            <button className="text-xs font-medium text-blue-600 hover:underline" onClick={() => navigate('/support')}>
              Lihat semua
            </button>
          </div>
          {tickets.length === 0 ? (
            <EmptyState text="Belum ada tiket" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {tickets.slice(0, 4).map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{ticket.subject}</p>
                    <p className="text-xs text-slate-500">{fmtDate(ticket.createdAt)}</p>
                  </div>
                  <StatusBadge value={ticket.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
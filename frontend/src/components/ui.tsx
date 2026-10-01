import React from 'react';

// Reusable status badge
export function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700',
    Inactive: 'bg-slate-100 text-slate-600',
    Good: 'bg-emerald-100 text-emerald-700',
    Damaged: 'bg-red-100 text-red-700',
    'Under Repair': 'bg-amber-100 text-amber-700',
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-blue-100 text-blue-700',
    Borrowed: 'bg-indigo-100 text-indigo-700',
    Returned: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    Overdue: 'bg-red-600 text-white',
    Cancelled: 'bg-slate-100 text-slate-600',
    Online: 'bg-emerald-100 text-emerald-700',
    Offline: 'bg-slate-200 text-slate-600',
    Maintenance: 'bg-amber-100 text-amber-700',
    Admin: 'bg-blue-100 text-blue-700',
    User: 'bg-slate-100 text-slate-700',
    Open: 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-amber-100 text-amber-700',
    Resolved: 'bg-emerald-100 text-emerald-700',
    Closed: 'bg-slate-200 text-slate-600',
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700'
  };
  return <span className={`badge ${map[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>;
}

export function StatCard({
  label,
  value,
  icon,
  color = 'bg-blue-50 text-blue-600'
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  color?: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function Loading({ text = 'Memuat data...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

export function EmptyState({ text = 'Belum ada data.' }: { text?: string }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <p className="text-4xl mb-2">🗂️</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  wide,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-slate-500">
        Halaman {page} dari {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <button
          className="btn btn-secondary px-3 py-1"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ← Prev
        </button>
        <button
          className="btn btn-secondary px-3 py-1"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Terjadi kesalahan pada tampilan' };
  }

  componentCatch(error: any) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="max-w-md mx-auto card p-6 bg-red-50 border border-red-200">
            <p className="text-3xl mb-2">⚠️</p>
            <h3 className="font-bold text-red-800 mb-1">Gagal Memuat Halaman</h3>
            <p className="text-xs text-red-600 mb-4">{this.state.error}</p>
            <button
              className="btn btn-primary text-xs"
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.reload();
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
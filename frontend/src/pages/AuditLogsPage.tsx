import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, Pagination } from '../components/ui';

interface AuditUser {
  id: string;
  username: string;
  fullName: string;
  role?: { name: string };
}

interface AuditEntry {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  user?: AuditUser | null;
}

interface Facets {
  entityTypes: { value: string; count: number }[];
  actions: { value: string; count: number }[];
}

const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  approve: 'bg-blue-100 text-blue-700',
  reject: 'bg-red-100 text-red-700',
  return: 'bg-indigo-100 text-indigo-700',
  cancel: 'bg-slate-100 text-slate-600',
  close: 'bg-slate-200 text-slate-600',
  adjust_stock: 'bg-amber-100 text-amber-700',
  reply: 'bg-blue-100 text-blue-700',
  update_status: 'bg-amber-100 text-amber-700'
};

function actionBadgeClass(action: string): string {
  const key = action.split('.')[1] || '';
  return ACTION_STYLE[key] || 'bg-slate-100 text-slate-600';
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [facets, setFacets] = useState<Facets>({ entityTypes: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());

      const res = await request<any>('GET', `/audit-logs?${params.toString()}`);
      const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setItems(list);
      setTotalPages(res.data?.meta?.totalPages || res.meta?.totalPages || 1);
      setTotal(res.data?.meta?.total ?? res.meta?.total ?? list.length);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, action, from, to]);

  const fetchFacets = useCallback(async () => {
    try {
      const res = await request<any>('GET', '/audit-logs/facets');
      if (res.data) setFacets(res.data);
    } catch {
      // filter facets bukan hal kritis
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchFacets();
  }, [fetchFacets]);

  const resetFilters = () => {
    setSearch('');
    setEntityType('');
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasFilter = Boolean(search || entityType || action || from || to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Log Audit</h1>
          <p className="text-sm text-slate-500">
            Rekam jejak setiap perubahan data penting (stok, peminjaman, pengguna, perangkat, tiket).
          </p>
        </div>
        <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
          {total} aktivitas
        </span>
      </div>

      {/* Filter */}
      <div className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="Cari aksi / entitas / ID / nama pengguna..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Entitas</option>
            {facets.entityTypes.map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} ({f.count})
              </option>
            ))}
          </select>
          <select
            className="input"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Aksi</option>
            {facets.actions.map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} ({f.count})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {hasFilter && (
          <button className="btn btn-secondary !py-1.5 text-xs" onClick={resetFilters}>
            Reset Filter
          </button>
        )}
      </div>

      {error && <div className="card border-l-4 border-l-red-500 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Loading text="Memuat log audit..." />
      ) : items.length === 0 ? (
        <EmptyState text="Belum ada aktivitas yang tercatat." />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pelaku</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? (
                      <>
                        <div className="font-medium text-slate-800">{log.user.fullName}</div>
                        <div className="text-xs text-slate-500">
                          {log.user.username} · {log.user.role?.name || '-'}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sistem / API</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${actionBadgeClass(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-700">{log.entityType}</div>
                    {log.entityId && (
                      <div className="max-w-[160px] truncate font-mono text-[10px] text-slate-400">
                        {log.entityId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ipAddress || '-'}</td>
                  <td className="px-4 py-3">
                    {log.metadata ? (
                      <button
                        className="btn btn-secondary !py-1 text-xs"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        {expanded === log.id ? 'Tutup' : 'Lihat'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expanded && (
            <div className="border-t border-slate-200 bg-slate-900 p-4">
              <pre className="overflow-x-auto text-xs text-emerald-300">
                {formatJson(items.find((i) => i.id === expanded)?.metadata)}
              </pre>
            </div>
          )}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

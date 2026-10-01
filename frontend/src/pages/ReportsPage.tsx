import { useState } from 'react';
import { request } from '../services/api';

interface ReportRow {
  [key: string]: any;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export default function ReportsPage() {
  const [active, setActive] = useState<'inventory' | 'borrowing' | 'damage' | 'iot'>('inventory');
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchReport = async (type: typeof active, format: 'json' | 'csv' = 'json') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type === 'borrowing') {
        if (from) params.set('from', `${from}T00:00:00.000Z`);
        if (to) params.set('to', `${to}T23:59:59.999Z`);
      }
      if (format === 'csv') params.set('format', 'csv');

      const url = `/reports/${type}${params.toString() ? `?${params}` : ''}`;
      if (format === 'csv') {
        const res = await request<any>('GET', url, undefined, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(res);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `laporan-${type}.csv`;
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }
      const res = await request<any>('GET', url);
      setData(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: typeof active; label: string }[] = [
    { key: 'inventory', label: 'Inventaris' },
    { key: 'borrowing', label: 'Peminjaman' },
    { key: 'damage', label: 'Kerusakan' },
    { key: 'iot', label: 'IoT Device' }
  ];

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Laporan</h2>
        <p className="text-sm text-slate-500">Generasi & ekspor laporan inventaris, peminjaman, kerusakan, dan IoT</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key);
              setData(null);
            }}
            className={`badge px-3 py-1 cursor-pointer ${
              active === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}

        {active === 'borrowing' && (
          <>
            <input className="input max-w-[160px] !py-1.5" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-xs text-slate-400">s.d.</span>
            <input className="input max-w-[160px] !py-1.5" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}

        <div className="flex gap-2 ml-auto">
          <button className="btn btn-primary !py-1.5" onClick={() => fetchReport(active)}>
            {loading ? 'Memuat...' : 'Lihat'}
          </button>
          <button className="btn btn-secondary !py-1.5" onClick={() => fetchReport(active, 'csv')}>
            ⬇ CSV
          </button>
        </div>
      </div>

      {data && (
        <div className="card overflow-x-auto">
          {data.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Tidak ada data untuk laporan ini</div>
          ) : (
            <table className="table-base text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="table-th">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columns.map((col) => (
                      <td key={col} className="table-td">
                        {Array.isArray(row[col]) ? row[col].join(', ') : String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
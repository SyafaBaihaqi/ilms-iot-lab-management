import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, StatusBadge, Pagination, Modal, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../constants/roles';

interface LoanDetailItem {
  id: string;
  quantity: number;
  conditionBefore?: string;
  conditionAfter?: string;
  damageNotes?: string;
  component?: { id: string; name: string; inventoryCode?: string };
}

interface Loan {
  id: string;
  status: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  notes?: string;
  user?: { id: string; fullName: string; username: string };
  details: LoanDetailItem[];
}

export default function LoansPage() {
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);
  const [items, setItems] = useState<Loan[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create loan modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formItems, setFormItems] = useState<{ componentId: string; quantity: number }[]>([
    { componentId: '', quantity: 1 }
  ]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Return modal
  const [returnLoan, setReturnLoan] = useState<Loan | null>(null);
  const [returnItems, setReturnItems] = useState<Record<string, { conditionAfter: string; damageNotes: string }>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request<any>(
        'GET',
        `/loans?${status ? `status=${status}&` : ''}page=${page}&limit=10`
      );
      const itemsList = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const total = res.data?.meta?.totalPages || res.meta?.totalPages || 1;
      setItems(itemsList);
      setTotalPages(total);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    request<any>('GET', '/components?limit=100')
      .then((res) => {
        const comps = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setComponents(comps);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setFormItems([{ componentId: '', quantity: 1 }]);
    setDueDate('');
    setNotes('');
    setError('');
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await request('POST', '/loans', {
        dueDate,
        notes,
        items: formItems.filter((i) => i.componentId && i.quantity > 0)
      });
      setCreateOpen(false);
      fetchData();
    } catch (err) {
      setError(parseError(err));
    }
  };

  const openReturn = (loan: Loan) => {
    setReturnLoan(loan);
    const init: Record<string, any> = {};
    for (const d of loan.details) {
      init[d.id] = { conditionAfter: 'Good', damageNotes: '' };
    }
    setReturnItems(init);
  };

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnLoan) return;
    try {
      await request('PUT', `/loans/${returnLoan.id}/return`, {
        items: Object.entries(returnItems).map(([loanDetailId, v]) => ({
          loanDetailId,
          conditionAfter: v.conditionAfter,
          damageNotes: v.damageNotes || undefined
        }))
      });
      setReturnLoan(null);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  const actionFor = async (loan: Loan, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('Tolak pengajuan ini?')) return;
    if (action === 'approve' && !confirm('Setujui dan kurangi stok untuk peminjaman ini?')) return;
    try {
      await request('PUT', `/loans/${loan.id}/${action}`, { reason: 'Ditolak oleh admin' });
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Peminjaman Komponen</h2>
          <p className="text-sm text-slate-500">
            {isStaff ? 'Kelola seluruh pengajuan peminjaman' : 'Ajukan & pantau peminjaman Anda'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Ajukan Peminjaman
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'Pending', 'Borrowed', 'Returned', 'Overdue', 'Rejected', 'Cancelled'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`badge px-3 py-1 cursor-pointer ${
              status === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Belum ada transaksi peminjaman" />
        ) : (
          items.map((loan) => (
            <div key={loan.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">
                    #{loan.id.slice(0, 8).toUpperCase()}
                    {isStaff && loan.user && <span className="text-slate-500 font-normal"> · {loan.user.fullName}</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    Pinjam: {new Date(loan.loanDate).toLocaleDateString('id-ID')} · Jatuh tempo:{' '}
                    {new Date(loan.dueDate).toLocaleDateString('id-ID')}
                    {loan.returnDate && ` · Kembali: ${new Date(loan.returnDate).toLocaleDateString('id-ID')}`}
                  </p>
                </div>
                <StatusBadge value={loan.status} />
              </div>

              <div className="mt-3 space-y-1">
                {loan.details.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-700">
                      {d.component?.name} <span className="text-slate-400">×{d.quantity}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {d.conditionAfter ? `Kondisi pulang: ${d.conditionAfter}` : `Kondisi pinjam: ${d.conditionBefore || 'Good'}`}
                    </span>
                  </div>
                ))}
              </div>

              {isStaff && (
                <div className="flex gap-2 mt-3">
                  {loan.status === 'Pending' && (
                    <>
                      <button className="btn btn-success !py-1 text-xs" onClick={() => actionFor(loan, 'approve')}>
                        Setujui
                      </button>
                      <button className="btn btn-danger !py-1 text-xs" onClick={() => actionFor(loan, 'reject')}>
                        Tolak
                      </button>
                    </>
                  )}
                  {(loan.status === 'Borrowed' || loan.status === 'Overdue') && (
                    <button className="btn btn-primary !py-1 text-xs" onClick={() => openReturn(loan)}>
                      Proses Pengembalian
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && items.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      {/* Create Loan Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajukan Peminjaman">
        <form onSubmit={submitCreate} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>}
          <Field label="Jatuh Tempo">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
          <div className="space-y-2">
            <label className="label">Komponen</label>
            {formItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_36px] gap-2">
                <select
                  className="input"
                  value={item.componentId}
                  onChange={(e) => {
                    const next = [...formItems];
                    next[idx] = { ...next[idx], componentId: e.target.value };
                    setFormItems(next);
                  }}
                  required
                >
                  <option value="">Pilih komponen</option>
                  {components
                    .filter((c) => c.stockAvailable > 0)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.stockAvailable} tersedia)
                      </option>
                    ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...formItems];
                    next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                    setFormItems(next);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-danger !px-2 !py-1"
                  disabled={formItems.length === 1}
                  onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-blue-600 text-sm hover:underline"
            onClick={() => setFormItems([...formItems, { componentId: '', quantity: 1 }])}
          >
            + Tambah item
          </button>
          <Field label="Catatan">
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Ajukan
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal open={!!returnLoan} onClose={() => setReturnLoan(null)} title="Proses Pengembalian">
        <form onSubmit={submitReturn} className="space-y-4">
          {returnLoan?.details.map((d) => (
            <div key={d.id} className="border border-slate-200 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-800 mb-2">
                {d.component?.name} <span className="text-slate-400">×{d.quantity}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input"
                  value={returnItems[d.id]?.conditionAfter || 'Good'}
                  onChange={(e) =>
                    setReturnItems((prev) => ({
                      ...prev,
                      [d.id]: { ...prev[d.id], conditionAfter: e.target.value }
                    }))
                  }
                >
                  <option value="Good">Baik</option>
                  <option value="Damaged">Rusak</option>
                </select>
                <input
                  className="input"
                  placeholder="Catatan kerusakan"
                  value={returnItems[d.id]?.damageNotes || ''}
                  onChange={(e) =>
                    setReturnItems((prev) => ({
                      ...prev,
                      [d.id]: { ...prev[d.id], damageNotes: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setReturnLoan(null)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Selesaikan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
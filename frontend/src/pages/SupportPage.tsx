import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, StatusBadge, Pagination, Modal, Field, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../constants/roles';

type SupportMode = 'staff' | 'user';

function SupportLogo({ mode }: { mode: SupportMode }) {
  const isStaff = mode === 'staff';

  return (
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
        isStaff ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
      }`}
      title={isStaff ? 'Mode Dosen/Admin - Kelola Tiket' : 'Mode Mahasiswa - Ajukan Tiket'}
      aria-label={isStaff ? 'Logo Customer Service Dosen dan Admin' : 'Logo Customer Service Mahasiswa'}
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isStaff ? (
          <>
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </>
        ) : (
          <>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </>
        )}
      </svg>
    </div>
  );
}

interface TicketMessage {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string; username: string };
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  user?: { id: string; fullName: string; username: string };
  assignee?: { id: string; fullName: string } | null;
  messages: TicketMessage[];
  _count?: { messages: number };
}

interface TicketStats {
  total: number;
  Open: number;
  'In Progress': number;
  Resolved: number;
  Closed: number;
}

// Value = nilai enum Prisma yang dikirim ke API (bukan label tampilan).
const STATUS_OPTIONS = ['', 'Open', 'In_Progress', 'Resolved', 'Closed'];
const STATUS_LABEL: Record<string, string> = {
  Open: 'Open',
  In_Progress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed'
};
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export default function SupportPage() {
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);

  const [items, setItems] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    Open: 0,
    'In Progress': 0,
    Resolved: 0,
    Closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');

  const [detail, setDetail] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminPriority, setAdminPriority] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (search) params.set('search', search);
      const res = await request<any>('GET', `/tickets?${params.toString()}`);
      setItems(res.data?.items || (Array.isArray(res.data) ? res.data : []));
      setTotalPages(res.data?.meta?.totalPages || res.meta?.totalPages || 1);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [status, priority, search, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await request<any>('GET', '/tickets/stats');
      if (res.data) setStats(res.data);
    } catch {
      // statistik tidak kritis
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const openCreate = () => {
    setSubject('');
    setMessage('');
    setNewPriority('Medium');
    setError('');
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await request('POST', '/tickets', { subject, message, priority: newPriority });
      setCreateOpen(false);
      setPage(1);
      fetchList();
      fetchStats();
    } catch (err) {
      setError(parseError(err));
    }
  };

  const openDetail = async (ticket: Ticket) => {
    setDetailLoading(true);
    setDetail(ticket);
    setReply('');
    setReplyError('');
    setAdminStatus(ticket.status);
    setAdminPriority(ticket.priority);
    try {
      const res = await request<any>('GET', `/tickets/${ticket.id}`);
      setDetail(res.data);
    } catch (err) {
      setReplyError(parseError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (id: string) => {
    const res = await request<any>('GET', `/tickets/${id}`);
    setDetail(res.data);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setReplyError('');
    try {
      await request('POST', `/tickets/${detail.id}/replies`, { message: reply });
      setReply('');
      await refreshDetail(detail.id);
      fetchList();
      fetchStats();
    } catch (err) {
      setReplyError(parseError(err));
    }
  };

  const saveAdminUpdate = async () => {
    if (!detail) return;
    setReplyError('');
    try {
      await request('PUT', `/tickets/${detail.id}`, { status: adminStatus, priority: adminPriority });
      await refreshDetail(detail.id);
      fetchList();
      fetchStats();
    } catch (err) {
      setReplyError(parseError(err));
    }
  };

  const closeTicket = async () => {
    if (!detail) return;
    if (!confirm('Tutup tiket ini?')) return;
    try {
      await request('PUT', `/tickets/${detail.id}/close`);
      await refreshDetail(detail.id);
      fetchList();
      fetchStats();
    } catch (err) {
      setReplyError(parseError(err));
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Hapus tiket ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await request('DELETE', `/tickets/${id}`);
      setDetail(null);
      fetchList();
      fetchStats();
    } catch (err) {
      setReplyError(parseError(err));
    }
  };

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <SupportLogo mode={isStaff ? 'staff' : 'user'} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Customer Service</h2>
            <p className="text-sm text-slate-500">
              {isStaff
                ? 'Kelola seluruh tiket pertanyaan dari pengguna'
                : 'Ajukan pertanyaan kapan saja, admin lab akan membalas di sini'}
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Ajukan Tiket
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Tiket" value={stats.total} icon="🎫" />
        <StatCard label="Baru" value={stats.Open} icon="🆕" color="bg-blue-50 text-blue-600" />
        <StatCard label="Diproses" value={stats['In Progress']} icon="⏳" color="bg-amber-50 text-amber-600" />
        <StatCard label="Selesai" value={stats.Resolved} icon="✅" color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
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
              {s ? STATUS_LABEL[s] || s : 'Semua'}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {isStaff && (
            <input
              className="input sm:max-w-xs"
              placeholder="Cari subjek / nama pengguna..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
          <select
            className="input sm:max-w-[180px]"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua prioritas</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Belum ada tiket. Ajukan pertanyaan pertama Anda." />
        ) : (
          items.map((ticket) => {
            const last = ticket.messages?.[0];
            return (
              <div key={ticket.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 break-words">
                      #{ticket.id.slice(0, 8).toUpperCase()} · {ticket.subject}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isStaff && ticket.user ? `${ticket.user.fullName} (${ticket.user.username}) · ` : ''}
                      Dibuat {formatDate(ticket.createdAt)}
                      {ticket._count ? ` · ${ticket._count.messages} pesan` : ''}
                      {ticket.closedAt ? ` · Ditutup ${formatDate(ticket.closedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                  </div>
                </div>

                {last && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-400 text-xs">
                      {last.sender?.fullName || (last.isAdmin ? 'Admin' : 'Pengguna')}:{' '}
                    </span>
                    {last.message}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button className="btn btn-primary !py-1 text-xs" onClick={() => openDetail(ticket)}>
                    Buka Tiket
                  </button>
                  <button className="btn btn-danger !py-1 text-xs" onClick={() => deleteTicket(ticket.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && items.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      {/* Create Ticket Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajukan Tiket Baru">
        <form onSubmit={submitCreate} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>
          )}
          <Field label="Subjek">
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Komponen Arduino tidak bisa dipinjam"
              required
              minLength={5}
              maxLength={150}
            />
          </Field>
          <Field label="Prioritas">
            <select className="input" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pesan">
            <textarea
              className="input"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan pertanyaan atau kendala Anda..."
              required
              minLength={10}
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Kirim Tiket
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        title={detail ? detail.subject : 'Detail Tiket'}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400">
                <p>
                  #{detail.id.slice(0, 8).toUpperCase()} ·{' '}
                  {isStaff ? `${detail.user?.fullName} (${detail.user?.username})` : detail.user?.username}
                </p>
                <p>Dibuat {formatDate(detail.createdAt)}</p>
                {detail.assignee && <p>Ditangani: {detail.assignee.fullName}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={detail.priority} />
                <StatusBadge value={detail.status} />
              </div>
            </div>

            {isStaff && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end bg-slate-50 rounded-lg p-3">
                <Field label="Status">
                  <select className="input" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                    {STATUS_OPTIONS.filter(Boolean).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s] || s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prioritas">
                  <select
                    className="input"
                    value={adminPriority}
                    onChange={(e) => setAdminPriority(e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <button type="button" className="btn btn-primary mb-3" onClick={saveAdminUpdate}>
                  Simpan
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {detailLoading ? (
                <Loading text="Memuat percakapan..." />
              ) : (
                detail.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        m.isAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <p className={`text-[10px] mb-0.5 ${m.isAdmin ? 'text-blue-100' : 'text-slate-400'}`}>
                        {m.sender?.fullName || (m.isAdmin ? 'Admin' : 'Pengguna')} · {formatDate(m.createdAt)}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {detail.status !== 'Closed' || isStaff ? (
              <form onSubmit={sendReply} className="space-y-2 border-t border-slate-200 pt-3">
                {replyError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">
                    {replyError}
                  </div>
                )}
                <textarea
                  className="input"
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isStaff ? 'Tulis balasan untuk pengguna...' : 'Tulis pesan tambahan...'}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-primary flex-1">
                    Kirim Balasan
                  </button>
                  {!isStaff && detail.status !== 'Closed' && (
                    <button type="button" className="btn btn-secondary" onClick={closeTicket}>
                      Tutup Tiket
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="border-t border-slate-200 pt-3 text-sm text-slate-500">
                Tiket sudah ditutup. Balas kembali untuk membuka tiket.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

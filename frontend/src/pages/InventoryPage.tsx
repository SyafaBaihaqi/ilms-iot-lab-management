import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { request, parseError } from '../services/api';
import { Loading, EmptyState, StatusBadge, Pagination, Modal, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../constants/roles';

interface Category {
  id: string;
  name: string;
}

interface Component {
  id: string;
  name: string;
  inventoryCode: string;
  description?: string;
  stockTotal: number;
  stockAvailable: number;
  condition: string;
  location?: string;
  status: string;
  estimatedPrice?: number | string;
  category?: Category;
  createdAt?: string;
}

const emptyForm = {
  name: '',
  inventoryCode: '',
  categoryId: '',
  description: '',
  stockTotal: 0,
  location: '',
  condition: 'Good',
  status: 'Active',
  estimatedPrice: undefined as number | undefined
};

const sortOptions = [
  { value: 'createdAt_desc', label: 'Terbaru' },
  { value: 'name_asc', label: 'Nama A-Z' },
  { value: 'name_desc', label: 'Nama Z-A' },
  { value: 'category_asc', label: 'Kategori A-Z' },
  { value: 'category_desc', label: 'Kategori Z-A' },
  { value: 'stock_desc', label: 'Stok Terbanyak' },
  { value: 'stock_asc', label: 'Stok Tersedikit' }
];

export default function InventoryPage() {
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);
  const [items, setItems] = useState<Component[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Component | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [, setSearchParams] = useSearchParams();
  const [scanned, setScanned] = useState<Component | null>(null);
  const scanHandledRef = useRef<string | null>(null);
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const lastWheelFlip = useRef(0);

  // Scroll wheel pada tabel -> pindah halaman (prev/next) dengan debounce
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      const now = Date.now();
      if (now - lastWheelFlip.current < 600) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      lastWheelFlip.current = now;
      e.preventDefault();
      setPage((p) => {
        const next = p + dir;
        if (next < 1) return 1;
        if (next > totalPages) return Math.max(1, totalPages);
        return next;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [totalPages]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await request<any>(
        'GET',
        `/components?search=${encodeURIComponent(search)}&sortBy=${sortBy}&page=${page}&limit=10`
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
  }, [search, sortBy, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await request<any>('GET', '/categories');
      setCategories(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isStaff) fetchCategories();
  }, [isStaff, fetchCategories]);

  // QR yang dipindai membuka /inventory?component=<id>.
  // Ambil datanya langsung (bukan lewat search) supaya pasti ketemu,
  // lalu saring tabel ke kode inventori + sorot barisnya.
  //
  // PENTING: param dibaca dari window.location, dan efek sengaja
  // tanpa dependency. Kalau searchParams ikut jadi dependency,
  // setSearchParams untuk melucuti query memicu efek ulang, cleanup
  // men-set cancelled = true, lalu respons fetch dibuang dan banner
  // tidak pernah muncul. Setter disimpan di ref supaya identitasnya
  // tidak pernah jadi pemicu efek ulang. Guard ref menjaga satu id
  // hanya diproses sekali.
  useEffect(() => {
    const componentId = new URLSearchParams(window.location.search).get('component');
    if (!componentId || scanHandledRef.current === componentId) return;
    scanHandledRef.current = componentId;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await request<any>('GET', `/components/${componentId}`);
        const data = res.data;
        if (cancelled || !data?.id) return;
        setScanned(data);
        setSearch(data.inventoryCode || '');
        setPage(1);
      } catch (err: any) {
        if (!cancelled) {
          setScanned(null);
          setError(
            err?.response?.status === 404
              ? 'Komponen dari QR tidak ditemukan. Pastikan label QR berasal dari inventori ini.'
              : parseError(err)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    setSearchParamsRef.current({}, { replace: true });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearScanned = () => {
    setScanned(null);
    setSearch('');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (c: Component) => {
    setEditing(c);
    setForm({
      name: c.name,
      inventoryCode: c.inventoryCode,
      categoryId: c.category?.id || '',
      description: c.description || '',
      stockTotal: c.stockTotal,
      location: c.location || '',
      condition: c.condition,
      status: c.status,
      estimatedPrice: c.estimatedPrice ? Number(c.estimatedPrice) : undefined
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await request('PUT', `/components/${editing.id}`, form);
      } else {
        await request('POST', '/components', form);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(parseError(err));
    }
  };

  const handleDelete = async (c: Component) => {
    if (!confirm(`Hapus / nonaktifkan komponen "${c.name}"?`)) return;
    try {
      await request('DELETE', `/components/${c.id}`);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);

  const handleQrCode = async (c: Component) => {
    setQrLoadingId(c.id);
    setError('');
    try {
      const res = await api.get(`/components/${c.id}/qrcode`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-${c.inventoryCode}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gagal membuat QR Code.');
    } finally {
      setQrLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventori Komponen</h2>
          <p className="text-sm text-slate-500">Kelola stok komponen & perangkat laboratorium</p>
        </div>
        {isStaff && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Tambah Komponen
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <select
            className="input pr-8 appearance-none w-44"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Urutkan komponen"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Cari nama / kode / lokasi..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span className="hidden sm:inline-flex items-center text-xs text-slate-400 self-center">
          Scroll mouse di area tabel untuk pindah halaman
        </span>
      </div>

      {scanned && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-blue-800">
            <span className="font-semibold">Hasil pindai QR:</span>{' '}
            {scanned.name} <span className="text-blue-600">({scanned.inventoryCode})</span>
            <span className="block text-xs text-blue-700">
              Stok tersedia {scanned.stockAvailable}/{scanned.stockTotal}
              {scanned.location ? ` · Lokasi: ${scanned.location}` : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary !py-1 text-xs" onClick={() => handleQrCode(scanned)}>
              Unduh QR
            </button>
            {isStaff && (
              <button className="btn btn-secondary !py-1 text-xs" onClick={() => openEdit(scanned)}>
                Edit
              </button>
            )}
            <button className="btn btn-secondary !py-1 text-xs" onClick={clearScanned}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="card overflow-x-auto" ref={tableWrapRef}>
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Tidak ada komponen ditemukan" />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Komponen</th>
                <th className="table-th">Kode</th>
                <th className="table-th">Kategori</th>
                <th className="table-th">Stok</th>
                <th className="table-th">Kondisi</th>
                <th className="table-th">Lokasi</th>
                <th className="table-th">Status</th>
                <th className="table-th">QR</th>
                {isStaff && <th className="table-th">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((c) => (
                <tr
                  key={c.id}
                  className={
                    scanned?.id === c.id
                      ? 'bg-blue-50 ring-2 ring-inset ring-blue-300'
                      : 'hover:bg-slate-50'
                  }
                >
                  <td className="table-td">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    {c.description && <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="table-td font-mono text-xs">{c.inventoryCode}</td>
                  <td className="table-td">{c.category?.name || '-'}</td>
                  <td className="table-td">
                    <span className={`font-semibold ${c.stockAvailable === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {c.stockAvailable}
                    </span>
                    <span className="text-slate-400"> / {c.stockTotal}</span>
                  </td>
                  <td className="table-td">
                    <StatusBadge value={c.condition} />
                  </td>
                  <td className="table-td">{c.location || '-'}</td>
                  <td className="table-td">
                    <StatusBadge value={c.status} />
                  </td>
                  <td className="table-td">
                    <button
                      className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                      onClick={() => handleQrCode(c)}
                      disabled={qrLoadingId === c.id}
                      title={`Unduh QR Code ${c.inventoryCode}`}
                    >
                      {qrLoadingId === c.id ? 'Membuat...' : '⬇ QR'}
                    </button>
                  </td>
                  {isStaff && (
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:underline text-xs" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(c)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Gunakan scroll wheel pada tabel untuk pindah halaman</span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Komponen' : 'Tambah Komponen'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>}
          <Field label="Nama">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Kode Inventaris">
            <input className="input font-mono" value={form.inventoryCode} onChange={(e) => setForm({ ...form, inventoryCode: e.target.value })} required />
          </Field>
          <Field label="Kategori">
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="">Pilih kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deskripsi">
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok Total">
              <input
                className="input"
                type="number"
                min={0}
                value={form.stockTotal}
                onChange={(e) => setForm({ ...form, stockTotal: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Lokasi">
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Rak A1" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kondisi">
              <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                <option>Good</option>
                <option>Damaged</option>
                <option>Under Repair</option>
              </select>
            </Field>
            <Field label="Estimasi Harga (Rp)">
              <input className="input" type="number" min={0} value={form.estimatedPrice ?? ''} onChange={(e) => setForm({ ...form, estimatedPrice: Number(e.target.value) || undefined })} />
            </Field>
          </div>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
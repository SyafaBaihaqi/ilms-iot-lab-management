import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, Modal, Field } from '../components/ui';

interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { components: number };
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<any>('GET', '/categories');
      setItems(res.data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || '');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await request('PUT', `/categories/${editing.id}`, { name, description });
      } else {
        await request('POST', '/categories', { name, description });
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(parseError(err));
    }
  };

  const handleDelete = async (c: Category) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      await request('DELETE', `/categories/${c.id}`);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kategori Komponen</h2>
          <p className="text-sm text-slate-500">Kelola kategori komponen laboratorium</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah Kategori
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{c.description || 'Tidak ada deskripsi'}</p>
                </div>
                <span className="badge bg-blue-50 text-blue-700">{c._count?.components ?? 0} komponen</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="text-blue-600 hover:underline text-xs" onClick={() => openEdit(c)}>
                  Edit
                </button>
                <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(c)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>}
          <Field label="Nama Kategori">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Deskripsi">
            <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
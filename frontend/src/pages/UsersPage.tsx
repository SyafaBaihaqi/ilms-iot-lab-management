import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, Pagination, Modal, Field, StatusBadge } from '../components/ui';

interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  nim?: string;
  phone?: string;
  isActive: boolean;
  role?: { name: string };
  createdAt?: string;
}

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    nim: '',
    password: '',
    phone: '',
    roleName: 'User'
  });
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<any>('GET', `/users?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      const itemsList = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const total = res.data?.meta?.totalPages || res.meta?.totalPages || 1;
      setItems(itemsList);
      setTotalPages(total);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', email: '', username: '', nim: '', password: '', phone: '', roleName: 'User' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      username: u.username,
      nim: u.nim || '',
      password: '',
      phone: u.phone || '',
      roleName: u.role?.name || 'User'
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await request('PUT', `/users/${editing.id}`, {
          fullName: form.fullName,
          email: form.email,
          nim: form.nim || null,
          phone: form.phone,
          roleName: form.roleName,
          password: form.password || undefined
        });
      } else {
        await request('POST', '/users', { ...form, nim: form.nim || undefined });
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(parseError(err));
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Nonaktifkan user "${u.fullName}"?`)) return;
    try {
      await request('DELETE', `/users/${u.id}`);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500">Kelola akun admin & mahasiswa</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah User
        </button>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Cari nama / username / NIM / email..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="card overflow-x-auto">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Nama</th>
                <th className="table-th">Username</th>
                <th className="table-th">NIM / NIDN</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium text-slate-800">{u.fullName}</td>
                  <td className="table-td">{u.username}</td>
                  <td className="table-td">{u.nim || <span className="text-slate-300">-</span>}</td>
                  <td className="table-td">{u.email}</td>
                  <td className="table-td">
                    <StatusBadge value={u.role?.name || '-'} />
                  </td>
                  <td className="table-td">
                    <StatusBadge value={u.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:underline text-xs" onClick={() => openEdit(u)}>
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(u)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && items.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Tambah User'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>}
          <Field label="Nama Lengkap">
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required disabled={!!editing} />
            </Field>
            <Field label="NIM / NIDN">
              <input
                className="input"
                value={form.nim}
                onChange={(e) => setForm({ ...form, nim: e.target.value })}
                placeholder="Contoh: 2022101"
                maxLength={20}
              />
            </Field>
          </div>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={editing ? 'Password (opsional)' : 'Password'}>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
                minLength={6}
              />
            </Field>
            <Field label="Telepon">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Role">
            <select className="input" value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })}>
              <option value="User">User / Mahasiswa</option>
              <option value="Admin">Admin</option>
            </select>
          </Field>
          <p className="text-xs text-slate-500">
            NIM opsional, tapi bisa dipakai sebagai pengganti username saat login (mis. 2022101). Harus unik.
          </p>
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
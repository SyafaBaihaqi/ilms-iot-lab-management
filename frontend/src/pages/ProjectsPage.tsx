import { useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, Modal, Field } from '../components/ui';

const HIGHLIGHTS = ['Featured', 'Star', 'Trending'] as const;
type Highlight = (typeof HIGHLIGHTS)[number];

const highlightMeta: Record<string, { icon: string; className: string; label: string }> = {
  Featured: { label: 'Featured', icon: '🌟', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  Star: { label: 'Star', icon: '⭐', className: 'bg-indigo-100 text-indigo-700 border-indigo-100' },
  Trending: { icon: '🔥', label: 'Trending', className: 'bg-orange-100 text-orange-700' }
};

interface ProjectAuthor {
  id: string;
  fullName: string;
  username: string;
  nim?: string | null;
  role?: { name: string } | null;
}

interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  techStack?: string | null;
  repoUrl?: string | null;
  demoUrl?: string | null;
  imageUrl?: string | null;
  year?: string | null;
  tags: string[];
  highlights: string[];
  isStudentProject: boolean;
  authorName: string;
  authorRole?: string | null;
  authorNim?: string | null;
  author?: ProjectAuthor | null;
  createdBy?: ProjectAuthor | null;
  createdAt: string;
}

type Tab = 'all' | 'featured' | 'selected' | 'student';

const HIGHLIGHT_LIST = ['Featured', 'Star', 'Trending'];
const STUDENT_ROLE_NAMES = ['Mahasiswa', 'User'];

const emptyForm = {
  title: '',
  category: '',
  description: '',
  techStack: '',
  year: '',
  repoUrl: '',
  demoUrl: '',
  imageUrl: '',
  tags: '',
  highlights: [] as string[],
  isStudentProject: false,
  authorId: '',
  authorName: '',
  authorRole: '',
  authorNim: ''
};

function HighlightBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    Featured: 'bg-amber-100 text-amber-700 border-amber-200',
    Star: 'bg-blue-100 text-blue-700 border-blue-200',
    Trending: 'bg-rose-100 text-rose-700 border-rose-200'
  };
  const icon: Record<string, string> = { Featured: '⭐', Star: '★', Trending: '🔥' };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${map[value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {icon[value] || ''} {value}
    </span>
  );
}

function ProjectCard({
  project,
  isAdmin,
  onEdit,
  onDelete
}: {
  project: Project;
  isAdmin: boolean;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {project.category}
        </span>
        <span className="text-xs text-slate-400">{project.year || ''}</span>
      </div>

      {project.highlights.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.highlights.map((h) => (
            <HighlightBadge key={h} value={h} />
          ))}
        </div>
      )}

      <h3 className="mt-3 font-semibold text-slate-800">{project.title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{project.description}</p>

      {project.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {project.techStack && <p className="mt-3 text-xs text-slate-500">Tech: {project.techStack}</p>}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
          {project.authorName?.[0]?.toUpperCase() || '?'}
        </span>
        <span>
          oleh <span className="font-medium text-slate-700">{project.authorName}</span>
          {project.authorRole ? ` • ${project.authorRole}` : ''}
          {project.authorNim ? ` (${project.authorNim})` : ''}
        </span>
      </div>

      <div className="mt-auto pt-4 flex items-center gap-3">
        {project.repoUrl && (
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
            Repo ↗
          </a>
        )}
        {project.demoUrl && (
          <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-600 hover:underline">
            Demo ↗
          </a>
        )}
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button className="text-xs text-blue-600 hover:underline" onClick={() => onEdit(project)}>
              Edit
            </button>
            <button className="text-xs text-red-600 hover:underline" onClick={() => onDelete(project)}>
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<{ total: number; featured: number; student: number } | null>(null);
  const [users, setUsers] = useState<ProjectAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, stat] = await Promise.all([
        request<any>('GET', '/projects'),
        request<any>('GET', '/projects/stats')
      ]);
      setProjects(list.data || []);
      setStats(stat.data || null);
      setError('');
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    request<any>('GET', '/users?limit=100')
      .then((res) => setUsers(res.data?.items || []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  const categories = ['Semua', ...Array.from(new Set(projects.map((p) => p.category)))];

  const featured = projects.filter((p) => p.highlights.includes('Featured'));
  const selected = projects.filter((p) => p.highlights.includes('Star') || p.highlights.includes('Trending'));
  const studentProjects = projects.filter((p) => p.isStudentProject);

  const filteredAll = projects.filter((p) => {
    const matchCategory = category === 'Semua' || p.category === category;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      (p.techStack || '').toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      title: p.title,
      category: p.category,
      description: p.description,
      techStack: p.techStack || '',
      year: p.year || '',
      repoUrl: p.repoUrl || '',
      demoUrl: p.demoUrl || '',
      imageUrl: p.imageUrl || '',
      tags: (p.tags || []).join(', '),
      highlights: p.highlights || [],
      isStudentProject: p.isStudentProject,
      authorId: p.author?.id || '',
      authorName: p.authorName,
      authorRole: p.authorRole || '',
      authorNim: p.authorNim || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const toggleHighlight = (h: string) => {
    setForm((f) => ({
      ...f,
      highlights: f.highlights.includes(h) ? f.highlights.filter((x) => x !== h) : [...f.highlights, h]
    }));
  };

  const selectAuthor = (id: string) => {
    if (!id) {
      setForm((f) => ({ ...f, authorId: '' }));
      return;
    }
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const roleName = u.role?.name || '';
    setForm((f) => ({
      ...f,
      authorId: id,
      authorName: u.fullName,
      authorRole: roleName,
      authorNim: u.nim || '',
      isStudentProject: STUDENT_ROLE_NAMES.includes(roleName) ? true : f.isStudentProject
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      title: form.title,
      category: form.category,
      description: form.description,
      techStack: form.techStack,
      year: form.year,
      repoUrl: form.repoUrl,
      demoUrl: form.demoUrl,
      imageUrl: form.imageUrl,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      highlights: form.highlights,
      isStudentProject: form.isStudentProject,
      authorId: form.authorId || null,
      authorName: form.authorName,
      authorRole: form.authorRole,
      authorNim: form.authorNim
    };
    try {
      if (editing) {
        await request('PUT', `/projects/${editing.id}`, payload);
      } else {
        await request('POST', '/projects', payload);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(parseError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Project) => {
    if (!confirm(`Hapus proyek "${p.title}"?`)) return;
    try {
      await request('DELETE', `/projects/${p.id}`);
      await fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'Semua Proyek', count: projects.length },
    { key: 'featured', label: '⭐ Featured', count: featured.length },
    { key: 'selected', label: '🏆 Proyek Terpilih', count: selected.length },
    { key: 'student', label: '🎓 Proyek Mahasiswa', count: studentProjects.length }
  ];

  const renderGrid = (items: Project[], empty: string) =>
    items.length === 0 ? (
      <EmptyState text={empty} />
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Proyek Elektronik &amp; IoT</h2>
          <p className="text-sm text-slate-500">
            Portofolio proyek terpilih (Featured, Star, Trending) dan karya mahasiswa
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Tambah Proyek
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Proyek</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.featured}</p>
            <p className="text-xs text-slate-500">Featured</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.student}</p>
            <p className="text-xs text-slate-500">Karya Mahasiswa</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {t.label} <span className="opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? (
        <Loading />
      ) : tab === 'all' ? (
        <div className="space-y-8">
          {featured.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold text-slate-800">⭐ Featured Project</h3>
              {renderGrid(featured, 'Belum ada proyek featured.')}
            </section>
          )}

          <section>
            <h3 className="mb-3 text-lg font-semibold text-slate-800">🏆 Proyek Terpilih</h3>
            {renderGrid(selected, 'Belum ada proyek Star/Trending.')}
          </section>

          {studentProjects.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold text-slate-800">🎓 Proyek Mahasiswa</h3>
              {renderGrid(studentProjects, 'Belum ada proyek mahasiswa.')}
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-800">Semua Proyek</h3>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input w-full sm:w-56"
                  placeholder="Cari proyek / author..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {renderGrid(filteredAll, 'Tidak ada proyek yang cocok.')}
          </section>
        </div>
      ) : tab === 'featured' ? (
        renderGrid(featured, 'Belum ada proyek featured.')
      ) : tab === 'selected' ? (
        renderGrid(selected, 'Belum ada proyek terpilih (Star/Trending).')
      ) : (
        renderGrid(studentProjects, 'Belum ada proyek mahasiswa.')
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Proyek' : 'Tambah Proyek'}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{formError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Judul Proyek">
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Kategori">
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="IoT, Robotika, Web..."
                required
              />
            </Field>
          </div>

          <Field label="Deskripsi">
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Teknologi">
              <input
                className="input"
                value={form.techStack}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="ESP32, Arduino, React"
              />
            </Field>
            <Field label="Tahun">
              <input className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2026" />
            </Field>
          </div>

          <Field label="Tags (pisahkan dengan koma)">
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="IoT, Sensor" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Link Repo">
              <input className="input" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} />
            </Field>
            <Field label="Link Demo">
              <input className="input" value={form.demoUrl} onChange={(e) => setForm({ ...form, demoUrl: e.target.value })} />
            </Field>
            <Field label="Link Gambar">
              <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </Field>
          </div>

          <Field label="Label Proyek Terpilih">
            <div className="flex flex-wrap gap-3">
              {HIGHLIGHT_LIST.map((h) => (
                <label key={h} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.highlights.includes(h)} onChange={() => toggleHighlight(h)} />
                  {h}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Identitas Pembuat / Author">
            <div className="space-y-2">
              <select className="input" value={form.authorId} onChange={(e) => selectAuthor(e.target.value)}>
                <option value="">— Pilih pengguna (opsional) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role?.name || '-'}{u.nim ? ` - ${u.nim}` : ''})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  className="input sm:col-span-2"
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  placeholder="Nama pembuat (isi manual bila di luar sistem)"
                />
                <input
                  className="input"
                  value={form.authorRole}
                  onChange={(e) => setForm({ ...form, authorRole: e.target.value })}
                  placeholder="Role / kelas"
                />
              </div>
              <input
                className="input"
                value={form.authorNim}
                onChange={(e) => setForm({ ...form, authorNim: e.target.value })}
                placeholder="NIM (opsional)"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isStudentProject}
                  onChange={(e) => setForm({ ...form, isStudentProject: e.target.checked })}
                />
                Tandai sebagai proyek mahasiswa
              </label>
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

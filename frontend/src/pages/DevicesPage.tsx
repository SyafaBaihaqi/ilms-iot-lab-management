import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, StatusBadge, Modal, Field } from '../components/ui';

interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
  esp32Id: string;
  ipAddress?: string;
  firmwareVersion?: string;
  location?: string;
  status: string;
  lastSeen?: string;
  registeredAt?: string;
  _count?: { readings: number };
}

export default function DevicesPage() {
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState({
    deviceName: '',
    deviceType: '',
    esp32Id: '',
    location: '',
    status: 'Offline'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<any>('GET', '/devices');
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
    setForm({ deviceName: '', deviceType: '', esp32Id: '', location: '', status: 'Offline' });
    setModalOpen(true);
  };

  const openEdit = (d: Device) => {
    setEditing(d);
    setForm({
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      esp32Id: d.esp32Id,
      location: d.location || '',
      status: d.status
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await request('PUT', `/devices/${editing.id}`, {
          deviceName: form.deviceName,
          deviceType: form.deviceType,
          location: form.location,
          status: form.status
        });
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  const handleDelete = async (d: Device) => {
    if (!confirm(`Hapus perangkat "${d.deviceName}"?`)) return;
    try {
      await request('DELETE', `/devices/${d.id}`);
      fetchData();
    } catch (err) {
      alert(parseError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Perangkat IoT</h2>
          <p className="text-sm text-slate-500">Daftar perangkat ESP32 terdaftar di laboratorium</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah Device
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="card overflow-x-auto">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Belum ada perangkat IoT terdaftar" />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Device</th>
                <th className="table-th">ESP32 ID</th>
                <th className="table-th">Tipe</th>
                <th className="table-th">Lokasi</th>
                <th className="table-th">Status</th>
                <th className="table-th">Last Seen</th>
                <th className="table-th">Data Sensor</th>
                <th className="table-th">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <span className="font-medium text-slate-800">{d.deviceName}</span>
                    <p className="text-xs text-slate-400">v{d.firmwareVersion || '-'}</p>
                  </td>
                  <td className="table-td font-mono text-xs">{d.esp32Id}</td>
                  <td className="table-td">{d.deviceType}</td>
                  <td className="table-td">{d.location || '-'}</td>
                  <td className="table-td">
                    <StatusBadge value={d.status} />
                  </td>
                  <td className="table-td text-xs">
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString('id-ID') : 'Belum pernah'}
                  </td>
                  <td className="table-td">{d._count?.readings ?? 0}</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:underline text-xs" onClick={() => openEdit(d)}>
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(d)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Device' : 'Tambah Device'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nama Device">
            <input className="input" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} required />
          </Field>
          <Field label="Tipe Device">
            <input className="input" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })} placeholder="ESP32-SensorNode" required />
          </Field>
          {!editing ? (
            <Field label="ESP32 ID (Chip ID)">
              <input className="input font-mono" value={form.esp32Id} onChange={(e) => setForm({ ...form, esp32Id: e.target.value })} required />
            </Field>
          ) : (
            <Field label="ESP32 ID">
              <input className="input font-mono bg-slate-50" value={editing.esp32Id} disabled />
            </Field>
          )}
          <Field label="Lokasi">
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Online</option>
              <option>Offline</option>
              <option>Maintenance</option>
            </select>
          </Field>
          {!editing && (
            <p className="text-xs text-slate-400">
              Device yang sudah terdaftar via API akan otomatis muncul di sini dengan API key unik.
            </p>
          )}
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
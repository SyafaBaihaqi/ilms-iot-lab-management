import { useCallback, useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { Loading, EmptyState, StatusBadge } from '../components/ui';

interface Reading {
  id: string;
  sensorType: string;
  value: number;
  unit?: string;
  recordedAt: string;
}

interface Device {
  id: string;
  deviceName: string;
  esp32Id: string;
  status: string;
  lastSeen?: string;
}

export default function SensorsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await request<any>('GET', '/devices');
      setDevices(res.data);
      if (res.data.length > 0) {
        setSelectedDevice(res.data[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchReadings = useCallback(async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const res = await request<any>('GET', `/sensors/devices/${selectedDevice}/readings/history?limit=100`);
      setReadings(res.data);
    } catch (err) {
      alert(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedDevice) fetchReadings();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchReadings]);

  const sensorTypes = Array.from(new Set(readings.map((r) => r.sensorType)));
  const selected = devices.find((d) => d.id === selectedDevice);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Monitoring Sensor</h2>
        <p className="text-sm text-slate-500">Data sensor terkini dan historis dari perangkat IoT</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm text-slate-600 font-medium">Pilih Device:</label>
        <select className="input max-w-xs" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
          {devices.length === 0 && <option value="">Belum ada device</option>}
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.deviceName} ({d.esp32Id})
            </option>
          ))}
        </select>
        {selected && (
          <span className="flex items-center gap-2">
            <StatusBadge value={selected.status} />
            <span className="text-xs text-slate-400">
              Last seen: {selected.lastSeen ? new Date(selected.lastSeen).toLocaleString('id-ID') : 'Belum pernah'}
            </span>
          </span>
        )}
      </div>

      {/* Current values per sensor type */}
      {!loading && readings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sensorTypes.map((st) => {
            const latest = readings.find((r) => r.sensorType === st);
            if (!latest) return null;
            return (
              <div key={st} className="card p-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{st}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {latest.value}
                  <span className="text-sm font-normal text-slate-400"> {latest.unit || ''}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(latest.recordedAt).toLocaleString('id-ID')}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart: simple sparkline per sensor type */}
      {!loading &&
        sensorTypes.map((st) => {
          const series = readings.filter((r) => r.sensorType === st).slice().reverse();
          const data = series.map((r) => Number(r.value));
          const min = Math.min(...data);
          const max = Math.max(...data);
          const range = max - min || 1;
          return (
            <div key={'chart-' + st} className="card p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Grafik {st}</h3>
              <div className="flex items-end gap-[2px] h-32">
                {data.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-600 rounded-t transition-all"
                    style={{ height: `${((v - min) / range) * 100 + 4}%` }}
                    title={`${v} ${series[i].unit || ''} · ${new Date(series[i].recordedAt).toLocaleString('id-ID')}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>{data.length} titik data</span>
                <span>min {min} · maks {max}</span>
              </div>
            </div>
          );
        })}

      <div className="card overflow-x-auto">
        {loading ? (
          <Loading />
        ) : readings.length === 0 ? (
          <EmptyState text="Belum ada data sensor. Pastikan ESP32 terhubung dan mengirim data." />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Waktu</th>
                <th className="table-th">Sensor</th>
                <th className="table-th">Nilai</th>
                <th className="table-th">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {readings.slice(0, 50).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-td text-xs">{new Date(r.recordedAt).toLocaleString('id-ID')}</td>
                  <td className="table-td">{r.sensorType}</td>
                  <td className="table-td font-semibold">{r.value}</td>
                  <td className="table-td text-slate-400">{r.unit || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
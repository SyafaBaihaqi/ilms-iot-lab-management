import { useState } from 'react';

const SHOWCASE_URL = 'https://project.saiasyap.my.id/';

export default function ShowcasePage() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Showcase Proyek</h2>
          <p className="text-sm text-slate-500">
            Tampilan situs portofolio proyek: <span className="font-medium text-slate-600">project.saiasyap.my.id</span>
          </p>
        </div>
        <a
          href={SHOWCASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary text-sm"
        >
          Buka di Tab Baru ↗
        </a>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 truncate text-xs text-slate-500">{SHOWCASE_URL}</span>
        </div>

        {!failed ? (
          <div className="relative">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Memuat showcase…
              </div>
            )}
            <iframe
              src={SHOWCASE_URL}
              title="Showcase Proyek"
              className="h-[70vh] w-full"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </div>
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate-500">
              Situs showcase belum dapat ditampilkan di dalam halaman (kemungkinan belum dikembangkan atau
              memblokir embed).
            </p>
            <a href={SHOWCASE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
              Buka project.saiasyap.my.id ↗
            </a>
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-500">
          Catatan: halaman ini menampilkan situs eksternal. Jika konten tidak muncul, gunakan tombol "Buka di Tab Baru".
        </p>
      </div>
    </div>
  );
}

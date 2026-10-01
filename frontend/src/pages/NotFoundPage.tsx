import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <p className="text-7xl font-bold text-blue-500">404</p>
        <h1 className="text-xl font-semibold mt-4">Halaman tidak ditemukan</h1>
        <p className="text-slate-400 text-sm mt-2">Halaman yang Anda cari tidak tersedia.</p>
        <Link to="/" className="btn btn-primary mt-6">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
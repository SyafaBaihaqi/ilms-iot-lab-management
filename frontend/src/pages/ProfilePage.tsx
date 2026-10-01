import { useEffect, useState } from 'react';
import { request, parseError } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await request('PUT', '/auth/change-password', {
        oldPassword,
        newPassword
      });
      setMessage('Password berhasil diubah.');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(parseError(err));
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Profil Saya</h2>
        <p className="text-sm text-slate-500">Informasi akun dan pengaturan kata sandi</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{user?.fullName}</h3>
            <p className="text-sm text-slate-500">@{user?.username} · {user?.role}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Ganti Password</h3>
        {message && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="label">Password Lama</label>
            <input
              className="input"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password Baru</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Ubah Password
          </button>
        </form>
      </div>
    </div>
  );
}
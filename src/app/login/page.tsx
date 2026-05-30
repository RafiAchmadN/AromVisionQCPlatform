'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Login gagal');
        return;
      }

      router.replace('/dashboard');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-800 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Leaf className="h-6 w-6 text-brand-500" />
          <span className="text-xl font-bold text-brand-400 tracking-[0.3px]">AromVision</span>
        </div>

        <div className="bg-brand-700 border border-brand-600 rounded-xl p-6">
          <h1 className="text-base font-bold text-brand-200 mb-0.5">Masuk ke Platform</h1>
          <p className="text-xs text-brand-500 mb-5">QC Platform · Sima Arome</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-brand-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-brand-800 border border-brand-600 text-brand-200 text-sm px-3 py-2 placeholder:text-brand-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
                placeholder="email@perusahaan.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-brand-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-brand-800 border border-brand-600 text-brand-200 text-sm px-3 py-2 placeholder:text-brand-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-950 border border-red-800 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </button>

            <p className="text-center text-xs text-brand-500">
              Belum punya akun?{' '}
              <Link href="/signup" className="text-brand-400 font-medium hover:underline">
                Daftar di sini
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-[10px] text-brand-600 mt-4">
          CyberHack 2026 · Berkakang Fighter
        </p>
      </div>
    </div>
  );
}

'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@/lib/types';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      if (!res.ok) { setError(data.message ?? 'Login gagal'); return; }
      router.replace('/dashboard');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — botanical illustration (desktop only) ─────── */}
      <div
        className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden px-12"
        style={{ background: 'linear-gradient(145deg, #050e08 0%, #0d1f10 35%, #142d18 65%, #1e3a25 100%)' }}
      >
        {/* Background decorative blobs */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #2d5c33, transparent)', transform: 'translate(-40%, -40%)' }}/>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4e9955, transparent)', transform: 'translate(35%, 35%)' }}/>

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm text-center">
          <Image src="/logo.svg" alt="AromVision Logo" width={240} height={264} unoptimized priority />

          <div>
            <h1 className="text-4xl font-black text-brand-400 tracking-tight">AromVision</h1>
            <p className="text-brand-500 text-sm mt-1.5 font-medium">AI Quality Control Platform</p>
            <p className="text-brand-600 text-xs mt-1">Sima Arome · CyberHack 2026</p>
          </div>

          <div className="w-full flex flex-col gap-3">
            {[
              { label: 'Realtime detection', sub: 'Rot level · Defect count · Anomaly score' },
              { label: 'Auto-decision engine', sub: 'Grade A/B/C/Reject dengan threshold per produk' },
              { label: 'Full audit trail', sub: 'Setiap keputusan tercatat, immutable' },
            ].map(({ label, sub }) => (
              <div key={label} className="flex items-start gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-brand-300 inline-block" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-300">{label}</p>
                  <p className="text-[10px] text-brand-600 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — login form ─────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(180deg, #050e08 0%, #0d1f10 40%, #142d18 100%)' }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-brand-400">AromVision</span>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Selamat Datang</h2>
            <p className="text-sm text-gray-500 mb-6">Masuk ke AromVision QC Platform</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  placeholder="email@perusahaan.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #0d2010, #142d18 50%, #1e3a25)' }}
              >
                {loading ? 'Memuat...' : 'Masuk'}
              </button>

              <p className="text-center text-xs text-gray-500">
                Belum punya akun?{' '}
                <Link href="/signup" className="text-brand-700 font-semibold hover:underline">
                  Daftar di sini
                </Link>
              </p>
            </form>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 rounded-xl border border-brand-600/40 p-4 text-xs" style={{ background: 'rgba(5,14,8,0.6)' }}>
            <p className="font-semibold text-brand-400 mb-2">Demo Credentials</p>
            <div className="space-y-1 text-brand-500 font-mono">
              <p>Admin &nbsp;&nbsp;→ admin@aromai.demo</p>
              <p>Manager → manager@aromai.demo</p>
              <p>Operator → operator@aromai.demo</p>
              <p className="mt-1 text-brand-600">Password: AromAI2026!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

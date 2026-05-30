'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'Operator', label: 'Operator' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError('');
    const newErrors: Record<string, string> = {};

    if (!form.name.trim() || form.name.length > 100) newErrors.name = 'Nama 1–100 karakter';
    if (!form.email) newErrors.email = 'Email wajib diisi';
    if (form.password.length < 8) newErrors.password = 'Password minimal 8 karakter';
    if (!form.role) newErrors.role = 'Pilih role';

    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {};
          for (const err of data.errors) fieldErrors[err.field] = err.message;
          setErrors(fieldErrors);
        } else {
          setGlobalError(data.message ?? 'Pendaftaran gagal');
        }
        return;
      }

      router.replace('/login?registered=1');
    } catch {
      setGlobalError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #050e08 0%, #0d1f10 40%, #142d18 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image src="/logo.svg" alt="AromVision Logo" width={56} height={56} unoptimized priority />
          <div className="text-center">
            <h1 className="text-2xl font-black text-brand-400 tracking-tight">AromVision</h1>
            <p className="text-brand-500 text-xs mt-0.5 font-medium">AI Quality Control Platform</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-0.5">Buat Akun</h2>
          <p className="text-sm text-gray-500 mb-5">Isi form berikut untuk mendaftar</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nama */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="Nama lengkap Anda"
                required
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="email@perusahaan.com"
                required
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  placeholder="Minimal 8 karakter"
                  required
                  autoComplete="new-password"
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
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Role</label>
              <select
                title="Pilih role"
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
                required
              >
                <option value="">Pilih role...</option>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
            </div>

            {globalError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                {globalError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(90deg, #0d2010, #142d18 50%, #1e3a25)' }}
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-brand-700 font-semibold hover:underline">
                Masuk di sini
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-brand-600 mt-4">
          Akun baru memerlukan aktivasi oleh Admin sebelum dapat digunakan.
        </p>
      </div>
    </div>
  );
}

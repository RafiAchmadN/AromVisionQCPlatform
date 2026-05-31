'use client';
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

// ─── Floating 3D orbs (CSS-only, no canvas) ──────────────────────────────────
function FloatingOrbs() {
  return (
    <>
      <style>{`
        @keyframes float3d-a {
          0%,100%{ transform: translate(0,0) rotate(0deg) scale(1); }
          25%    { transform: translate(30px,-40px) rotate(45deg) scale(1.1); }
          50%    { transform: translate(-20px,-70px) rotate(90deg) scale(0.95); }
          75%    { transform: translate(-40px,-30px) rotate(135deg) scale(1.05); }
        }
        @keyframes float3d-b {
          0%,100%{ transform: translate(0,0) rotate(0deg); }
          33%    { transform: translate(-35px,40px) rotate(-60deg) scale(1.15); }
          66%    { transform: translate(25px,20px) rotate(-120deg) scale(0.9); }
        }
        @keyframes float3d-c {
          0%,100%{ transform: translate(0,0) scale(1) rotate(0deg); }
          50%    { transform: translate(20px,-30px) scale(1.2) rotate(180deg); }
        }
        @keyframes float3d-d {
          0%,100%{ transform: translate(0,0) rotate(0deg); }
          40%    { transform: translate(-30px,50px) rotate(72deg); }
          80%    { transform: translate(40px,20px) rotate(144deg); }
        }
        @keyframes pulse-glow {
          0%,100%{ opacity:0.12; }
          50%{ opacity:0.28; }
        }
        @keyframes slideUpSignup {
          from{opacity:0;transform:translateY(24px)}
          to{opacity:1;transform:translateY(0)}
        }
        .signup-anim { animation: slideUpSignup 0.6s 0.15s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large rotating ring top-left */}
        <div style={{
          position:'absolute', top:'-80px', left:'-80px',
          width:'320px', height:'320px',
          border:'2px solid rgba(78,153,85,0.25)',
          borderRadius:'50%',
          animation:'float3d-a 14s ease-in-out infinite',
          boxShadow:'inset 0 0 60px rgba(45,92,51,0.15), 0 0 40px rgba(45,92,51,0.1)',
        }}/>
        {/* Medium cube shape bottom-right */}
        <div style={{
          position:'absolute', bottom:'-60px', right:'-60px',
          width:'220px', height:'220px',
          border:'1.5px solid rgba(114,194,120,0.20)',
          borderRadius:'24px',
          animation:'float3d-b 11s ease-in-out infinite',
          background:'linear-gradient(135deg, rgba(45,92,51,0.08), rgba(78,153,85,0.05))',
        }}/>
        {/* Small spinning diamond center-right */}
        <div style={{
          position:'absolute', top:'35%', right:'8%',
          width:'80px', height:'80px',
          border:'1px solid rgba(114,194,120,0.35)',
          transform:'rotate(45deg)',
          animation:'float3d-c 8s ease-in-out infinite',
        }}/>
        {/* Triangle-ish shape top-right */}
        <div style={{
          position:'absolute', top:'10%', right:'15%',
          width:'60px', height:'60px',
          border:'1px solid rgba(78,153,85,0.3)',
          borderRadius:'8px',
          animation:'float3d-d 13s ease-in-out infinite',
        }}/>
        {/* Glowing orb blobs */}
        <div style={{
          position:'absolute', top:'-120px', right:'-100px',
          width:'380px', height:'380px',
          borderRadius:'50%',
          background:'radial-gradient(circle, rgba(45,92,51,0.35), rgba(26,58,31,0.15), transparent 70%)',
          animation:'pulse-glow 6s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'-80px', left:'-60px',
          width:'280px', height:'280px',
          borderRadius:'50%',
          background:'radial-gradient(circle, rgba(78,153,85,0.25), transparent 70%)',
          animation:'pulse-glow 8s ease-in-out infinite 2s',
        }}/>
        {/* Floating dots grid */}
        {Array.from({length:16}).map((_,i) => (
          <div key={i} style={{
            position:'absolute',
            top:`${10 + (i % 4) * 22}%`,
            left:`${5 + Math.floor(i / 4) * 25}%`,
            width:'4px', height:'4px',
            borderRadius:'50%',
            background:'rgba(114,194,120,0.3)',
            animation:`pulse-glow ${4 + (i % 3)}s ease-in-out infinite ${i * 0.3}s`,
          }}/>
        ))}
      </div>
    </>
  );
}

// ─── Signup Page ──────────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'Operator', label: 'Operator' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

export default function SignupPage() {
  const router = useRouter();
  const { lang, toggle } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError('');
    const newErrors: Record<string, string> = {};

    if (!form.name.trim() || form.name.length > 100)
      newErrors.name = lang === 'en' ? 'Name must be 1–100 characters' : 'Nama 1–100 karakter';
    if (!form.email)
      newErrors.email = lang === 'en' ? 'Email is required' : 'Email wajib diisi';
    if (form.password.length < 8)
      newErrors.password = lang === 'en' ? 'Password must be at least 8 characters' : 'Password minimal 8 karakter';
    if (!form.role)
      newErrors.role = lang === 'en' ? 'Select a role' : 'Pilih role';

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
          setGlobalError(data.message ?? (lang === 'en' ? 'Registration failed' : 'Pendaftaran gagal'));
        }
        return;
      }

      router.replace('/login?registered=1');
    } catch {
      setGlobalError(lang === 'en' ? 'An error occurred. Please try again.' : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #030d05 0%, #051208 30%, #0a1f0d 60%, #071509 100%)' }}
    >
      <FloatingOrbs />

      {/* Language toggle */}
      <button
        type="button"
        onClick={toggle}
        className="absolute top-4 right-4 z-50 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-700/60 bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all text-[11px] font-semibold"
      >
        <span className={lang === 'id' ? 'text-brand-300' : 'text-brand-600'}>ID</span>
        <span className="text-brand-700 mx-0.5">|</span>
        <span className={lang === 'en' ? 'text-brand-300' : 'text-brand-600'}>EN</span>
      </button>

      <div
        className={`w-full max-w-sm relative z-10 ${mounted ? 'signup-anim' : 'opacity-0'}`}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          {/* Glowing ring behind logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl scale-150 opacity-40"
              style={{ background: 'radial-gradient(circle, #4e9955, transparent)' }} />
            <Image src="/logo.svg" alt="AromVision Logo" width={60} height={60} unoptimized priority
              className="relative drop-shadow-[0_0_16px_rgba(114,194,120,0.6)]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #a8d8ab 50%, #72c278 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              AromVision
            </h1>
            <p className="text-brand-500 text-xs mt-0.5 font-medium">AI Quality Control Platform</p>
          </div>
        </div>

        {/* Form card with glass effect */}
        <div className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          {/* Card top accent */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #2d5c33, #4e9955, #72c278, #4e9955, #2d5c33)' }} />

          <div className="p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-0.5">
              {lang === 'en' ? 'Create Account' : 'Buat Akun'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {lang === 'en' ? 'Fill in the form to register' : 'Isi form berikut untuk mendaftar'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  {lang === 'en' ? 'Full Name' : 'Nama Lengkap'}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  placeholder={lang === 'en' ? 'Your full name' : 'Nama lengkap Anda'}
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
                    placeholder={lang === 'en' ? 'Min. 8 characters' : 'Minimal 8 karakter'}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Role</label>
                <select
                  title={lang === 'en' ? 'Select role' : 'Pilih role'}
                  value={form.role}
                  onChange={(e) => setField('role', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
                  required
                >
                  <option value="">{lang === 'en' ? 'Select role...' : 'Pilih role...'}</option>
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
                className="relative w-full h-11 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 mt-1 overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #0d2010, #1a3a1f 40%, #2d5c33 80%, #3d7040)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)' }} />
                <span className="relative">
                  {loading
                    ? (lang === 'en' ? 'Registering...' : 'Mendaftar...')
                    : (lang === 'en' ? 'Register' : 'Daftar')}
                </span>
              </button>

              <p className="text-center text-xs text-gray-500">
                {lang === 'en' ? 'Already have an account? ' : 'Sudah punya akun? '}
                <Link href="/login" className="text-brand-700 font-semibold hover:underline">
                  {lang === 'en' ? 'Sign in here' : 'Masuk di sini'}
                </Link>
              </p>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-brand-600/80 mt-4">
          {lang === 'en'
            ? 'New accounts require Admin activation before use.'
            : 'Akun baru memerlukan aktivasi oleh Admin sebelum dapat digunakan.'}
        </p>
      </div>
    </div>
  );
}

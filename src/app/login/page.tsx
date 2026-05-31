'use client';
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

// ─── Floating Particle ────────────────────────────────────────────────────────
interface Particle { x: number; y: number; size: number; speed: number; opacity: number; drift: number; phase: number; }

const CANVAS_SIZE = 340;
const PARTICLE_RADIUS = 140;

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const CX = CANVAS_SIZE / 2;
    const CY = CANVAS_SIZE / 2;

    function spawnInCircle() {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.sqrt(Math.random()) * PARTICLE_RADIUS;
      return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
    }

    const particles: Particle[] = Array.from({ length: 28 }, () => {
      const pos = spawnInCircle();
      return {
        x: pos.x, y: pos.y,
        size: 1.5 + Math.random() * 2.5,
        speed: 0.15 + Math.random() * 0.35,
        opacity: 0.15 + Math.random() * 0.35,
        drift: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let frame = 0;
    let raf: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(frame * 0.01 + p.phase) * 0.3;

        // Respawn inside circle when particle exits the radius
        const dx = p.x - CX;
        const dy = p.y - CY;
        if (Math.sqrt(dx * dx + dy * dy) > PARTICLE_RADIUS) {
          const pos = spawnInCircle();
          p.x = pos.x;
          p.y = pos.y;
        }

        const pulse = 0.7 + 0.3 * Math.sin(frame * 0.02 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(114,194,120,${p.opacity * pulse})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,200,${p.opacity})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{
        width:  CANVAS_SIZE,
        height: CANVAS_SIZE,
        top:    '50%',
        left:   '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
      }}
    />
  );
}

// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) scale3d(1.02,1.02,1.02)`;
    el.style.boxShadow = `${-x * 20}px ${-y * 20}px 50px rgba(20,45,24,0.25), 0 24px 64px rgba(0,0,0,0.3)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: 'transform 0.12s ease, box-shadow 0.12s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

// ─── Animated gradient orb ────────────────────────────────────────────────────
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large orb top-left */}
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: 500, height: 500, top: -150, left: -100,
          background: 'radial-gradient(circle, #2d5c33, #4e9955, transparent 70%)',
          animation: 'orbFloat1 12s ease-in-out infinite',
        }}
      />
      {/* Medium orb center-right */}
      <div
        className="absolute rounded-full opacity-15"
        style={{
          width: 300, height: 300, top: '30%', right: -80,
          background: 'radial-gradient(circle, #1a3a1f, #2d5c33, transparent 70%)',
          animation: 'orbFloat2 9s ease-in-out infinite',
        }}
      />
      {/* Small orb bottom */}
      <div
        className="absolute rounded-full opacity-25"
        style={{
          width: 200, height: 200, bottom: -60, left: '40%',
          background: 'radial-gradient(circle, #72c278, transparent 70%)',
          animation: 'orbFloat3 7s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
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
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-20px) scale(1.05); }
          66%      { transform: translate(-20px,15px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-25px,30px) scale(1.08); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(20px,-15px); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUp {
          from { opacity:0; transform: translateY(30px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        .login-feature:nth-child(1) { animation: slideUp 0.6s 0.5s cubic-bezier(.22,1,.36,1) both; }
        .login-feature:nth-child(2) { animation: slideUp 0.6s 0.7s cubic-bezier(.22,1,.36,1) both; }
        .login-feature:nth-child(3) { animation: slideUp 0.6s 0.9s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div
        className="min-h-screen flex relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #122a16 0%, #051208 28%, #010503 50%, #051208 72%, #122a16 100%)',
        }}
      >
        <GradientOrbs />

        {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative px-12 z-10">

          <div
            className="relative z-10 flex flex-col items-center gap-8 max-w-sm text-center"
            style={{ animation: mounted ? 'slideUp 0.7s 0.1s cubic-bezier(.22,1,.36,1) both' : 'none' }}
          >
            {/* Logo + title section — particles confined here only */}
            <div className="relative flex flex-col items-center gap-6 pb-2">
              <ParticleField />

              {/* Logo with 3D spin on hover */}
              <div
                className="relative z-10 group cursor-default"
                style={{ animation: 'orbFloat2 6s ease-in-out infinite' }}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-40 blur-xl scale-150"
                  style={{ background: 'radial-gradient(circle, #4e9955, transparent)' }}
                />
                <Image
                  src="/logo.svg"
                  alt="AromVision Logo"
                  width={110}
                  height={121}
                  unoptimized
                  priority
                  className="relative drop-shadow-[0_0_24px_rgba(114,194,120,0.6)] group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Brand name with gradient text */}
              <div className="relative z-10">
                <h1
                  className="text-5xl font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #a8d8ab 40%, #72c278 70%, #4e9955 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                  }}
                >
                  AromVision
                </h1>
                <p
                  className="text-brand-500 text-sm mt-2 font-medium tracking-wide"
                  style={{ animation: 'fadeIn 1s 0.8s both' }}
                >
                  AI Quality Control Platform
                </p>
                <div
                  className="h-px mt-3 mx-auto w-24 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #72c278, transparent)' }}
                />
              </div>
            </div>

            {/* Feature list — no particles here */}
            <div className="w-full flex flex-col gap-3">
              {[
                { label: 'Realtime detection',  sub: 'Rot level · Defect count · Anomaly score' },
                { label: 'Auto-decision engine', sub: 'Grade A/B/C/Reject dengan threshold per produk' },
                { label: 'Full audit trail',     sub: 'Setiap keputusan tercatat, immutable' },
              ].map(({ label, sub }) => (
                <div
                  key={label}
                  className="login-feature flex items-start gap-3 text-left rounded-lg px-3 py-2.5 border border-brand-700/30 hover:border-brand-500/50 hover:bg-white/5 transition-all duration-300 cursor-default group"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: 'linear-gradient(135deg, #2d5c33, #4e9955)' }}>
                    <span className="w-2 h-2 rounded-full bg-brand-300 inline-block" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-300 group-hover:text-brand-200 transition-colors">{label}</p>
                    <p className="text-[10px] text-brand-600 mt-0.5 group-hover:text-brand-500 transition-colors">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <p
              className="text-[11px] text-brand-700 italic"
              style={{ animation: 'fadeIn 1.2s 1.2s both' }}
            >
              Sima Arome · CyberHack 2026 · ITS Surabaya
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div
            className="w-full max-w-sm"
            style={{ animation: mounted ? 'slideUp 0.7s 0.2s cubic-bezier(.22,1,.36,1) both' : 'none' }}
          >
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
              <Image src="/logo.svg" alt="AromVision" width={32} height={32} unoptimized className="drop-shadow-[0_0_8px_rgba(114,194,120,0.6)]" />
              <span className="text-xl font-bold text-brand-400">AromVision</span>
            </div>

            {/* 3D Tilt login card */}
            <TiltCard>
              <div className="relative rounded-2xl overflow-hidden">
                {/* Card shimmer edge */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none z-20 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)' }}
                />
                <div className="relative z-10 bg-white rounded-2xl p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Selamat Datang</h2>
                    <p className="text-sm text-gray-400 mt-1">Masuk ke AromVision QC Platform</p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border-2 border-gray-100 text-sm px-4 py-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="email@perusahaan.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border-2 border-gray-100 text-sm px-4 py-3 pr-12 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all duration-200 bg-gray-50 focus:bg-white"
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(p => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center gap-2">
                        <span className="text-red-400">⚠</span> {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="relative w-full h-12 rounded-xl font-bold text-sm text-white overflow-hidden group disabled:opacity-60 mt-1"
                      style={{ background: 'linear-gradient(135deg, #0d2010, #1a3a1f 40%, #2d5c33 70%, #3d7040)' }}
                    >
                      {/* Shine effect */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)' }}
                      />
                      <span className="relative">
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Memuat...
                          </span>
                        ) : 'Masuk'}
                      </span>
                    </button>

                    <p className="text-center text-xs text-gray-400">
                      Belum punya akun?{' '}
                      <Link href="/signup" className="text-brand-600 font-bold hover:text-brand-500 hover:underline transition-colors">
                        Daftar di sini
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </TiltCard>

            {/* Demo credentials */}
            <div
              className="mt-4 rounded-xl p-4 text-xs border border-brand-700/40 backdrop-blur-sm"
              style={{ background: 'rgba(5,18,8,0.7)' }}
            >
              <p className="font-bold text-brand-400 mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-400 inline-block" />
                Demo Credentials
              </p>
              <div className="space-y-1 text-brand-500 font-mono">
                <p>Admin &nbsp;&nbsp;→ admin@aromai.demo</p>
                <p>Manager → manager@aromai.demo</p>
                <p>Operator → operator@aromai.demo</p>
                <p className="mt-1.5 text-brand-600 border-t border-brand-800 pt-1.5">Password: AromAI2026!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

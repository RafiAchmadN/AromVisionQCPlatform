'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import type { User } from '@/lib/types';

interface TopbarProps {
  user: User;
}

function AromVisionLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* 8 outer dark leaves */}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={`outer-${i}`}
          cx="15" cy="6" rx="2.2" ry="6"
          fill={i % 2 === 0 ? '#0a3d25' : '#0f4d30'}
          transform={`rotate(${i * 45} 15 15)`}
        />
      ))}
      {/* 8 inner bright leaves offset 22.5° */}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={`inner-${i}`}
          cx="15" cy="8.5" rx="1.8" ry="4.5"
          fill={i % 2 === 0 ? '#2d7a50' : '#4ade80'}
          transform={`rotate(${i * 45 + 22.5} 15 15)`}
        />
      ))}
      {/* Center */}
      <circle cx="15" cy="15" r="4.5" fill="#22c55e" opacity="0.9"/>
      <circle cx="15" cy="15" r="2" fill="#0a3d25"/>
    </svg>
  );
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <header
      className="h-12 flex items-center justify-between px-4 shrink-0 border-b border-brand-600/60"
      style={{ background: 'linear-gradient(90deg, #050e08 0%, #0d1f10 35%, #142d18 65%, #1e3a25 100%)' }}
    >
      <div className="flex items-center gap-2.5">
        <AromVisionLogo />
        <span className="text-sm font-bold text-brand-400 tracking-[0.3px]">AromVision</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md px-3 py-1.5 border border-brand-600/70" style={{ background: 'rgba(5,14,8,0.5)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
          </span>
          <span className="text-[11px] text-brand-400 font-medium">AI Service Online</span>
        </div>
        <NotificationBell />
        <span className="text-xs text-brand-400 font-medium">{user.name} · {user.role}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="p-1.5 rounded-md text-brand-500 hover:text-brand-300 hover:bg-brand-700/60 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

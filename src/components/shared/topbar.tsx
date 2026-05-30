'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import type { User } from '@/lib/types';

interface TopbarProps {
  user: User;
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
        <Image src="/logo.svg" alt="AromVision" width={28} height={28} className="shrink-0" unoptimized />
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

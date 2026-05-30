'use client';
import { useRouter } from 'next/navigation';
import { Leaf, LogOut } from 'lucide-react';
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
    <header className="h-12 bg-brand-800 border-b border-brand-600 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <Leaf className="h-[18px] w-[18px] text-brand-500" />
        <span className="text-sm font-bold text-brand-400 tracking-[0.3px]">AromVision</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-brand-700 border border-brand-600 rounded-md px-3 py-1.5">
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
          className="p-1.5 rounded-md text-brand-500 hover:text-brand-300 hover:bg-brand-700 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useLanguage } from '@/contexts/language-context';
import type { User } from '@/lib/types';

interface TopbarProps { user: User; }

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const { lang, toggle } = useLanguage();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <header className="h-12 flex items-center justify-between px-4 shrink-0 border-b border-brand-700/50 topbar-bg relative overflow-hidden">
      {/* Subtle stripe ornament */}
      <div className="absolute inset-0 bg-stripe-pattern opacity-30 pointer-events-none" />

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="animate-float">
          <Image src="/logo.svg" alt="AromVision" width={28} height={28} className="shrink-0 drop-shadow-[0_0_6px_rgba(114,194,120,0.5)]" unoptimized />
        </div>
        <div>
          <span className="text-sm font-bold text-brand-400 tracking-[0.3px]">AromVision</span>
          <span className="hidden sm:inline text-[10px] text-brand-600 ml-1.5">QC Platform</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        {/* AI Status pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 topbar-status-pill">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
          </span>
          <span className="text-[11px] text-brand-400 font-medium">AI Online</span>
        </div>

        {/* Language toggle */}
        <button
          type="button"
          onClick={toggle}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md border border-brand-700/60 bg-white/5 hover:bg-white/10 transition-all duration-200 text-[11px] font-semibold text-brand-400 hover:text-brand-200"
          aria-label="Toggle language"
        >
          <span className={lang === 'id' ? 'text-brand-200' : 'text-brand-600'}>ID</span>
          <span className="text-brand-700">|</span>
          <span className={lang === 'en' ? 'text-brand-200' : 'text-brand-600'}>EN</span>
        </button>

        <NotificationBell />

        {/* User info */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-brand-400 font-medium">{user.name}</span>
          <span className="text-[9px] text-brand-600 border-l border-brand-700 pl-1.5">{user.role}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-1.5 rounded-md text-brand-500 hover:text-brand-300 hover:bg-white/10 transition-all duration-200 hover:scale-110"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

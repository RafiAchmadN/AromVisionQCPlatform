'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, Bell, LogOut } from 'lucide-react';
import { NotifBadge } from '@/components/shared/notif-badge';

const NAV_ITEMS = [
  { href: '/manager/dashboard',     label: 'Dashboard', icon: LayoutDashboard, badge: false },
  { href: '/manager/reports',       label: 'Laporan',   icon: FileText,        badge: false },
  { href: '/manager/notifications', label: 'Notifikasi',icon: Bell,            badge: true  },
];

export function ManagerSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <aside className="w-[180px] flex flex-col shrink-0 border-r border-brand-700/50 relative overflow-hidden sidebar-base">
      <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-20 sidebar-orb-top" />

      <div className="relative z-10 mx-3 mt-3 mb-1 px-2.5 py-1 rounded-md text-center sidebar-role-pill">
        <span className="text-[9px] font-bold uppercase tracking-[2px] text-brand-400">Manager</span>
      </div>

      <nav className="relative z-10 flex flex-col gap-0.5 p-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                active
                  ? 'nav-active-glow text-brand-200'
                  : 'text-brand-500 hover:text-brand-200 hover:bg-white/8 hover:translate-x-0.5',
              )}
            >
              <Icon className={cn('h-[15px] w-[15px] shrink-0', active && 'text-brand-300')} />
              {item.label}
              {item.badge && <NotifBadge />}
            </Link>
          );
        })}
        <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-brand-600/50 to-transparent" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-300 hover:bg-red-900/20 transition-all duration-200 w-full text-left"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" />
          Keluar
        </button>
      </nav>

      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none opacity-10 sidebar-orb-bottom" />
    </aside>
  );
}

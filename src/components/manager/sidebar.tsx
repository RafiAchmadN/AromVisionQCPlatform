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
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <aside
      className="w-[180px] flex flex-col shrink-0 border-r border-brand-600/60"
      style={{ background: 'linear-gradient(180deg, #050e08 0%, #0d1f10 30%, #142d18 60%, #1e3d2e 85%, #2d5042 100%)' }}
    >
      <nav className="flex flex-col gap-0.5 p-2 pt-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-brand-200'
                  : 'text-brand-500 hover:text-brand-300 hover:bg-white/5'
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" />
              {item.label}
              {item.badge && <NotifBadge />}
            </Link>
          );
        })}
        <hr className="border-brand-600/50 my-1.5" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors w-full text-left"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" />
          Keluar
        </button>
      </nav>
    </aside>
  );
}

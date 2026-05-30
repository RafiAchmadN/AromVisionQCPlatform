'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, Bell, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/reports', label: 'Laporan', icon: FileText },
  { href: '/manager/notifications', label: 'Notifikasi', icon: Bell },
];

export function ManagerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <aside className="w-[180px] bg-brand-800 border-r border-brand-600 flex flex-col shrink-0">
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
                  : 'text-brand-500 hover:text-brand-300 hover:bg-brand-700'
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <hr className="border-brand-600 my-1.5" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-red-400 hover:text-red-300 hover:bg-brand-700 transition-colors w-full text-left"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" />
          Keluar
        </button>
      </nav>
    </aside>
  );
}

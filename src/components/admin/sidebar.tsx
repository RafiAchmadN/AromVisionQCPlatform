'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Package, FileText, Settings, ScrollText, Bell, LogOut } from 'lucide-react';
import { NotifBadge } from '@/components/shared/notif-badge';
import { useLanguage } from '@/contexts/language-context';
import type { TranslationKey } from '@/lib/i18n';

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: React.ElementType; badge: boolean }[] = [
  { href: '/admin/dashboard',     labelKey: 'nav.dashboard',     icon: LayoutDashboard, badge: false },
  { href: '/admin/users',         labelKey: 'nav.users',         icon: Users,           badge: false },
  { href: '/admin/lots',          labelKey: 'nav.lots',          icon: Package,         badge: false },
  { href: '/admin/reports',       labelKey: 'nav.reports',       icon: FileText,        badge: false },
  { href: '/admin/config',        labelKey: 'nav.config',        icon: Settings,        badge: false },
  { href: '/admin/audit',         labelKey: 'nav.audit',         icon: ScrollText,      badge: false },
  { href: '/admin/notifications', labelKey: 'nav.notifications', icon: Bell,            badge: true  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useLanguage();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <aside className="w-[210px] flex flex-col shrink-0 border-r border-brand-700/50 relative overflow-hidden sidebar-base">
      <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-20 sidebar-orb-top" />

      <div className="relative z-10 mx-3 mt-4 mb-2 px-2.5 py-1.5 rounded-md text-center sidebar-role-pill">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-brand-400">Admin Panel</span>
      </div>

      <nav className="relative z-10 flex flex-col gap-1 p-2.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon   = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'nav-active-glow text-brand-200'
                  : 'text-brand-500 hover:text-brand-200 hover:bg-white/8 hover:translate-x-1',
              )}
            >
              <Icon className={cn(
                'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                active ? 'text-brand-300' : 'group-hover:text-brand-300'
              )} />
              {t(item.labelKey)}
              {item.badge && <NotifBadge />}
            </Link>
          );
        })}
        <div className="my-2 h-px bg-gradient-to-r from-transparent via-brand-600/50 to-transparent" />
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-900/20 transition-all duration-200 w-full text-left hover:translate-x-1"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {t('nav.logout')}
        </button>
      </nav>

      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none opacity-10 sidebar-orb-bottom" />
    </aside>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Notification } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = {
  SESSION_COMPLETE: 'Sesi Selesai',
  LOT_READY_FOR_REVIEW: 'Siap Review',
  LOT_APPROVED: 'Lot Disetujui',
  LOT_REJECTED: 'Lot Ditolak',
  LOT_QUARANTINED: 'Lot Dikarantina',
  LOT_ESCALATED: 'Lot Dieskalasi',
  CRITICAL_QUALITY_ALERT: 'Alert Kualitas',
  SYSTEM_ALERT: 'System Alert',
  USER_ALERT: 'User Alert',
  DATA_ALERT: 'Data Alert',
  PERFORMANCE_ALERT: 'Performance Alert',
  CRON_REPORT_READY: 'Laporan Siap',
};

const TYPE_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'default' | 'secondary'> = {
  LOT_APPROVED: 'success',
  LOT_REJECTED: 'destructive',
  LOT_QUARANTINED: 'warning',
  LOT_ESCALATED: 'warning',
  CRITICAL_QUALITY_ALERT: 'destructive',
  SYSTEM_ALERT: 'destructive',
  PERFORMANCE_ALERT: 'destructive',
  CRON_REPORT_READY: 'default',
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 10_000);
    return () => clearInterval(id);
  }, []);

  async function fetchNotifs() {
    setLoading(true);
    const res = await fetch('/api/notifications?limit=50');
    if (res.ok) {
      const d = await res.json();
      setNotifications(d.data ?? []);
    }
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
        {unreadCount > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{unreadCount} belum terbaca</p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-2"></div>
              <div className="h-2.5 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="mx-auto h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm">Tidak ada notifikasi</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 transition-colors ${
                n.is_read ? 'bg-white border-gray-100' : 'bg-brand-50 border-brand-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={TYPE_VARIANT[n.type] ?? 'secondary'} className="text-xs">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </Badge>
                    {!n.is_read && (
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(n.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs text-brand-500 hover:text-brand-600 shrink-0 mt-0.5 hover:underline"
                  >
                    Tandai terbaca
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MetricsSummary, AuditLog } from '@/lib/types';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  borderColor: string;
  valueColor: string;
  subColor?: string;
}

function MetricCard({ label, value, sub, borderColor, valueColor, subColor }: MetricCardProps) {
  return (
    <div
      className="rounded-[10px] bg-white p-3"
      style={{ border: '0.5px solid #c2ccc1', borderTop: `3px solid ${borderColor}` }}
    >
      <p className="text-[10px] font-semibold tracking-[0.5px] uppercase text-gray-500 mb-1">{label}</p>
      <p className="text-[26px] font-extrabold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-[11px] font-medium mt-1.5" style={{ color: subColor ?? borderColor }}>{sub}</p>}
    </div>
  );
}

export function AdminOverview() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [activities, setActivities] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, []);

  async function fetchData() {
    const [mRes, aRes] = await Promise.all([
      fetch('/api/metrics/summary'),
      fetch('/api/audit?per_page=20'),
    ]);
    if (mRes.ok) setMetrics(await mRes.json());
    if (aRes.ok) {
      const d = await aRes.json();
      setActivities(d.data ?? []);
    }
  }

  const summaryCards: MetricCardProps[] = metrics
    ? [
        { label: 'Disetujui Hari Ini', value: metrics.total_approved_today, sub: 'lot lulus QC', borderColor: '#2d5c33', valueColor: '#1a3a1f', subColor: '#4e9955' },
        { label: 'Pending Review', value: metrics.pending_lots, sub: 'perlu aksi', borderColor: '#c98200', valueColor: '#7a4e00' },
        { label: 'Ditolak Hari Ini', value: metrics.total_rejected_today, sub: 'lot gagal QC', borderColor: '#e24b4a', valueColor: '#7f1d1d' },
        { label: 'Dikarantina', value: metrics.total_quarantined_today, sub: 'hari ini', borderColor: '#e24b4a', valueColor: '#7f1d1d' },
        { label: 'Operator Aktif', value: metrics.active_operators, sub: 'terdaftar aktif', borderColor: '#4e9955', valueColor: '#1a3a1f', subColor: '#4e9955' },
        { label: 'Manager Aktif', value: metrics.active_managers, sub: 'terdaftar aktif', borderColor: '#4e9955', valueColor: '#1a3a1f', subColor: '#4e9955' },
        { label: 'Alert Belum Ditangani', value: metrics.unhandled_alerts, sub: 'perlu perhatian', borderColor: '#c98200', valueColor: '#7a4e00' },
        { label: 'Avg AI Confidence', value: `${(metrics.avg_confidence * 100).toFixed(1)}%`, sub: '30 hari terakhir', borderColor: '#2d5c33', valueColor: '#1a3a1f', subColor: '#4e9955' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Overview Sistem</h1>
        <p className="text-xs text-gray-500 mt-0.5">Update otomatis setiap 30 detik</p>
      </div>

      {metrics ? (
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <MetricCard key={c.label} {...c} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[10px] bg-white p-3 animate-pulse" style={{ border: '0.5px solid #c2ccc1', borderTop: '3px solid #e4e9e3' }}>
              <div className="h-2.5 bg-gray-100 rounded w-3/4 mb-3"></div>
              <div className="h-7 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Aktivitas Terkini</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Jenis Aksi</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-xs font-mono">{a.action_type}</TableCell>
                <TableCell className="text-xs">{a.target_type} / {a.target_id.slice(0, 8)}</TableCell>
                <TableCell className="text-xs">
                  {(a.actor as { name?: string } | null)?.name ?? 'SYSTEM'}
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === 'SUCCESS' ? 'success' : 'destructive'} className="text-xs">
                    {a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {activities.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">Tidak ada aktivitas</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

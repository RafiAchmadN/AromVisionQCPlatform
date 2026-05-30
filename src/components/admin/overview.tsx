'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MetricsSummary, AuditLog } from '@/lib/types';

// ─── Metric card with colored top border ────────────────────────
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
      className="metric-card rounded-xl bg-white p-3.5 border border-[#c8d4c8]"
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      <p className="text-[10px] font-bold tracking-[0.8px] uppercase text-gray-400 mb-1.5">{label}</p>
      <p className="text-[28px] font-extrabold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-[11px] font-semibold mt-2" style={{ color: subColor ?? borderColor }}>{sub}</p>}
    </div>
  );
}

// ─── Grade distribution donut chart ─────────────────────────────
function GradeDonut({ dist }: { dist: { A: number; B: number; C: number; Reject: number } }) {
  const total = dist.A + dist.B + dist.C + dist.Reject;
  const r = 26;
  const circ = 2 * Math.PI * r;

  const segments = [
    { key: 'A' as const, color: '#2d5c33', label: 'Grade A' },
    { key: 'B' as const, color: '#4e9955', label: 'Grade B' },
    { key: 'C' as const, color: '#c98200', label: 'Grade C' },
    { key: 'Reject' as const, color: '#e24b4a', label: 'Reject' },
  ];

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-gray-400 italic">
        Belum ada inspeksi hari ini
      </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#e4e9e3" strokeWidth="10"/>
        {segments.map(({ key, color }) => {
          const value = dist[key];
          if (value === 0) return null;
          const dash = (value / total) * circ;
          const gap = circ - dash;
          const offset = -accumulated;
          accumulated += dash;
          return (
            <circle
              key={key}
              cx="34" cy="34" r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform="rotate(-90 34 34)"
            />
          );
        })}
        <text x="34" y="31" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a3a1f" fontFamily="Poppins,sans-serif">{total}</text>
        <text x="34" y="41" textAnchor="middle" fontSize="8" fill="#7a8c79" fontFamily="Poppins,sans-serif">lot</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1">
        {segments.map(({ key, color, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }}/>
            <span className="text-xs text-gray-600">{label}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{dist[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Daily trend SVG line chart ──────────────────────────────────
function TrendChart({ trend }: { trend: Array<{ date: string; approved: number; rejected: number; total: number }> }) {
  if (!trend?.length) return null;

  const W = 300; const H = 80;
  const pad = { t: 8, r: 8, b: 20, l: 24 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const maxY = Math.max(...trend.map((d) => d.total), 1);
  const toX = (i: number) => pad.l + (i / (trend.length - 1)) * innerW;
  const toY = (v: number) => pad.t + innerH - (v / maxY) * innerH;

  const approvedPts = trend.map((d, i) => `${toX(i)},${toY(d.approved)}`).join(' ');
  const rejectedPts = trend.map((d, i) => `${toX(i)},${toY(d.rejected)}`).join(' ');
  const areaBottom = `${toX(trend.length - 1)},${pad.t + innerH} ${toX(0)},${pad.t + innerH}`;
  const approvedArea = trend.map((d, i) => `${toX(i)},${toY(d.approved)}`).join(' ') + ' ' + areaBottom;

  const dayShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#e4e9e3" strokeWidth="0.5"/>
      <line x1={pad.l} y1={pad.t + innerH} x2={W - pad.r} y2={pad.t + innerH} stroke="#e4e9e3" strokeWidth="0.5"/>
      <polygon points={approvedArea} fill="#2d5c33" opacity="0.12"/>
      <polyline points={approvedPts} fill="none" stroke="#2d5c33" strokeWidth="2"/>
      {trend.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.approved)} r="2.5" fill="#2d5c33"/>
      ))}
      <polyline points={rejectedPts} fill="none" stroke="#e24b4a" strokeWidth="1.5" strokeDasharray="4 2"/>
      {trend.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="#7a8c79" fontFamily="Poppins,sans-serif">
          {dayShort[new Date(d.date + 'T00:00:00').getDay()]}
        </text>
      ))}
      <text x={pad.l - 2} y={pad.t + 4} textAnchor="end" fontSize="7" fill="#7a8c79">{maxY}</text>
      <text x={pad.l - 2} y={pad.t + innerH} textAnchor="end" fontSize="7" fill="#7a8c79">0</text>
    </svg>
  );
}

// ─── Main AdminOverview ─────────────────────────────────────────
export function AdminOverview() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [activities, setActivities] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, []);

  async function fetchData() {
    const [mRes, aRes] = await Promise.all([
      fetch('/api/metrics/summary'),
      fetch('/api/audit?per_page=10'),
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
        { label: 'Operator Aktif', value: metrics.active_operators, sub: 'terdaftar', borderColor: '#4e9955', valueColor: '#1a3a1f', subColor: '#4e9955' },
        { label: 'Manager Aktif', value: metrics.active_managers, sub: 'terdaftar', borderColor: '#4e9955', valueColor: '#1a3a1f', subColor: '#4e9955' },
        { label: 'Alert Belum Ditangani', value: metrics.unhandled_alerts, sub: 'perlu perhatian', borderColor: '#c98200', valueColor: '#7a4e00' },
        { label: 'Avg AI Confidence', value: `${(metrics.avg_confidence * 100).toFixed(1)}%`, sub: 'rata-rata inspeksi', borderColor: '#2d5c33', valueColor: '#1a3a1f', subColor: '#4e9955' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Overview Sistem</h1>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 ml-4">Update otomatis setiap 15 detik</p>
      </div>

      {/* Metric cards with stagger */}
      {metrics ? (
        <div className="grid grid-cols-4 gap-3">
          {summaryCards.map((c, i) => (
            <div key={c.label} className={`animate-fade-up delay-${[50,100,150,200,250,300,400,500][i] ?? 100}`}>
              <MetricCard {...c} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-3.5 border border-[#c8d4c8] animate-pulse" style={{ borderTop: '3px solid #e4e9e3' }}>
              <div className="h-2.5 shimmer rounded w-3/4 mb-3"/>
              <div className="h-7 shimmer rounded w-1/2"/>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {metrics && (metrics.grade_distribution || metrics.daily_trend) && (
        <div className="grid grid-cols-2 gap-4 animate-fade-up delay-300">
          {/* Grade distribution */}
          {metrics.grade_distribution && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Distribusi Grade
                  <span className="text-[10px] font-normal text-gray-400 uppercase tracking-wide">Hari ini</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GradeDonut dist={metrics.grade_distribution} />
              </CardContent>
            </Card>
          )}

          {/* Trend chart */}
          {metrics.daily_trend && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Tren Inspeksi
                  <span className="text-[10px] font-normal text-gray-400 uppercase tracking-wide">7 Hari</span>
                </CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-brand-600 rounded"/>
                    <span className="text-[10px] text-gray-500">Approved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 border-t-[1.5px] border-dashed border-red-400"/>
                    <span className="text-[10px] text-gray-500">Rejected</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <TrendChart trend={metrics.daily_trend} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent activity */}
      <Card className="animate-fade-up delay-400">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-brand-500 inline-block" />
            Aktivitas Terkini
          </CardTitle>
        </CardHeader>
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

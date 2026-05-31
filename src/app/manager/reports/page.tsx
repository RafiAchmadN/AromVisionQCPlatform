'use client';
import { useState } from 'react';
import { ManagerSidebar } from '@/components/manager/sidebar';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { key: Period; label: string; desc: string }[] = [
  { key: 'daily',   label: 'Harian',   desc: 'Data hari ini' },
  { key: 'weekly',  label: 'Mingguan', desc: '7 hari terakhir' },
  { key: 'monthly', label: 'Bulanan',  desc: '30 hari terakhir' },
];

const GRADE_COLOR: Record<string, string> = {
  A: '#2d5c33', B: '#4e9955', C: '#c98200', Reject: '#e24b4a',
};
const STATUS_COLOR: Record<string, string> = {
  APPROVED: '#2d5c33', REJECTED: '#e24b4a', QUARANTINED: '#c98200',
};

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-gray-800 w-6 text-right">{value}</span>
    </div>
  );
}

function StatRow({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold" style={{ color: accent ?? '#111827' }}>{value}</span>
        {sub && <span className="text-[10px] text-gray-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReportPanel({ period }: { period: Period }) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/reports/${period}`);
      if (!res.ok) { setError('Gagal memuat laporan'); return; }
      setData(await res.json());
      setLoaded(true);
    } catch { setError('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }

  const p = PERIODS.find(x => x.key === period)!;

  if (!loaded) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col items-center gap-3 min-h-[200px] justify-center">
        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
          <span className="text-brand-600 text-lg">📊</span>
        </div>
        <p className="text-sm font-semibold text-gray-700">Laporan {p.label}</p>
        <p className="text-xs text-gray-400 text-center">{p.desc}</p>
        <button onClick={load} disabled={loading} type="button"
          className="mt-1 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors">
          {loading ? 'Memuat...' : 'Tampilkan'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (!data) return null;

  const total       = (data.total_lots as number) ?? 0;
  const approved    = (data.approved   as number) ?? 0;
  const rejected    = (data.rejected   as number) ?? 0;
  const quarantined = (data.quarantined as number) ?? 0;
  const pending     = total - approved - rejected - quarantined;
  const gradeDist   = (data.grade_distribution   as Record<string, number>) ?? {};
  const shiftDist   = (data.shift_breakdown      as Record<string, number>) ?? {};
  const productDist = (data.breakdown_by_product as Record<string, number>) ?? {};
  const topDefects  = (data.top_defects as [string, number][]) ?? [];
  const scanned     = (data.total_objects_scanned as number) ?? 0;
  const passCount   = (data.pass_count as number) ?? 0;
  const failCount   = (data.fail_count as number) ?? 0;
  const passRate    = scanned > 0 ? ((passCount / scanned) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-brand-50 border-b border-brand-100">
        <div>
          <p className="text-sm font-bold text-brand-800">Laporan {p.label}</p>
          <p className="text-[10px] text-brand-500">{p.desc}</p>
        </div>
        <button type="button" onClick={() => setLoaded(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">✕ Tutup</button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Status lot */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status Lot</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Lot',  value: total,       color: '#1a3a1f' },
              { label: 'Disetujui', value: approved,    color: STATUS_COLOR.APPROVED },
              { label: 'Ditolak',   value: rejected,    color: STATUS_COLOR.REJECTED },
              { label: 'Karantina', value: quarantined, color: STATUS_COLOR.QUARANTINED },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-xl font-extrabold mt-0.5" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="mt-2 h-2.5 rounded-full overflow-hidden flex gap-0.5">
              {approved    > 0 && <div style={{ flex: approved,    background: STATUS_COLOR.APPROVED    }} />}
              {rejected    > 0 && <div style={{ flex: rejected,    background: STATUS_COLOR.REJECTED    }} />}
              {quarantined > 0 && <div style={{ flex: quarantined, background: STATUS_COLOR.QUARANTINED }} />}
              {pending     > 0 && <div style={{ flex: pending,     background: '#d1d5db'               }} />}
            </div>
          )}
        </div>

        {/* QC Metrics */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Metrik QC</p>
          <div className="flex flex-col">
            <StatRow label="Avg Confidence"    value={`${(Number(data.avg_confidence) * 100).toFixed(1)}%`} accent="#2d5c33" />
            <StatRow label="Avg Rot Level"     value={`${data.avg_rot_level}%`}     accent="#c98200" />
            <StatRow label="Avg Anomaly Score" value={Number(data.avg_anomaly_score).toFixed(3)} />
            <StatRow label="Avg Durasi"        value={`${data.avg_duration_min} mnt`} />
            {scanned > 0 && <>
              <StatRow label="Total Terpindai" value={scanned} />
              <StatRow label="Pass Rate"       value={`${passRate}%`} sub={`${passCount}/${scanned}`} accent="#2d5c33" />
              {failCount > 0 && <StatRow label="Fail" value={failCount} accent="#e24b4a" />}
            </>}
            {data.rejection_rate !== undefined && (
              <StatRow label="Tingkat Penolakan" value={`${data.rejection_rate}%`}
                accent={Number(data.rejection_rate) > 20 ? '#e24b4a' : '#2d5c33'} />
            )}
          </div>
        </div>

        {/* Grade distribution */}
        {Object.keys(gradeDist).length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Distribusi Grade</p>
            <div className="flex flex-col gap-1.5">
              {['A','B','C','Reject'].map(g => gradeDist[g] > 0 && (
                <MiniBar key={g} label={`Grade ${g}`} value={gradeDist[g]} max={total} color={GRADE_COLOR[g]} />
              ))}
            </div>
          </div>
        )}

        {/* Top defects */}
        {topDefects.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Defek Teratas</p>
            <div className="flex flex-col gap-1.5">
              {topDefects.map(([name, count]) => (
                <MiniBar key={name} label={name.replace(/_/g,' ')} value={count} max={topDefects[0][1]} color="#c98200" />
              ))}
            </div>
          </div>
        )}

        {/* Shift & Produk */}
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(shiftDist).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Per Shift</p>
              {Object.entries(shiftDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-bold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          )}
          {Object.keys(productDist).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Per Produk</p>
              {Object.entries(productDist).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-600 truncate">{k}</span>
                  <span className="font-bold text-gray-800 shrink-0 ml-2">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagerReportsPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <ManagerSidebar />
        <main className="flex-1 overflow-y-auto bg-brand-50 p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
                <p className="text-xs text-gray-400 mt-0.5">Ringkasan kualitas inspeksi per periode</p>
              </div>
              <a href="/api/reports/export" download
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
                ⬇ Ekspor CSV
              </a>
            </div>
            <div className="flex flex-row gap-4 items-start">
              {PERIODS.map(({ key }) => (
                <div key={key} className="flex-1 min-w-0">
                  <ReportPanel period={key} />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

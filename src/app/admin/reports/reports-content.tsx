'use client';
import { useState } from 'react';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Harian' },
  { key: 'weekly', label: 'Mingguan' },
  { key: 'monthly', label: 'Bulanan' },
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ReportPanel({ period }: { period: Period }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
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
    } catch {
      setError('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }

  const label = period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan';

  if (!loaded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-gray-700">Laporan {label}</p>
        <p className="text-xs text-gray-500 text-center">
          {period === 'daily' ? 'Data lot dan inspeksi hari ini' : period === 'weekly' ? 'Ringkasan 7 hari terakhir' : 'Ringkasan 30 hari terakhir'}
        </p>
        <button
          onClick={load}
          disabled={loading}
          type="button"
          className="mt-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? 'Memuat...' : 'Tampilkan Laporan'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (!data) return null;

  const total = (data.total_lots as number) ?? 0;
  const breakdown = data.breakdown_by_product as Record<string, number> | undefined;
  const gradeDistribution = data.grade_distribution as Record<string, number> | undefined;
  const shiftBreakdown = data.shift_breakdown as Record<string, number> | undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">Laporan {label}</p>
        <button type="button" onClick={() => setLoaded(false)} className="text-xs text-gray-400 hover:text-gray-600">Tutup</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Lot" value={total} />
        {data.approved !== undefined && <StatCard label="Disetujui" value={data.approved as number} />}
        {data.rejected !== undefined && <StatCard label="Ditolak" value={data.rejected as number} />}
        {data.quarantined !== undefined && <StatCard label="Karantina" value={data.quarantined as number} />}
        {data.rejection_rate !== undefined && <StatCard label="Tingkat Penolakan" value={`${data.rejection_rate}%`} />}
        {data.avg_confidence !== undefined && <StatCard label="Rata-rata Confidence" value={`${(Number(data.avg_confidence) * 100).toFixed(1)}%`} />}
        {data.avg_rot_level !== undefined && <StatCard label="Rata-rata Rot Level" value={`${data.avg_rot_level}%`} />}
        {data.avg_duration_min !== undefined && <StatCard label="Rata-rata Durasi" value={`${data.avg_duration_min} mnt`} />}
      </div>
      {breakdown && Object.keys(breakdown).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Per Produk</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(breakdown).map(([k, v]) => (
              <div key={k} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 flex justify-between">
                <span className="text-xs text-gray-700">{k}</span>
                <span className="text-xs font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {gradeDistribution && Object.keys(gradeDistribution).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Distribusi Grade</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(gradeDistribution).map(([k, v]) => (
              <div key={k} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 flex justify-between">
                <span className="text-xs text-gray-700">Grade {k}</span>
                <span className="text-xs font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {shiftBreakdown && Object.keys(shiftBreakdown).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Per Shift</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(shiftBreakdown).map(([k, v]) => (
              <div key={k} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 flex justify-between">
                <span className="text-xs text-gray-700">{k}</span>
                <span className="text-xs font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReportsContent() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
        <a
          href="/api/reports/export"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          download
        >
          Ekspor CSV
        </a>
      </div>
      <div className="flex flex-col gap-4">
        {PERIODS.map(({ key }) => (
          <ReportPanel key={key} period={key} />
        ))}
      </div>
    </div>
  );
}

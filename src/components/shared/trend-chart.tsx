'use client';
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { useLanguage } from '@/contexts/language-context';

interface WeekData {
  week: string;
  total_lots: number;
  approved: number;
  rejected: number;
  avg_rot_level: number;
  rejection_rate: number;
  pass_rate: number;
  grade_A: number;
  grade_B: number;
  grade_C: number;
  grade_Reject: number;
}

export function TrendChart() {
  const { lang } = useLanguage();
  const [data, setData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'quality' | 'volume'>('quality');

  useEffect(() => {
    fetch('/api/analytics/trends')
      .then((r) => r.json())
      .then((d) => { setData(d.weeks ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const hasData = data.some((d) => d.total_lots > 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-brand-50 border-b border-brand-100">
        <div>
          <p className="text-sm font-bold text-brand-800">
            {lang === 'en' ? '8-Week Quality Trend' : 'Tren Kualitas 8 Minggu'}
          </p>
          <p className="text-[10px] text-brand-500">
            {lang === 'en' ? 'Weekly quality metrics for SIMA Arôme raw materials' : 'Metrik kualitas mingguan bahan baku SIMA Arôme'}
          </p>
        </div>
        <div className="flex gap-1">
          {(['quality', 'volume'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === v ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'quality'
                ? (lang === 'en' ? 'Quality' : 'Kualitas')
                : (lang === 'en' ? 'Volume' : 'Volume')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs">{lang === 'en' ? 'No historical data yet' : 'Belum ada data historis'}</p>
          </div>
        ) : view === 'quality' ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number, name: string) => [`${v}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone" dataKey="avg_rot_level"
                stroke="#c98200" strokeWidth={2} dot={{ r: 3 }}
                name={lang === 'en' ? 'Avg Rot Level %' : 'Rata-rata Busuk %'}
              />
              <Line
                type="monotone" dataKey="pass_rate"
                stroke="#2d5c33" strokeWidth={2} dot={{ r: 3 }}
                name={lang === 'en' ? 'Pass Rate %' : 'Lulus QC %'}
              />
              <Line
                type="monotone" dataKey="rejection_rate"
                stroke="#e24b4a" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }}
                name={lang === 'en' ? 'Rejection Rate %' : 'Ditolak %'}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="approved" stackId="a" fill="#2d5c33" name={lang === 'en' ? 'Approved' : 'Disetujui'} />
              <Bar dataKey="rejected" stackId="a" fill="#e24b4a" name={lang === 'en' ? 'Rejected' : 'Ditolak'} />
              <Bar dataKey="quarantined" stackId="a" fill="#c98200" name={lang === 'en' ? 'Quarantined' : 'Karantina'} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Grade trend mini stat */}
        {hasData && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2">
            {(['A','B','C','Reject'] as const).map((g) => {
              const total = data.reduce((s, d) => s + (d[`grade_${g}` as keyof WeekData] as number ?? 0), 0);
              const colors = { A: '#2d5c33', B: '#4e9955', C: '#c98200', Reject: '#e24b4a' };
              return (
                <div key={g} className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400">{lang === 'en' ? 'Grade' : 'Grade'} {g}</span>
                  <span className="text-lg font-extrabold" style={{ color: colors[g] }}>{total}</span>
                  <span className="text-[9px] text-gray-400">{lang === 'en' ? 'total lots' : 'total lot'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import type { ProductQualityScore } from '@/app/api/analytics/quality-score/route';

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#2d5c33' : score >= 50 ? '#c98200' : '#e24b4a';

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f0f0f0" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')   return <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">▲ Improving</span>;
  if (trend === 'down') return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">▼ Degrading</span>;
  return <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">→ Stable</span>;
}

export function ProductQualityScorePanel() {
  const { lang } = useLanguage();
  const [scores, setScores] = useState<ProductQualityScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/quality-score')
      .then((r) => r.json())
      .then((d) => { setScores(d.scores ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 bg-brand-50 border-b border-brand-100">
        <p className="text-sm font-bold text-brand-800">
          {lang === 'en' ? 'Product Quality Intelligence' : 'Inteligensi Kualitas Produk'}
        </p>
        <p className="text-[10px] text-brand-500">
          {lang === 'en'
            ? 'Composite quality score per raw material — higher is better'
            : 'Skor kualitas komposit per bahan baku — semakin tinggi semakin baik'}
        </p>
      </div>

      <div className="p-4 flex flex-col gap-2 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <p className="text-xs">{lang === 'en' ? 'No completed lots yet' : 'Belum ada lot yang selesai'}</p>
          </div>
        ) : (
          scores.map((s) => (
            <div key={s.product_type} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
              <ScoreRing score={s.score} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-800 capitalize">{s.product_type}</span>
                  <TrendBadge trend={s.trend} />
                </div>
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-gray-500">
                    {lang === 'en' ? 'Pass rate' : 'Lulus QC'}: <b className="text-gray-700">{s.pass_rate}%</b>
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {lang === 'en' ? 'Avg Rot' : 'Rata-rata Busuk'}: <b className={s.avg_rot_level > 40 ? 'text-red-600' : 'text-gray-700'}>{s.avg_rot_level}%</b>
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {lang === 'en' ? 'Rejection' : 'Ditolak'}: <b className={s.rejection_rate > 20 ? 'text-red-600' : 'text-gray-700'}>{s.rejection_rate}%</b>
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {lang === 'en' ? 'Lots' : 'Lot'}: <b className="text-gray-700">{s.total_lots}</b>
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex gap-1 flex-wrap justify-end">
                  {Object.entries(s.grade_dist).map(([g, v]) =>
                    v > 0 ? (
                      <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: g === 'A' ? '#dcfce7' : g === 'B' ? '#d1fae5' : g === 'C' ? '#fef3c7' : '#fee2e2',
                          color: g === 'A' ? '#166534' : g === 'B' ? '#065f46' : g === 'C' ? '#92400e' : '#991b1b',
                        }}>
                        {g}:{v}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {scores.length > 0 && (
          <p className="text-[9px] text-gray-400 text-center pt-1">
            {lang === 'en'
              ? 'Score = weighted avg of pass rate, rot level, rejection rate & confidence'
              : 'Skor = rata-rata tertimbang lulus QC, rot level, rejection rate & confidence'}
          </p>
        )}
      </div>
    </div>
  );
}

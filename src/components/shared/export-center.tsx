'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

type Period = 'today' | 'week' | 'month' | 'custom';
type Format = 'csv' | 'pdf';

function getRange(period: Period, cf: string, ct: string) {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (period === 'today') {
    const t = fmt(now);
    return { from: `${t}T00:00:00`, to: `${t}T23:59:59`, label: t };
  }
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { from: `${fmt(mon)}T00:00:00`, to: `${fmt(now)}T23:59:59`, label: `${fmt(mon)} – ${fmt(now)}` };
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: `${fmt(first)}T00:00:00`, to: `${fmt(now)}T23:59:59`, label: `${fmt(first)} – ${fmt(now)}` };
  }
  return { from: `${cf}T00:00:00`, to: `${ct}T23:59:59`, label: `${cf} – ${ct}` };
}

export function ExportCenter() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [format, setFormat] = useState<Format>('csv');
  const [cf, setCf] = useState('');
  const [ct, setCt] = useState('');

  const isEn = lang === 'en';

  const periods: { key: Period; label: string }[] = [
    { key: 'today',  label: isEn ? 'Today'      : 'Hari Ini' },
    { key: 'week',   label: isEn ? 'This Week'  : 'Minggu Ini' },
    { key: 'month',  label: isEn ? 'This Month' : 'Bulan Ini' },
    { key: 'custom', label: isEn ? 'Custom'     : 'Kustom' },
  ];

  function handleExport() {
    if (period === 'custom' && (!cf || !ct)) return;
    const { from, to } = getRange(period, cf, ct);
    if (format === 'csv') {
      window.open(`/api/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&inspected_only=1`, '_blank');
    } else {
      window.open(`/reports/summary/print?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&period=${period}`, '_blank');
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isEn ? 'Export Report' : 'Ekspor Laporan'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brand-800">{isEn ? 'Export Report' : 'Ekspor Laporan'}</p>
                <p className="text-[10px] text-brand-500">{isEn ? 'Choose period and format' : 'Pilih periode dan format'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Period */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{isEn ? 'Period' : 'Periode'}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {periods.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPeriod(p.key)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                        period === p.key
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {period === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">{isEn ? 'From' : 'Dari'}</label>
                      <input type="date" value={cf} onChange={(e) => setCf(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">{isEn ? 'To' : 'Sampai'}</label>
                      <input type="date" value={ct} onChange={(e) => setCt(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                    </div>
                  </div>
                )}
              </div>

              {/* Format */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{isEn ? 'Format' : 'Format'}</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* CSV */}
                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      format === 'csv' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format === 'csv' ? 'bg-brand-600' : 'bg-gray-100'}`}>
                      <svg className={`w-5 h-5 ${format === 'csv' ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${format === 'csv' ? 'text-brand-700' : 'text-gray-700'}`}>CSV</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{isEn ? 'Raw data, Excel-ready' : 'Data mentah, siap Excel'}</p>
                    </div>
                  </button>

                  {/* PDF */}
                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      format === 'pdf' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format === 'pdf' ? 'bg-brand-600' : 'bg-gray-100'}`}>
                      <svg className={`w-5 h-5 ${format === 'pdf' ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${format === 'pdf' ? 'text-brand-700' : 'text-gray-700'}`}>PDF</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{isEn ? 'Summary report, print-ready' : 'Laporan ringkasan, siap cetak'}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Export button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={period === 'custom' && (!cf || !ct)}
                className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {format === 'csv'
                  ? (isEn ? 'Download CSV' : 'Unduh CSV')
                  : (isEn ? 'Open PDF Report' : 'Buka Laporan PDF')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

interface Props {
  lotId: string;
  lotCode?: string;
}

export function AiInsightButton({ lotId, lotCode }: Props) {
  const { lang } = useLanguage();
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');

  async function generate() {
    setLoading(true); setError(''); setInsight('');
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lot_id: lotId, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? (lang === 'en' ? 'AI insight unavailable' : 'AI insight tidak tersedia'));
      } else {
        setInsight(data.insight);
        setGeneratedAt(new Date(data.generated_at).toLocaleString('id-ID'));
      }
    } catch {
      setError(lang === 'en' ? 'Network error' : 'Gagal terhubung ke AI');
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-100">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-brand-800">
            {lang === 'en' ? 'AI Quality Insight' : 'Insight Kualitas AI'}
          </p>
          <p className="text-[10px] text-brand-500">
            {lang === 'en' ? 'Powered by Claude AI' : 'Didukung Claude AI'}{lotCode ? ` · ${lotCode}` : ''}
          </p>
        </div>
        {!insight && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors shrink-0"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                {lang === 'en' ? 'Analyzing...' : 'Menganalisis...'}
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {lang === 'en' ? 'Generate Insight' : 'Buat Insight'}
              </>
            )}
          </button>
        )}
        {insight && (
          <button
            type="button"
            onClick={() => { setInsight(''); setGeneratedAt(''); }}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            {lang === 'en' ? 'Clear' : 'Hapus'}
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50">
          {error}
        </div>
      )}

      {insight && (
        <div className="px-4 py-4">
          <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          <p className="text-[10px] text-gray-400 mt-2">
            {lang === 'en' ? 'Generated' : 'Dibuat'}: {generatedAt}
          </p>
        </div>
      )}

      {!insight && !error && !loading && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-gray-400">
            {lang === 'en'
              ? 'Click "Generate Insight" to get AI analysis of this lot\'s quality data compared to historical trends.'
              : 'Klik "Buat Insight" untuk mendapatkan analisis AI kualitas lot ini dibandingkan tren historis.'}
          </p>
        </div>
      )}
    </div>
  );
}

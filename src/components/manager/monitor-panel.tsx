'use client';
import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import type { Lot, MetricsSummary } from '@/lib/types';

interface Props {
  onSelectLot?: (lot: Lot) => void;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-50 text-green-700 border-green-200',
  B: 'bg-brand-50 text-brand-700 border-brand-200',
  C: 'bg-amber-50 text-amber-700 border-amber-200',
  Reject: 'bg-red-50 text-red-700 border-red-200',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${diff}m lalu`;
  return `${Math.floor(diff / 60)}j lalu`;
}

export function ManagerMonitorPanel({ onSelectLot }: Props) {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchLots();
    const id = setInterval(() => { fetchMetrics(); fetchLots(); }, 5_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMetrics() {
    const res = await fetch('/api/metrics/summary');
    if (res.ok) setMetrics(await res.json());
  }

  async function fetchLots(search = q) {
    const params = new URLSearchParams({ status: 'MANAGER_REVIEW', per_page: '50' });
    if (search) params.set('q', search);
    const res = await fetch(`/api/search/lots?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLots(data.data ?? []);
    }
  }

  async function manualRefresh() {
    setRefreshing(true);
    await Promise.all([fetchMetrics(), fetchLots()]);
    setRefreshing(false);
  }

  function handleSearch(val: string) {
    setQ(val);
    fetchLots(val);
  }

  function selectLot(lot: Lot) {
    setSelectedId(lot.id);
    onSelectLot?.(lot);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-brand-100">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
          <h2 className="text-base font-semibold text-gray-800">{t('mgr.monitoring')}</h2>
        </div>
        <button
          type="button"
          onClick={manualRefresh}
          className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Refresh sekarang"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metric cards */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Pending',    value: metrics.pending_lots,                        color: 'text-amber-600'  },
            { label: 'Pass Rate',  value: `${metrics.pass_rate}%`,                     color: 'text-green-600'  },
            { label: 'Fail Rate',  value: `${metrics.fail_rate}%`,                     color: 'text-red-600'    },
            { label: 'Avg AI Conf',value: `${(metrics.avg_confidence * 100).toFixed(1)}%`, color: 'text-brand-600' },
          ].map((m, i) => (
            <Card key={m.label} className={`animate-fade-up delay-${[50,100,150,200][i]}`}>
              <CardContent className="py-2.5 px-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
          placeholder={t('mgr.searchPlaceholder')}
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Review queue as cards */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-700">
            {t('mgr.reviewQueueLabel')}
            {lots.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {lots.length}
              </span>
            )}
          </p>
        </div>

        {lots.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-xs italic">{t('mgr.noPending')}</div>
        ) : (
          lots.map((lot) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reports = (lot as any).inspection_reports as Array<{ final_grade: string }> | undefined;
            const grade = reports?.[0]?.final_grade;
            const isSelected = selectedId === lot.id;

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => selectLot(lot)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                  isSelected
                    ? 'bg-brand-50 border-brand-400 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-brand-300 hover:bg-brand-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{lot.batch_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {lot.product_type} · {(lot.operator as { name?: string } | undefined)?.name ?? '-'}
                      {' · '}
                      {timeAgo(lot.status_changed_at ?? lot.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {grade && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${GRADE_COLORS[grade] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        Grade {grade}
                      </span>
                    )}
                    <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4">Review</Badge>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

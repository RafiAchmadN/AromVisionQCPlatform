'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ArrowUpCircle, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { AiInsightButton } from '@/components/shared/ai-insight';
import type { Lot, InspectionReport, Decision } from '@/lib/types';

interface Props {
  selectedLot?: Lot | null;
}

// ─── Decision metadata (descriptions shown in confirmation modal) ─────────────
type DecisionKey = 'APPROVED' | 'REJECTED' | 'QUARANTINED' | 'ESCALATED';

const DECISION_META: Record<DecisionKey, {
  icon: React.ReactNode;
  headerBg: string;
  headerText: string;
  badgeVariant: 'success' | 'destructive' | 'warning';
  requiresReason: boolean;
  descId: string;
  descEn: string;
  bulletId: string[];
  bulletEn: string[];
}> = {
  APPROVED: {
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    headerBg: 'bg-green-50 border-green-100',
    headerText: 'text-green-800',
    badgeVariant: 'success',
    requiresReason: false,
    descId: 'Batch ini dinyatakan LULUS QC dan siap diproses.',
    descEn: 'This batch is declared PASSED QC and ready to process.',
    bulletId: [
      '✓ Lot berpindah ke status APPROVED',
      '✓ Operator mendapat notifikasi persetujuan',
      '✓ Batch siap masuk proses produksi / gudang',
      '✓ Keputusan tersimpan permanen di audit log',
    ],
    bulletEn: [
      '✓ Lot moves to APPROVED status',
      '✓ Operator receives approval notification',
      '✓ Batch is ready for production / warehouse',
      '✓ Decision permanently saved in audit log',
    ],
  },
  REJECTED: {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    headerBg: 'bg-red-50 border-red-100',
    headerText: 'text-red-800',
    badgeVariant: 'destructive',
    requiresReason: false,
    descId: 'Batch ini dinyatakan GAGAL QC dan tidak dapat digunakan.',
    descEn: 'This batch is declared FAILED QC and cannot be used.',
    bulletId: [
      '✗ Lot berpindah ke status REJECTED',
      '✗ Batch perlu dibuang atau dikembalikan ke supplier',
      '✓ Operator mendapat notifikasi penolakan',
      '✓ Keputusan tersimpan permanen di audit log',
    ],
    bulletEn: [
      '✗ Lot moves to REJECTED status',
      '✗ Batch must be discarded or returned to supplier',
      '✓ Operator receives rejection notification',
      '✓ Decision permanently saved in audit log',
    ],
  },
  QUARANTINED: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    headerBg: 'bg-amber-50 border-amber-100',
    headerText: 'text-amber-800',
    badgeVariant: 'warning',
    requiresReason: false,
    descId: 'Batch ditahan untuk investigasi lebih lanjut sebelum keputusan final.',
    descEn: 'Batch is held for further investigation before a final decision.',
    bulletId: [
      '⚠ Lot berpindah ke status QUARANTINED',
      '⚠ Batch disimpan terpisah dari stok normal',
      '⚠ Keputusan dapat diubah setelah investigasi selesai',
      '✓ Operator mendapat notifikasi karantina',
      '✓ Keputusan tersimpan permanen di audit log',
    ],
    bulletEn: [
      '⚠ Lot moves to QUARANTINED status',
      '⚠ Batch stored separately from normal stock',
      '⚠ Decision can be revised after investigation',
      '✓ Operator receives quarantine notification',
      '✓ Decision permanently saved in audit log',
    ],
  },
  ESCALATED: {
    icon: <ArrowUpCircle className="w-5 h-5 text-orange-600" />,
    headerBg: 'bg-orange-50 border-orange-100',
    headerText: 'text-orange-800',
    badgeVariant: 'warning',
    requiresReason: true,
    descId: 'Masalah diteruskan ke Admin / Direksi karena di luar wewenang Manager.',
    descEn: 'Issue is escalated to Admin / Management because it exceeds Manager authority.',
    bulletId: [
      '↑ Lot berpindah ke status ESCALATED',
      '↑ Admin / Direksi mendapat notifikasi eskalasi',
      '✗ Manager tidak dapat mengubah keputusan setelah eskalasi',
      '✓ Alasan eskalasi wajib diisi',
      '✓ Keputusan tersimpan permanen di audit log',
    ],
    bulletEn: [
      '↑ Lot moves to ESCALATED status',
      '↑ Admin / Management receives escalation notification',
      '✗ Manager cannot change decision after escalation',
      '✓ Escalation reason is required',
      '✓ Decision permanently saved in audit log',
    ],
  },
};

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({
  decision,
  batchName,
  lang,
  onConfirm,
  onCancel,
  loading,
}: {
  decision: DecisionKey;
  batchName: string;
  lang: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const meta = DECISION_META[decision];
  const bullets = lang === 'en' ? meta.bulletEn : meta.bulletId;
  const desc    = lang === 'en' ? meta.descEn   : meta.descId;
  const isEn    = lang === 'en';

  const LABEL: Record<DecisionKey, string> = {
    APPROVED:    isEn ? 'Approve'    : 'Setujui',
    REJECTED:    isEn ? 'Reject'     : 'Tolak',
    QUARANTINED: isEn ? 'Quarantine' : 'Karantina',
    ESCALATED:   isEn ? 'Escalate'   : 'Eskalasi',
  };

  const CONFIRM_BTN_COLOR: Record<DecisionKey, string> = {
    APPROVED:    'bg-green-600 hover:bg-green-700 text-white',
    REJECTED:    'bg-red-600 hover:bg-red-700 text-white',
    QUARANTINED: 'bg-amber-500 hover:bg-amber-600 text-white',
    ESCALATED:   'bg-orange-500 hover:bg-orange-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${meta.headerBg}`}>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
            {meta.icon}
          </div>
          <div>
            <h3 className={`text-base font-bold ${meta.headerText}`}>
              {isEn ? `Confirm: ${LABEL[decision]}` : `Konfirmasi: ${LABEL[decision]}`}
            </h3>
            <p className={`text-xs mt-0.5 ${meta.headerText} opacity-70`}>
              {isEn ? 'Lot' : 'Lot'}: <span className="font-semibold font-mono">{batchName}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Description */}
          <p className="text-sm text-gray-700">{desc}</p>

          {/* Consequences list */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {isEn ? 'What happens:' : 'Yang akan terjadi:'}
            </p>
            {bullets.map((b) => {
              const symbol = b.charAt(0);
              const text   = b.slice(2);
              const color  = symbol === '✓' ? 'text-green-700'
                : symbol === '✗' ? 'text-red-600'
                : symbol === '↑' ? 'text-orange-600'
                : 'text-amber-700';
              return (
                <div key={b} className="flex items-start gap-2">
                  <span className={`text-xs font-bold shrink-0 mt-0.5 ${color}`}>{symbol}</span>
                  <span className={`text-xs ${color}`}>{text}</span>
                </div>
              );
            })}
          </div>

          {/* Reason input */}
          {meta.requiresReason ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">
                {isEn ? 'Escalation reason (required):' : 'Alasan eskalasi (wajib diisi):'}
              </label>
              <textarea
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                placeholder={isEn ? 'Explain why this lot needs escalation...' : 'Jelaskan mengapa lot ini perlu dieskalasi...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">
                {isEn ? 'Reason / notes (optional):' : 'Alasan / catatan (opsional):'}
              </label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                placeholder={isEn ? 'Add notes if needed...' : 'Tambahkan catatan jika diperlukan...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={loading || (meta.requiresReason && !reason.trim())}
            className={`flex-1 h-10 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${CONFIRM_BTN_COLOR[decision]}`}
          >
            {loading
              ? (isEn ? 'Processing...' : 'Memproses...')
              : (isEn ? `Confirm ${LABEL[decision]}` : `Konfirmasi ${LABEL[decision]}`)}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-10 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isEn ? 'Cancel' : 'Batal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Decision Panel ──────────────────────────────────────────────────────
export function ManagerDecisionPanel({ selectedLot }: Props) {
  const { t, lang } = useLanguage();
  const [report, setReport]           = useState<InspectionReport | null>(null);
  const [autoDecision, setAutoDecision] = useState<Decision | null>(null);
  const [loading, setLoading]         = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [done, setDone]               = useState(false);
  const [doneDecision, setDoneDecision] = useState('');
  const [error, setError]             = useState('');
  const [pendingDecision, setPendingDecision] = useState<DecisionKey | null>(null);

  const loadDetail = useCallback(async (lot: Lot) => {
    setReport(null); setAutoDecision(null); setError('');
    setLoading(true);
    try {
      const [reportRes, decisionRes] = await Promise.all([
        fetch(`/api/inspection/reports/${lot.id}`),
        fetch(`/api/decision/${lot.id}`, { method: 'POST' }),
      ]);
      if (reportRes.ok) setReport(await reportRes.json());
      if (decisionRes.ok) { const d = await decisionRes.json(); setAutoDecision(d.decision); }
      if (!reportRes.ok && !decisionRes.ok)
        setError(lang === 'en' ? 'Inspection data not available. Use manual decision below.' : 'Data inspeksi belum tersedia. Gunakan keputusan manual di bawah.');
    } catch {
      setError(lang === 'en' ? 'Failed to load details. Check connection.' : 'Gagal memuat detail. Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!selectedLot) return;
    setDone(false); setDoneDecision(''); setPendingDecision(null); setError('');
    loadDetail(selectedLot);
  }, [selectedLot?.id, loadDetail]);

  async function executeDecision(decision: DecisionKey, reason: string) {
    if (!selectedLot) return;
    setConfirming(true); setError('');
    try {
      const body = decision === 'ESCALATED'
        ? { decision, escalation_reason: reason }
        : { decision, override_reason: reason || undefined };

      const res = await fetch(`/api/decision/${selectedLot.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDone(true);
        setDoneDecision(decision);
        setPendingDecision(null);
      } else {
        const d = await res.json();
        setError(d.message ?? (lang === 'en' ? 'Failed to save decision' : 'Gagal menyimpan keputusan'));
        setPendingDecision(null);
      }
    } catch {
      setError(lang === 'en' ? 'An error occurred. Try again.' : 'Terjadi kesalahan. Coba lagi.');
      setPendingDecision(null);
    } finally {
      setConfirming(false);
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!selectedLot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-2xl">⬅</span>
        </div>
        <p>{t('mgr.selectLotHint')}</p>
      </div>
    );
  }

  // ── Done state ───────────────────────────────────────────────────────────────
  if (done) {
    const meta = DECISION_META[doneDecision as DecisionKey];
    const colorMap: Record<string, string> = {
      APPROVED: 'text-green-600', REJECTED: 'text-red-600',
      QUARANTINED: 'text-amber-600', ESCALATED: 'text-orange-600',
    };
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${meta?.headerBg ?? 'bg-green-50'}`}>
          {meta?.icon ?? <span className="text-2xl">✓</span>}
        </div>
        <p className={`font-bold text-xl ${colorMap[doneDecision] ?? 'text-gray-800'}`}>{doneDecision}</p>
        <p className="text-sm text-gray-600 text-center">
          {t('mgr.decisionSaved')} <span className="font-medium">{selectedLot.batch_name}</span> {t('mgr.decisionSavedSuffix')}
        </p>
      </div>
    );
  }

  const isEn = lang === 'en';

  return (
    <>
      {/* Confirmation modal */}
      {pendingDecision && selectedLot && (
        <ConfirmModal
          decision={pendingDecision}
          batchName={selectedLot.batch_name}
          lang={lang}
          onConfirm={(reason) => executeDecision(pendingDecision, reason)}
          onCancel={() => setPendingDecision(null)}
          loading={confirming}
        />
      )}

      <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-brand-100">
          <div className="flex items-start gap-2">
            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-gray-800">{t('mgr.reviewDecision')}</h2>
              <p className="text-xs text-brand-600 mt-0.5">{selectedLot.batch_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadDetail(selectedLot)}
            disabled={loading}
            className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
            title={isEn ? 'Reload' : 'Muat ulang'}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4"/>
            <div className="h-32 bg-gray-100 rounded"/>
            <div className="h-24 bg-gray-100 rounded"/>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {/* Inspection report */}
        {report && !loading && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('mgr.inspDetail')}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm pt-0">
              <DetailRow label={t('mgr.detailBatch')} value={selectedLot.batch_name} />
              <DetailRow label={t('mgr.detailGrade')}
                value={
                  <Badge variant={report.final_grade === 'A' ? 'success' : report.final_grade === 'B' ? 'default' : report.final_grade === 'C' ? 'warning' : 'destructive'}>
                    Grade {report.final_grade}
                  </Badge>
                }
              />
              <DetailRow label={t('rpt.avgConf')}         value={`${(report.avg_confidence * 100).toFixed(1)}%`} />
              <DetailRow label={t('rpt.avgRot')}          value={`${report.avg_rot_level.toFixed(1)}%`} />
              <DetailRow label="Anomaly Score"            value={report.final_anomaly_score.toFixed(3)} />
              <DetailRow label={t('mgr.detailTotalObj')}  value={report.total_objects_scanned} />
              <DetailRow label={t('mgr.detailPassFail')}  value={`${report.pass_count} / ${report.fail_count}`} />
              <DetailRow label={t('mgr.detailTotalDef')}  value={report.total_defects} />
              <DetailRow label={t('mgr.detailDuration')}  value={`${Math.round(report.inspection_duration / 60)} ${t('mgr.minutes')}`} />
            </CardContent>
          </Card>
        )}

        {/* AI Quality Insight + PDF */}
        {report && !loading && (
          <>
            <AiInsightButton lotId={selectedLot.id} lotCode={selectedLot.lot_code} />
            <a
              href={`/reports/print/${selectedLot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              {isEn ? 'Print / Download PDF Report' : 'Cetak / Unduh Laporan PDF'}
            </a>
          </>
        )}

        {/* AI recommendation */}
        {autoDecision && !loading && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('mgr.aiReco')}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Badge
                variant={autoDecision.decision === 'APPROVED' ? 'success' : autoDecision.decision === 'REJECTED' ? 'destructive' : 'warning'}
                className="text-base px-4 py-1.5 self-start"
              >
                {autoDecision.decision}
              </Badge>
              <p className="text-xs text-gray-500">
                {isEn ? 'AI recommendation based on inspection data. You can confirm, override, or escalate.' : 'Rekomendasi AI berdasarkan data inspeksi. Kamu bisa konfirmasi, override, atau eskalasi.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Decision buttons */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('mgr.manualDecision')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <p className="text-xs text-gray-500">
                {isEn
                  ? 'Click a button below to see what each decision means before confirming.'
                  : 'Klik tombol di bawah untuk melihat penjelasan setiap keputusan sebelum konfirmasi.'}
              </p>

              {/* Decision option cards */}
              <div className="flex flex-col gap-2">
                {([
                  { key: 'APPROVED'    as DecisionKey, label: isEn ? 'Approve'    : 'Setujui',   hint: isEn ? 'Batch passed QC, ready for production' : 'Batch lulus QC, siap diproses',                       border: 'border-green-200 hover:border-green-400 hover:bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
                  { key: 'REJECTED'    as DecisionKey, label: isEn ? 'Reject'     : 'Tolak',     hint: isEn ? 'Batch failed QC, discard or return'     : 'Batch gagal QC, buang atau kembalikan ke supplier',   border: 'border-red-200 hover:border-red-400 hover:bg-red-50',       text: 'text-red-700',   dot: 'bg-red-500'   },
                  { key: 'QUARANTINED' as DecisionKey, label: isEn ? 'Quarantine' : 'Karantina', hint: isEn ? 'Hold for further investigation'           : 'Tahan untuk investigasi lebih lanjut',                border: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
                  { key: 'ESCALATED'   as DecisionKey, label: isEn ? 'Escalate'   : 'Eskalasi',  hint: isEn ? 'Forward to Admin / Management level'      : 'Teruskan ke Admin / Direksi',                          border: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
                ] as const).map(({ key, label, hint, border, text, dot }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPendingDecision(key)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150 flex items-center gap-3 ${border}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${text}`}>{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{hint}</p>
                    </div>
                    <span className="text-gray-300 text-xs">›</span>
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

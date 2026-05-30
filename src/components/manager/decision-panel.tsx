'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Lot, InspectionReport, Decision } from '@/lib/types';

interface Props {
  selectedLot?: Lot | null;
}

export function ManagerDecisionPanel({ selectedLot }: Props) {
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [autoDecision, setAutoDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [doneDecision, setDoneDecision] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const [error, setError] = useState('');

  // Load lot detail whenever selected lot changes
  useEffect(() => {
    if (!selectedLot) return;

    setReport(null);
    setAutoDecision(null);
    setDone(false);
    setDoneDecision('');
    setOverrideReason('');
    setEscalationReason('');
    setShowEscalate(false);
    setError('');
    setLoading(true);

    async function load() {
      try {
        const [reportRes, decisionRes] = await Promise.all([
          fetch(`/api/inspection/reports/${selectedLot!.id}`),
          fetch(`/api/decision/${selectedLot!.id}`, { method: 'POST' }),
        ]);
        if (reportRes.ok) {
          setReport(await reportRes.json());
        } else {
          setError('Laporan inspeksi belum tersedia untuk lot ini.');
        }
        if (decisionRes.ok) {
          const d = await decisionRes.json();
          setAutoDecision(d.decision);
        }
      } catch {
        setError('Gagal memuat detail inspeksi.');
      } finally {
        setLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLot?.id]);

  async function confirmDecision(decision: string) {
    if (!selectedLot) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch(`/api/decision/${selectedLot.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, override_reason: overrideReason || undefined }),
      });
      if (res.ok) {
        setDone(true);
        setDoneDecision(decision);
      } else {
        const d = await res.json();
        setError(d.message ?? 'Gagal menyimpan keputusan');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setConfirming(false);
    }
  }

  async function escalate() {
    if (!selectedLot || !escalationReason) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch(`/api/decision/${selectedLot.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'ESCALATED', escalation_reason: escalationReason }),
      });
      if (res.ok) {
        setDone(true);
        setDoneDecision('ESCALATED');
      } else {
        const d = await res.json();
        setError(d.message ?? 'Gagal eskalasi');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setConfirming(false);
    }
  }

  if (!selectedLot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-2xl">⬅</span>
        </div>
        <p>Pilih lot dari antrian untuk melihat detail</p>
      </div>
    );
  }

  if (done) {
    const colorMap: Record<string, string> = {
      APPROVED: 'text-green-600', REJECTED: 'text-red-600',
      QUARANTINED: 'text-amber-600', ESCALATED: 'text-orange-600',
    };
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
          <span className="text-2xl">✓</span>
        </div>
        <p className={`font-bold text-xl ${colorMap[doneDecision] ?? 'text-gray-800'}`}>{doneDecision}</p>
        <p className="text-sm text-gray-600 text-center">
          Keputusan untuk lot <span className="font-medium">{selectedLot.batch_name}</span> telah disimpan.
          Operator akan mendapat notifikasi.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <h2 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">
        Review & Keputusan
        <span className="ml-2 text-xs font-normal text-brand-600">{selectedLot.batch_name}</span>
      </h2>

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

      {report && !loading && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Detail Inspeksi</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm pt-0">
            <DetailRow label="Batch" value={selectedLot.batch_name} />
            <DetailRow label="Grade"
              value={
                <Badge variant={
                  report.final_grade === 'A' ? 'success'
                  : report.final_grade === 'B' ? 'default'
                  : report.final_grade === 'C' ? 'warning'
                  : 'destructive'
                }>
                  Grade {report.final_grade}
                </Badge>
              }
            />
            <DetailRow label="Avg Confidence" value={`${(report.avg_confidence * 100).toFixed(1)}%`} />
            <DetailRow label="Avg Rot Level" value={`${report.avg_rot_level.toFixed(1)}%`} />
            <DetailRow label="Anomaly Score" value={report.final_anomaly_score.toFixed(3)} />
            <DetailRow label="Total Objek" value={report.total_objects_scanned} />
            <DetailRow label="Pass / Fail" value={`${report.pass_count} / ${report.fail_count}`} />
            <DetailRow label="Total Defects" value={report.total_defects} />
            <DetailRow label="Durasi" value={`${Math.round(report.inspection_duration / 60)} menit`} />
          </CardContent>
        </Card>
      )}

      {autoDecision && !loading && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Rekomendasi Auto-Decision AI</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <Badge
              variant={
                autoDecision.decision === 'APPROVED' ? 'success'
                : autoDecision.decision === 'REJECTED' ? 'destructive'
                : 'warning'
              }
              className="text-base px-4 py-1.5 self-start"
            >
              {autoDecision.decision}
            </Badge>

            {!showEscalate && (
              <div className="flex flex-col gap-2">
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Alasan override (opsional)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => confirmDecision(autoDecision.decision)} loading={confirming}>
                    Konfirmasi {autoDecision.decision}
                  </Button>
                  {(['APPROVED', 'REJECTED', 'QUARANTINED'] as const)
                    .filter((d) => d !== autoDecision.decision)
                    .map((d) => (
                      <Button key={d} size="sm" variant="secondary" onClick={() => confirmDecision(d)} loading={confirming}>
                        Override → {d}
                      </Button>
                    ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowEscalate(true)} className="self-start">
                  Eskalasi ke Level Lebih Tinggi
                </Button>
              </div>
            )}

            {showEscalate && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600 font-medium">Alasan eskalasi (wajib):</p>
                <textarea
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Jelaskan mengapa lot ini perlu dieskalasi..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={escalate} disabled={!escalationReason} loading={confirming}>
                    Kirim Eskalasi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowEscalate(false)}>Batal</Button>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      {!loading && !report && !error && (
        <div className="text-center text-xs text-gray-400 py-8 italic">
          Memuat data inspeksi...
        </div>
      )}
    </div>
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

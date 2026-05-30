'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LiveSessionAggregate } from '@/lib/types';

const PRODUCT_TYPES = [
  { value: 'pisang',      label: 'Pisang' },
  { value: 'apel',        label: 'Apel' },
  { value: 'buah_naga',   label: 'Buah Naga' },
  { value: 'delima',      label: 'Delima' },
  { value: 'jeruk',       label: 'Jeruk' },
  { value: 'anggur',      label: 'Anggur' },
  { value: 'lemon',       label: 'Lemon' },
  { value: 'stroberi',    label: 'Stroberi' },
  { value: 'bolazakar',   label: 'Bolazakar' },
  { value: 'leci',        label: 'Leci' },
  { value: 'blackberry',  label: 'Blackberry' },
  { value: 'bilberry',    label: 'Bilberry' },
  { value: 'buah_nangka', label: 'Buah Nangka' },
  { value: 'nanas',       label: 'Nanas' },
];

const SHIFT_OPTIONS = [
  { value: 'Pagi', label: 'Pagi (06:00 – 14:00)' },
  { value: 'Siang', label: 'Siang (14:00 – 22:00)' },
  { value: 'Malam', label: 'Malam (22:00 – 06:00)' },
];

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-700',
  B: 'text-brand-600',
  C: 'text-amber-700',
  Reject: 'text-red-700',
};

const GRADE_BG: Record<string, string> = {
  A: 'bg-green-50 border-green-200',
  B: 'bg-brand-50 border-brand-200',
  C: 'bg-amber-50 border-amber-200',
  Reject: 'bg-red-50 border-red-200',
};

interface Props {
  operatorId: string;
  operatorName: string;
  onSessionStart?: (lotId: string, sessionId: string, lotCode: string) => void;
  onSessionEnd?: () => void;
}

export function OperatorLotPanel({ operatorId, operatorName, onSessionStart, onSessionEnd }: Props) {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);
  const [activeLotId, setActiveLotId] = useState<string | null>(null);
  const [activeLotCode, setActiveLotCode] = useState<string>('');
  const [aggregate, setAggregate] = useState<LiveSessionAggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    product_type: '',
    batch_name: '',
    estimated_units: '',
    production_date: new Date().toISOString().split('T')[0],
    shift: 'Pagi',
  });

  function setField(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.product_type) newErrors.product_type = 'Pilih jenis produk';
    if (!form.batch_name.trim() || form.batch_name.length > 200) newErrors.batch_name = 'Nama batch 1–200 karakter';
    if (!form.estimated_units || Number(form.estimated_units) <= 0) newErrors.estimated_units = 'Masukkan jumlah unit positif';
    if (!form.production_date) newErrors.production_date = 'Pilih tanggal produksi';

    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estimated_units: Number(form.estimated_units) }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ _global: data.message }); return; }

      const lotId = data.lot.id;
      const sessionId = data.session?.id ?? '';
      const lotCode = data.lot.lot_code ?? data.lot.id.slice(0, 8).toUpperCase();

      setActiveLotId(lotId);
      setActiveLotCode(lotCode);
      setSessionActive(true);
      onSessionStart?.(lotId, sessionId, lotCode);
    } catch {
      setErrors({ _global: 'Gagal memulai sesi. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  }

  async function endInspection() {
    if (!activeLotId) return;
    setEndLoading(true);
    try {
      const res = await fetch(`/api/lots/${activeLotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'MANAGER_REVIEW' }),
      });
      if (res.ok) {
        const finalLot = await res.json();
        // Cek apakah sistem auto-approve (confidence>=95% & rot<=5%)
        setAutoApproved(finalLot?.status === 'APPROVED');
        setSessionActive(false);
        setSessionDone(true);
        onSessionEnd?.();
      } else {
        const d = await res.json();
        setErrors({ _global: d.message ?? 'Gagal mengakhiri inspeksi' });
      }
    } catch {
      setErrors({ _global: 'Gagal mengakhiri inspeksi. Coba lagi.' });
    } finally {
      setEndLoading(false);
    }
  }

  function startNew() {
    setSessionDone(false);
    setSessionActive(false);
    setAutoApproved(false);
    setActiveLotId(null);
    setActiveLotCode('');
    setAggregate(null);
    setErrors({});
    onSessionEnd?.();
    setForm({
      product_type: '',
      batch_name: '',
      estimated_units: '',
      production_date: new Date().toISOString().split('T')[0],
      shift: 'Pagi',
    });
  }

  // Poll live aggregate when session is active
  useEffect(() => {
    if (!activeLotId || !sessionActive) return;
    const fetchAgg = async () => {
      const res = await fetch(`/api/inspection/live/${activeLotId}`);
      if (res.ok) setAggregate(await res.json());
    };
    fetchAgg();
    const id = setInterval(fetchAgg, 3000);
    return () => clearInterval(id);
  }, [activeLotId, sessionActive]);

  // ─── COMPLETION STATE ───────────────────────────────────────
  if (sessionDone) {
    const grade = aggregate?.estimated_grade ?? 'A';
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-brand-100">
          <h2 className="text-base font-semibold text-gray-800">Inspeksi Selesai</h2>
          {autoApproved
            ? <Badge variant="success">Auto-Approved</Badge>
            : <Badge variant="warning">Menunggu Review Manager</Badge>
          }
        </div>

        {/* Status utama: auto-approved vs menunggu manajer */}
        {autoApproved ? (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-2xl">
              ✓
            </div>
            <p className="text-sm font-bold text-green-700">Batch Disetujui Otomatis</p>
            <p className="text-xs text-green-600">
              Kualitas prima terdeteksi — batch ini melewati threshold auto-approval
              (Confidence ≥ 95% &amp; Rot ≤ 5%). Tidak perlu review manual.
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">{activeLotCode}</p>
          </div>
        ) : (
          <div className={`rounded-xl border-2 p-5 flex flex-col items-center gap-2 ${GRADE_BG[grade] ?? 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Estimasi Grade</p>
            <p className={`text-6xl font-black ${GRADE_COLORS[grade] ?? 'text-gray-900'}`}>{grade}</p>
            <p className="text-xs text-gray-500 font-mono">{activeLotCode}</p>
          </div>
        )}

        {aggregate && (
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Terpindai" value={aggregate.total_objects_scanned} />
            <StatBox label="Pass" value={aggregate.pass_count} color="text-green-700" />
            <StatBox label="Fail" value={aggregate.fail_count} color="text-red-700" />
            <StatBox label="Avg Confidence" value={`${(aggregate.avg_confidence * 100).toFixed(1)}%`}
              color={aggregate.avg_confidence >= 0.95 ? 'text-green-700' : 'text-gray-900'} />
            <StatBox label="Avg Rot Level" value={`${aggregate.avg_rot_level.toFixed(1)}%`}
              color={aggregate.avg_rot_level <= 5 ? 'text-green-700' : aggregate.avg_rot_level > 40 ? 'text-red-700' : 'text-amber-700'} />
            <StatBox label="Avg Anomaly" value={aggregate.avg_anomaly_score.toFixed(3)} />
          </div>
        )}

        {aggregate && Object.keys(aggregate.defect_distribution ?? {}).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-xs">Distribusi Defek</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1.5 pt-0">
              {Object.entries(aggregate.defect_distribution).map(([defect, count]) => (
                <div key={defect} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">{defect.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-semibold text-gray-900">{count}x</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!autoApproved && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            Lot <span className="font-mono font-semibold">{activeLotCode}</span> sudah dikirim ke antrian review Manager.
            Anda akan mendapat notifikasi setelah keputusan dibuat.
          </div>
        )}

        <Button onClick={startNew} className="w-full mt-1">
          Mulai Inspeksi Baru
        </Button>
      </div>
    );
  }

  // ─── LIVE MONITORING STATE ──────────────────────────────────
  if (sessionActive) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-brand-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Inspeksi Berlangsung</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{activeLotCode}</p>
          </div>
          <Badge variant="success" className="animate-pulse">● Live</Badge>
        </div>

        {aggregate && (
          <div className={`rounded-xl border-2 px-4 py-3 flex items-center justify-between ${GRADE_BG[aggregate.estimated_grade] ?? 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Estimasi Grade Saat Ini</p>
              <p className={`text-4xl font-black mt-0.5 ${GRADE_COLORS[aggregate.estimated_grade] ?? 'text-gray-900'}`}>
                {aggregate.estimated_grade}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Terpindai</p>
              <p className="text-2xl font-bold text-gray-800">{aggregate.total_objects_scanned}</p>
            </div>
          </div>
        )}

        {aggregate && (
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Pass" value={aggregate.pass_count} color="text-green-700" />
            <StatBox label="Fail" value={aggregate.fail_count} color="text-red-700" />
            <StatBox label="Avg Confidence" value={`${(aggregate.avg_confidence * 100).toFixed(1)}%`} />
            <StatBox label="Avg Rot Level" value={`${aggregate.avg_rot_level.toFixed(1)}%`} />
            <StatBox label="Avg Anomaly" value={aggregate.avg_anomaly_score.toFixed(3)} />
            <StatBox
              label="Status"
              value={
                aggregate.avg_confidence >= 0.8 && aggregate.avg_rot_level < 20 ? 'Baik'
                : aggregate.avg_confidence >= 0.6 ? 'Perlu Perhatian'
                : 'Kritis'
              }
              color={
                aggregate.avg_confidence >= 0.8 && aggregate.avg_rot_level < 20 ? 'text-green-700'
                : aggregate.avg_confidence >= 0.6 ? 'text-amber-700'
                : 'text-red-700'
              }
            />
          </div>
        )}

        {aggregate && Object.keys(aggregate.defect_distribution ?? {}).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-xs">Log Defek Terdeteksi</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1.5 pt-0">
              {Object.entries(aggregate.defect_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([defect, count]) => (
                  <div key={defect} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 capitalize">{defect.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min((count / (aggregate.total_objects_scanned || 1)) * 100 * 3, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-900 w-6 text-right">{count}x</span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {errors._global && <p className="text-xs text-red-600">{errors._global}</p>}

        <div className="mt-auto pt-2 border-t border-brand-100">
          <p className="text-xs text-gray-400 mb-2">
            Klik tombol di bawah setelah semua bahan selesai diinspeksi.
            Lot akan dikirim ke Manager untuk review.
          </p>
          <Button onClick={endInspection} loading={endLoading} className="w-full" variant="default">
            Selesai Inspeksi → Kirim ke Manager
          </Button>
        </div>
      </div>
    );
  }

  // ─── FORM STATE (default) ───────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-brand-100">
        <h2 className="text-base font-semibold text-gray-800">Inisialisasi Lot</h2>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Form Lot Baru</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Select
              label="Jenis Bahan/Produk"
              options={PRODUCT_TYPES}
              value={form.product_type}
              onChange={(e) => setField('product_type', e.target.value)}
              placeholder="Pilih jenis..."
              error={errors.product_type}
              required
            />
            <Input
              label="Nama/Kode Batch"
              value={form.batch_name}
              onChange={(e) => setField('batch_name', e.target.value)}
              placeholder="Contoh: BATCH-2026-001"
              error={errors.batch_name}
              required
            />
            <Input
              label="Estimasi Jumlah Unit"
              type="number"
              min={1}
              value={form.estimated_units}
              onChange={(e) => setField('estimated_units', e.target.value)}
              placeholder="500"
              error={errors.estimated_units}
              required
            />
            <Input
              label="Tanggal Produksi"
              type="date"
              value={form.production_date}
              onChange={(e) => setField('production_date', e.target.value)}
              error={errors.production_date}
              required
            />
            <Select
              label="Shift"
              options={SHIFT_OPTIONS}
              value={form.shift}
              onChange={(e) => setField('shift', e.target.value)}
              required
            />
            <Input label="Nama Operator" value={operatorName} readOnly className="bg-gray-50 cursor-not-allowed" />
            {errors._global && <p className="text-xs text-red-600">{errors._global}</p>}
            <Button type="submit" loading={loading} className="w-full mt-1">
              Mulai Sesi Inspeksi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value, color = 'text-gray-900' }: { label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-lg font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

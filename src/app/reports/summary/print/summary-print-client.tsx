'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lot = any;

interface Props {
  lots: Lot[];
  from: string;
  to: string;
  period: string;
  viewer: { name: string; role: string };
}

const GRADE_COLOR: Record<string, string> = {
  A: '#166534', B: '#065f46', C: '#92400e', Reject: '#991b1b',
};
const GRADE_BG: Record<string, string> = {
  A: '#dcfce7', B: '#d1fae5', C: '#fef3c7', Reject: '#fee2e2',
};
const STATUS_COLOR: Record<string, string> = {
  APPROVED: '#166534', REJECTED: '#991b1b', QUARANTINED: '#92400e',
  ESCALATED: '#1e40af', MANAGER_REVIEW: '#374151',
};

function fmtDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function periodLabel(period: string, from: string, to: string) {
  if (period === 'today')  return `Harian — ${fmtDate(from)}`;
  if (period === 'week')   return `Mingguan — ${fmtDate(from)} s/d ${fmtDate(to)}`;
  if (period === 'month')  return `Bulanan — ${fmtDate(from)} s/d ${fmtDate(to)}`;
  return `${fmtDate(from)} s/d ${fmtDate(to)}`;
}

export function SummaryPrintClient({ lots, from, to, period, viewer }: Props) {
  const inspected = lots.filter((l: Lot) => l.inspection_reports?.length > 0);
  const total = lots.length;
  const totalInspected = inspected.length;

  // Status counts
  const statusCount: Record<string, number> = {};
  lots.forEach((l: Lot) => { statusCount[l.status] = (statusCount[l.status] ?? 0) + 1; });

  // Grade counts
  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, Reject: 0 };
  inspected.forEach((l: Lot) => {
    const g = l.inspection_reports[0]?.final_grade;
    if (g && g in gradeCount) gradeCount[g]++;
  });

  // Pass rate overall
  let totalPass = 0, totalScan = 0;
  inspected.forEach((l: Lot) => {
    const r = l.inspection_reports[0];
    if (r) { totalPass += r.pass_count ?? 0; totalScan += r.total_objects_scanned ?? 0; }
  });
  const overallPassRate = totalScan > 0 ? ((totalPass / totalScan) * 100).toFixed(1) : 'N/A';

  // Per-product breakdown
  const productMap: Record<string, { lots: number; rotSum: number; passSum: number; scanSum: number; grades: Record<string, number> }> = {};
  inspected.forEach((l: Lot) => {
    const r = l.inspection_reports[0];
    if (!r) return;
    if (!productMap[l.product_type]) {
      productMap[l.product_type] = { lots: 0, rotSum: 0, passSum: 0, scanSum: 0, grades: { A: 0, B: 0, C: 0, Reject: 0 } };
    }
    const p = productMap[l.product_type];
    p.lots++;
    p.rotSum += r.avg_rot_level ?? 0;
    p.passSum += r.pass_count ?? 0;
    p.scanSum += r.total_objects_scanned ?? 0;
    if (r.final_grade in p.grades) p.grades[r.final_grade]++;
  });

  const products = Object.entries(productMap).map(([name, d]) => ({
    name,
    lots: d.lots,
    avgRot: d.lots > 0 ? (d.rotSum / d.lots).toFixed(1) : 'N/A',
    passRate: d.scanSum > 0 ? ((d.passSum / d.scanSum) * 100).toFixed(1) : 'N/A',
    grades: d.grades,
    score: d.scanSum > 0 ? Math.round((d.passSum / d.scanSum) * 100) : 0,
  })).sort((a, b) => b.score - a.score);

  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; }
        .page { background: white; max-width: 800px; margin: 0 auto; padding: 32px; }
      `}</style>

      {/* Toolbar — screen only */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
        >
          ← Kembali
        </button>
        <div className="flex-1">
          <span className="text-xs text-gray-500">Laporan Ringkasan — {periodLabel(period, from, to)}</span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
        >
          🖨 Cetak / Unduh PDF
        </button>
      </div>

      <div style={{ paddingTop: 60 }} className="no-print" />

      <div className="page">
        {/* Header */}
        <div style={{ borderBottom: '2px solid #2d5c33', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2d5c33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>A</span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>AromVision QC Platform</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>SIMA Arôme · Pandaan, Jawa Timur</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Dicetak: {printedAt}</div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Oleh: {viewer.name} ({viewer.role})</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 8, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>ISO 9001</span>
                <span style={{ fontSize: 8, background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>FSSC 22000</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>Laporan Ringkasan Kualitas</div>
            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{periodLabel(period, from, to)}</div>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total Lot Masuk', value: total, color: '#374151' },
            { label: 'Sudah Diinspeksi', value: totalInspected, color: '#2d5c33' },
            { label: 'Disetujui', value: statusCount['APPROVED'] ?? 0, color: '#166534' },
            { label: 'Ditolak', value: statusCount['REJECTED'] ?? 0, color: '#991b1b' },
            { label: 'Pass Rate', value: `${overallPassRate}%`, color: overallPassRate !== 'N/A' && parseFloat(overallPassRate) >= 70 ? '#166534' : '#991b1b' },
          ].map((s) => (
            <div key={s.label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grade distribution */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Distribusi Grade
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(['A', 'B', 'C', 'Reject'] as const).map((g) => {
              const count = gradeCount[g] ?? 0;
              const pct = totalInspected > 0 ? ((count / totalInspected) * 100).toFixed(1) : '0';
              return (
                <div key={g} style={{ background: GRADE_BG[g], border: `1px solid ${GRADE_COLOR[g]}30`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GRADE_COLOR[g] }}>Grade {g}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: GRADE_COLOR[g], marginTop: 2 }}>{count}</div>
                  <div style={{ fontSize: 9, color: GRADE_COLOR[g], opacity: 0.8 }}>{pct}% dari inspeksi</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product breakdown table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Breakdown per Produk
          </div>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 12 }}>Belum ada data inspeksi pada periode ini</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Produk', 'Lot', 'Avg Rot', 'Pass Rate', 'Grade A', 'Grade B', 'Grade C', 'Reject'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Produk' ? 'left' : 'center', fontWeight: 700, color: '#374151', fontSize: 10, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.name} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1f2937', textTransform: 'capitalize' }}>{p.name}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: '#374151' }}>{p.lots}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: parseFloat(p.avgRot) > 30 ? '#991b1b' : '#374151', fontWeight: parseFloat(p.avgRot) > 30 ? 700 : 400 }}>{p.avgRot}%</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: parseFloat(p.passRate) >= 70 ? '#166534' : '#991b1b', fontWeight: 700 }}>{p.passRate}%</td>
                    {(['A', 'B', 'C', 'Reject'] as const).map((g) => (
                      <td key={g} style={{ padding: '7px 8px', textAlign: 'center' }}>
                        {p.grades[g] > 0 ? (
                          <span style={{ background: GRADE_BG[g], color: GRADE_COLOR[g], padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                            {p.grades[g]}
                          </span>
                        ) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Status breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Status Keputusan
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(statusCount).map(([status, count]) => (
              <div key={status} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 8, border: `1px solid ${STATUS_COLOR[status] ?? '#9ca3af'}40`,
                background: `${STATUS_COLOR[status] ?? '#9ca3af'}10`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[status] ?? '#9ca3af', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[status] ?? '#374151' }}>{status}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: '#9ca3af' }}>
            Dokumen ini dibuat secara otomatis oleh AromVision QC Platform · Tidak memerlukan tanda tangan fisik
          </div>
          <div style={{ fontSize: 9, color: '#9ca3af' }}>
            Ref: SIMA-QC-{period.toUpperCase()}-{new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}

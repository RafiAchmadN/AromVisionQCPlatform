'use client';

interface Lot {
  id: string;
  lot_code: string;
  batch_name: string;
  product_type: string;
  estimated_units: number;
  production_date: string;
  shift: string;
  status: string;
  created_at: string;
  status_changed_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operator: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspection_reports: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decisions: any[];
}

interface Viewer {
  name: string;
  email: string;
  role: string;
}

const STATUS_COLOR: Record<string, string> = {
  APPROVED: '#166534',
  REJECTED: '#991b1b',
  QUARANTINED: '#92400e',
  ESCALATED: '#1e40af',
  MANAGER_REVIEW: '#374151',
  INSPECTION_RUNNING: '#374151',
};

const STATUS_BG: Record<string, string> = {
  APPROVED: '#dcfce7',
  REJECTED: '#fee2e2',
  QUARANTINED: '#fef3c7',
  ESCALATED: '#dbeafe',
  MANAGER_REVIEW: '#f3f4f6',
  INSPECTION_RUNNING: '#f3f4f6',
};

const GRADE_COLOR: Record<string, string> = {
  A: '#166534', B: '#065f46', C: '#92400e', Reject: '#991b1b',
};

function fmt(v: number | undefined | null, decimals = 1) {
  return v != null ? v.toFixed(decimals) : '—';
}

export function PrintReportClient({ lot, viewer }: { lot: Lot; viewer: Viewer }) {
  const report = lot.inspection_reports?.[0];
  const decision = lot.decisions?.[0];
  const printDate = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const createdDate = new Date(lot.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const decisionDate = decision?.decided_at
    ? new Date(decision.decided_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
    : '—';

  const passRate = report?.total_objects_scanned > 0
    ? ((report.pass_count / report.total_objects_scanned) * 100).toFixed(1)
    : '—';

  return (
    <>
      {/* Screen toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Download PDF
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Kembali
        </button>
        <span className="text-xs text-gray-400 ml-2">
          Tip: Di dialog print, pilih &quot;Save as PDF&quot; dan ukuran kertas A4
        </span>
      </div>

      {/* A4 Report */}
      <div className="print:pt-0 pt-16 bg-gray-100 min-h-screen print:bg-white">
        <div
          className="bg-white mx-auto shadow-lg print:shadow-none"
          style={{ width: '210mm', minHeight: '297mm', padding: '16mm' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-brand-600">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm">A</span>
                </div>
                <span className="text-lg font-extrabold text-brand-800">AromVision QC Platform</span>
              </div>
              <p className="text-xs text-gray-500">Quality Control Inspection Report</p>
              <p className="text-xs text-gray-400">For: SIMA Arôme — Pandaan, East Java, Indonesia</p>
            </div>
            <div className="text-right">
              <div
                className="inline-block px-3 py-1.5 rounded-lg text-sm font-bold mb-1"
                style={{ background: STATUS_BG[lot.status] ?? '#f3f4f6', color: STATUS_COLOR[lot.status] ?? '#374151' }}
              >
                {lot.status.replace('_', ' ')}
              </div>
              <p className="text-[10px] text-gray-400">Printed: {printDate}</p>
              <p className="text-[10px] text-gray-400">By: {viewer.name} ({viewer.role})</p>
            </div>
          </div>

          {/* Certifications row */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {['ISO 9001:2015', 'FSSC 22000', 'Halal', 'Kosher', 'FDA'].map((cert) => (
              <span key={cert} className="text-[9px] font-bold px-2 py-0.5 rounded border border-gray-300 text-gray-500">
                {cert}
              </span>
            ))}
            <span className="text-[9px] text-gray-400 ml-auto self-center">
              Traceable under QMS ISO 9001:2015 · AromVision v3.0
            </span>
          </div>

          {/* Lot Info grid */}
          <section className="mb-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lot Information</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Lot Code',        value: lot.lot_code },
                { label: 'Batch Name',       value: lot.batch_name },
                { label: 'Product Type',     value: lot.product_type },
                { label: 'Estimated Units',  value: lot.estimated_units.toLocaleString() },
                { label: 'Production Date',  value: lot.production_date },
                { label: 'Shift',            value: lot.shift },
                { label: 'Operator',         value: lot.operator?.name ?? '—' },
                { label: 'Created',          value: createdDate },
                { label: 'Lot ID',           value: lot.id.slice(0, 8) + '...' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded border border-gray-100 px-3 py-2 bg-gray-50">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 break-words">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Inspection Results */}
          {report ? (
            <section className="mb-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Inspection Results</h2>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Final Grade', value: report.final_grade, color: GRADE_COLOR[report.final_grade] ?? '#374151', big: true },
                  { label: 'Pass Rate', value: `${passRate}%`, color: '#166534', big: true },
                  { label: 'Avg Rot Level', value: `${fmt(report.avg_rot_level)}%`, color: report.avg_rot_level > 40 ? '#991b1b' : '#374151', big: true },
                  { label: 'Anomaly Score', value: fmt(report.final_anomaly_score, 3), color: '#374151', big: true },
                ].map(({ label, value, color, big }) => (
                  <div key={label} className="rounded border border-gray-200 px-3 py-2.5 text-center bg-white">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`font-extrabold mt-0.5 ${big ? 'text-2xl' : 'text-sm'}`} style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {['Metric', 'Value', 'Metric', 'Value'].map((h, i) => (
                      <th key={i} className="text-left px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Total Scanned', report.total_objects_scanned, 'Pass Count', report.pass_count],
                    ['Fail Count', report.fail_count, 'Total Defects', report.total_defects],
                    ['Avg Confidence', `${(report.avg_confidence * 100).toFixed(1)}%`, 'Dominant Color', report.dominant_color_category],
                    ['Inspection Duration', report.inspection_duration ? `${Math.round(report.inspection_duration / 60)} min` : '—', 'Defect Distribution', Object.entries(report.defect_distribution ?? {}).map(([k,v]) => `${k.replace('_',' ')}:${v}`).join(', ') || '—'],
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-500 font-medium">{row[0]}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-800 font-semibold">{String(row[1] ?? '—')}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-500 font-medium">{row[2]}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-800 font-semibold">{String(row[3] ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <section className="mb-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Inspection Results</h2>
              <p className="text-xs text-gray-400 italic">No inspection report available for this lot.</p>
            </section>
          )}

          {/* Decision */}
          <section className="mb-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">QC Decision</h2>
            {decision ? (
              <div
                className="rounded-lg border p-4"
                style={{ background: STATUS_BG[decision.decision] ?? '#f9fafb', borderColor: STATUS_COLOR[decision.decision] ?? '#d1d5db' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-extrabold" style={{ color: STATUS_COLOR[decision.decision] ?? '#374151' }}>
                      {decision.decision}
                    </p>
                    {decision.override_reason && (
                      <p className="text-xs text-gray-600 mt-1"><b>Reason:</b> {decision.override_reason}</p>
                    )}
                    {decision.escalation_reason && (
                      <p className="text-xs text-gray-600 mt-1"><b>Escalation:</b> {decision.escalation_reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Decided by: <b>{decision.decider?.name ?? 'System'}</b></p>
                    <p className="text-xs text-gray-400">{decisionDate}</p>
                    {decision.is_system_decision && (
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Auto-decision</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-400 italic">No decision recorded yet — lot status: {lot.status.replace('_', ' ')}</p>
              </div>
            )}
          </section>

          {/* Signature block */}
          <section className="mt-8 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-6">
              {['QC Inspector', 'QC Manager', 'Quality Director'].map((role) => (
                <div key={role} className="flex flex-col gap-1">
                  <div className="h-10 border-b border-gray-400" />
                  <p className="text-[10px] text-gray-500 text-center">{role}</p>
                  <p className="text-[9px] text-gray-400 text-center">Name / Date</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[9px] text-gray-400">
              Generated by AromVision QC Platform · {lot.lot_code} · {printDate}
            </p>
            <p className="text-[9px] text-gray-400">CONFIDENTIAL — For internal QC use only</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}

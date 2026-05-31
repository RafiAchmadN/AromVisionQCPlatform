import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { makeApiError } from '@/lib/utils';

export async function GET() {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');
  if (user.role === 'Operator') return makeApiError(403, 'FORBIDDEN', 'Access denied');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const from = today.toISOString();
  const to   = new Date(today.getTime() + 86400000).toISOString();

  const [{ data: lots }, { data: reports }] = await Promise.all([
    supabaseAdmin.from('lots').select('id, status, product_type, shift').gte('created_at', from).lt('created_at', to),
    supabaseAdmin.from('inspection_reports')
      .select('final_grade, avg_confidence, avg_rot_level, final_anomaly_score, total_objects_scanned, pass_count, fail_count, total_defects, inspection_duration, defect_distribution')
      .gte('created_at', from).lt('created_at', to),
  ]);

  const breakdown: Record<string, number> = {};
  const shiftBreakdown: Record<string, number> = {};
  const gradeDistribution: Record<string, number> = {};
  const defectAgg: Record<string, number> = {};

  for (const lot of lots ?? []) {
    breakdown[lot.product_type]  = (breakdown[lot.product_type]  ?? 0) + 1;
    shiftBreakdown[lot.shift]    = (shiftBreakdown[lot.shift]    ?? 0) + 1;
  }
  for (const r of reports ?? []) {
    gradeDistribution[r.final_grade] = (gradeDistribution[r.final_grade] ?? 0) + 1;
    for (const [k, v] of Object.entries((r.defect_distribution as Record<string, number>) ?? {})) {
      defectAgg[k] = (defectAgg[k] ?? 0) + (v as number);
    }
  }

  const n = reports?.length ?? 0;
  const avg = (key: string) => n ? (reports!.reduce((s, r) => s + ((r as Record<string, number>)[key] ?? 0), 0) / n) : 0;

  return Response.json({
    period: 'daily', date: from,
    total_lots: lots?.length ?? 0,
    approved:   lots?.filter((l) => l.status === 'APPROVED').length   ?? 0,
    rejected:   lots?.filter((l) => l.status === 'REJECTED').length   ?? 0,
    quarantined: lots?.filter((l) => l.status === 'QUARANTINED').length ?? 0,
    total_objects_scanned: reports?.reduce((s, r) => s + (r.total_objects_scanned ?? 0), 0) ?? 0,
    pass_count:  reports?.reduce((s, r) => s + (r.pass_count ?? 0), 0) ?? 0,
    fail_count:  reports?.reduce((s, r) => s + (r.fail_count ?? 0), 0) ?? 0,
    total_defects: reports?.reduce((s, r) => s + (r.total_defects ?? 0), 0) ?? 0,
    rejection_rate: lots?.length ? ((lots.filter((l) => l.status === 'REJECTED').length / lots.length) * 100).toFixed(1) : '0',
    avg_confidence:    avg('avg_confidence').toFixed(4),
    avg_rot_level:     avg('avg_rot_level').toFixed(2),
    avg_anomaly_score: avg('final_anomaly_score').toFixed(4),
    avg_duration_min:  n ? Math.round(reports!.reduce((s, r) => s + (r.inspection_duration ?? 0), 0) / n / 60) : 0,
    breakdown_by_product: breakdown,
    grade_distribution:   gradeDistribution,
    shift_breakdown:      shiftBreakdown,
    top_defects: Object.entries(defectAgg).sort((a, b) => b[1] - a[1]).slice(0, 5),
  });
}

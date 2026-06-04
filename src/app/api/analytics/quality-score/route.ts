import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { makeApiError } from '@/lib/utils';

export interface ProductQualityScore {
  product_type: string;
  total_lots: number;
  approved: number;
  rejected: number;
  quarantined: number;
  avg_rot_level: number;
  avg_confidence: number;
  pass_rate: number;
  rejection_rate: number;
  score: number;         // 0–100 composite quality score
  trend: 'up' | 'down' | 'stable';
  grade_dist: { A: number; B: number; C: number; Reject: number };
}

export async function GET() {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');
  if (user.role === 'Operator') return makeApiError(403, 'FORBIDDEN', 'Access denied');

  // All completed lots (terminal states) for scoring
  const { data: lotsRaw } = await supabaseAdmin
    .from('lots')
    .select(`
      id, product_type, status, created_at,
      inspection_reports(
        avg_rot_level, avg_confidence, final_grade,
        pass_count, fail_count, total_objects_scanned
      )
    `)
    .in('status', ['APPROVED', 'REJECTED', 'QUARANTINED'])
    .order('created_at', { ascending: true });

  if (!lotsRaw || lotsRaw.length === 0) {
    return Response.json({ scores: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lots = lotsRaw as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Lot = any;
  const byProduct = new Map<string, Lot[]>();
  for (const lot of lots) {
    const key = lot.product_type ?? 'Unknown';
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push(lot);
  }

  const scores: ProductQualityScore[] = [];

  for (const [product_type, productLots] of byProduct.entries()) {
    const total = productLots.length;
    const approved = productLots.filter((l) => l.status === 'APPROVED').length;
    const rejected = productLots.filter((l) => l.status === 'REJECTED').length;
    const quarantined = productLots.filter((l) => l.status === 'QUARANTINED').length;

    type Report = { avg_rot_level?: number; avg_confidence?: number; final_grade?: string; pass_count?: number; fail_count?: number; total_objects_scanned?: number };
    const reports: Report[] = productLots
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((l) => (l.inspection_reports as any) ?? [])
      .filter(Boolean);

    const n = reports.length;
    const avgRot = n ? reports.reduce((s, r) => s + (r.avg_rot_level ?? 0), 0) / n : 0;
    const avgConf = n ? reports.reduce((s, r) => s + (r.avg_confidence ?? 0), 0) / n : 0;
    const totalScanned = reports.reduce((s, r) => s + (r.total_objects_scanned ?? 0), 0);
    const passCount = reports.reduce((s, r) => s + (r.pass_count ?? 0), 0);
    const passRate = totalScanned > 0 ? (passCount / totalScanned) * 100 : 0;
    const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;

    const gradeDist = { A: 0, B: 0, C: 0, Reject: 0 };
    for (const r of reports) {
      if (r.final_grade && r.final_grade in gradeDist) {
        gradeDist[r.final_grade as keyof typeof gradeDist]++;
      }
    }

    // Composite score: pass_rate (35%) + low_rot (35%) + low_rejection (20%) + high_conf (10%)
    const rotScore = Math.max(0, 100 - avgRot * 1.5);
    const score = Math.round(
      passRate * 0.35 +
      rotScore * 0.35 +
      Math.max(0, 100 - rejectionRate * 2) * 0.20 +
      avgConf * 100 * 0.10
    );

    // Trend: compare first half vs second half avg_rot_level
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (productLots.length >= 4) {
      const half = Math.floor(productLots.length / 2);
      const early = productLots.slice(0, half);
      const recent = productLots.slice(-half);
      const earlyReports: Report[] = early.flatMap((l) => (l.inspection_reports as Report[] | null) ?? []);
      const recentReports: Report[] = recent.flatMap((l) => (l.inspection_reports as Report[] | null) ?? []);
      const earlyRot = earlyReports.length
        ? earlyReports.reduce((s, r) => s + (r.avg_rot_level ?? 0), 0) / earlyReports.length
        : 0;
      const recentRot = recentReports.length
        ? recentReports.reduce((s, r) => s + (r.avg_rot_level ?? 0), 0) / recentReports.length
        : 0;
      const diff = recentRot - earlyRot;
      if (diff < -5) trend = 'up';       // quality improving (rot decreasing)
      else if (diff > 5) trend = 'down'; // quality degrading
    }

    scores.push({
      product_type,
      total_lots: total,
      approved,
      rejected,
      quarantined,
      avg_rot_level: parseFloat(avgRot.toFixed(2)),
      avg_confidence: parseFloat(avgConf.toFixed(4)),
      pass_rate: parseFloat(passRate.toFixed(1)),
      rejection_rate: parseFloat(rejectionRate.toFixed(1)),
      score: Math.min(100, Math.max(0, score)),
      trend,
      grade_dist: gradeDist,
    });
  }

  scores.sort((a, b) => b.score - a.score);
  return Response.json({ scores });
}

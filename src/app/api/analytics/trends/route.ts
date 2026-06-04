import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { makeApiError } from '@/lib/utils';

export async function GET() {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');
  if (user.role === 'Operator') return makeApiError(403, 'FORBIDDEN', 'Access denied');

  // Last 8 weeks — one data point per week
  const weeks: { label: string; from: string; to: string }[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const label = weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    weeks.push({ label, from: weekStart.toISOString(), to: weekEnd.toISOString() });
  }

  const results = await Promise.all(
    weeks.map(async ({ label, from, to }) => {
      const [{ data: lots }, { data: reports }] = await Promise.all([
        supabaseAdmin
          .from('lots')
          .select('id, status')
          .gte('created_at', from)
          .lt('created_at', to),
        supabaseAdmin
          .from('inspection_reports')
          .select('avg_rot_level, final_grade, pass_count, fail_count, total_objects_scanned')
          .gte('created_at', from)
          .lt('created_at', to),
      ]);

      const total = lots?.length ?? 0;
      const rejected = lots?.filter((l) => l.status === 'REJECTED').length ?? 0;
      const approved = lots?.filter((l) => l.status === 'APPROVED').length ?? 0;
      const n = reports?.length ?? 0;
      const avgRot = n
        ? reports!.reduce((s, r) => s + (r.avg_rot_level ?? 0), 0) / n
        : 0;
      const gradeCounts = { A: 0, B: 0, C: 0, Reject: 0 };
      for (const r of reports ?? []) {
        if (r.final_grade in gradeCounts) gradeCounts[r.final_grade as keyof typeof gradeCounts]++;
      }
      const totalScanned = reports?.reduce((s, r) => s + (r.total_objects_scanned ?? 0), 0) ?? 0;
      const passCount = reports?.reduce((s, r) => s + (r.pass_count ?? 0), 0) ?? 0;
      const passRate = totalScanned > 0 ? (passCount / totalScanned) * 100 : 0;
      const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;

      return {
        week: label,
        total_lots: total,
        approved,
        rejected,
        avg_rot_level: parseFloat(avgRot.toFixed(2)),
        rejection_rate: parseFloat(rejectionRate.toFixed(1)),
        pass_rate: parseFloat(passRate.toFixed(1)),
        grade_A: gradeCounts.A,
        grade_B: gradeCounts.B,
        grade_C: gradeCounts.C,
        grade_Reject: gradeCounts.Reject,
      };
    })
  );

  return Response.json({ weeks: results });
}

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';
import { makeApiError } from '@/lib/utils';
import type { Grade, ColorCategory } from '@/lib/types';

const EMPTY = {
  total_objects_scanned: 0, pass_count: 0, fail_count: 0,
  avg_confidence: 0, avg_rot_level: 0, avg_anomaly_score: 0,
  defect_distribution: {}, estimated_grade: 'A' as Grade,
  session_completed: false,
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ lot_id: string }> }) {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');

  const { lot_id } = await params;

  if (user.role === 'Operator') {
    const { data: lot } = await supabaseAdmin.from('lots').select('operator_id').eq('id', lot_id).single();
    if (lot?.operator_id !== user.id) return makeApiError(403, 'FORBIDDEN', 'Access denied');
  }

  // Check for RUNNING session first
  const { data: runningSession } = await supabaseAdmin
    .from('inspection_sessions')
    .select('id')
    .eq('lot_id', lot_id)
    .eq('status', 'RUNNING')
    .single();

  if (runningSession) {
    const { data: frames } = await supabaseAdmin
      .from('frame_data')
      .select('confidence_score, rot_level, anomaly_score, defect_types, defect_count')
      .eq('session_id', runningSession.id);

    if (!frames?.length) return Response.json({ ...EMPTY });

    const { data: config } = await supabaseAdmin.from('system_config').select('confidence_min').single();
    const confMin = config?.confidence_min ?? 0.7;

    const total   = frames.length;
    const avgConf    = frames.reduce((s, f) => s + f.confidence_score, 0) / total;
    const avgRot     = frames.reduce((s, f) => s + f.rot_level, 0) / total;
    const avgAnomaly = frames.reduce((s, f) => s + f.anomaly_score, 0) / total;
    const passCount  = frames.filter((f) => f.confidence_score >= confMin).length;

    const defectDist: Record<string, number> = {};
    for (const f of frames) {
      for (const d of (f.defect_types as string[] | null) ?? []) {
        defectDist[d] = (defectDist[d] ?? 0) + 1;
      }
    }

    const grade: Grade =
      avgConf >= 0.9 && avgRot < 10  ? 'A'
      : avgConf >= 0.75 && avgRot < 30 ? 'B'
      : avgConf >= 0.6  && avgRot < 60 ? 'C'
      : 'Reject';

    return Response.json({
      total_objects_scanned: total,
      pass_count: passCount,
      fail_count: total - passCount,
      avg_confidence:   parseFloat(avgConf.toFixed(4)),
      avg_rot_level:    parseFloat(avgRot.toFixed(2)),
      avg_anomaly_score: parseFloat(avgAnomaly.toFixed(4)),
      defect_distribution: defectDist,
      estimated_grade: grade,
      session_completed: false,
    });
  }

  // No RUNNING session — check for auto-completed session via inspection_reports
  const { data: report } = await supabaseAdmin
    .from('inspection_reports')
    .select('*')
    .eq('lot_id', lot_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!report) return Response.json({ ...EMPTY });

  return Response.json({
    total_objects_scanned: report.total_objects_scanned ?? 0,
    pass_count:   report.pass_count ?? 0,
    fail_count:   report.fail_count ?? 0,
    avg_confidence:    parseFloat((report.avg_confidence ?? 0).toFixed(4)),
    avg_rot_level:     parseFloat((report.avg_rot_level ?? 0).toFixed(2)),
    avg_anomaly_score: parseFloat((report.final_anomaly_score ?? 0).toFixed(4)),
    defect_distribution: report.defect_distribution ?? {},
    estimated_grade: (report.final_grade ?? 'A') as Grade,
    dominant_color_category: (report.dominant_color_category ?? 'Normal') as ColorCategory,
    session_completed: true,
  });
}

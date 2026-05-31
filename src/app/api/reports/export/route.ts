import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';
import { makeApiError } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');
  if (user.role === 'Operator') return makeApiError(403, 'FORBIDDEN', 'Access denied');

  const url    = new URL(request.url);
  const from   = url.searchParams.get('from')  ?? undefined;
  const to     = url.searchParams.get('to')    ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;

  let query = supabaseAdmin
    .from('lots')
    .select(`
      lot_code, batch_name, product_type, shift, status,
      production_date, estimated_units, created_at,
      operator:operator_id(name),
      inspection_reports(
        final_grade, avg_confidence, avg_rot_level,
        final_anomaly_score, total_objects_scanned,
        pass_count, fail_count, total_defects,
        inspection_duration, dominant_color_category
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (from)   query = query.gte('created_at', from);
  if (to)     query = query.lte('created_at', to);
  if (status) query = query.eq('status', status);

  const { data: lotsRaw } = await query;

  type Report = {
    final_grade?: string; avg_confidence?: number; avg_rot_level?: number;
    final_anomaly_score?: number; total_objects_scanned?: number;
    pass_count?: number; fail_count?: number; total_defects?: number;
    inspection_duration?: number; dominant_color_category?: string;
  };
  type ExportLot = {
    lot_code: string; batch_name: string; product_type: string; shift: string;
    status: string; production_date: string; estimated_units: number; created_at: string;
    operator: { name?: string } | null;
    inspection_reports: Report[] | null;
  };

  const lots = (lotsRaw ?? []) as unknown as ExportLot[];

  const headers = [
    'lot_code', 'batch_name', 'product_type', 'operator',
    'shift', 'status', 'production_date', 'estimated_units', 'created_at',
    'grade', 'avg_confidence_pct', 'avg_rot_level_pct', 'avg_anomaly_score',
    'total_objects_scanned', 'pass_count', 'fail_count', 'total_defects',
    'inspection_duration_min', 'dominant_color',
  ];

  function esc(v: string | number | undefined | null): string {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const rows = lots.map((lot) => {
    const r = lot.inspection_reports?.[0];
    return [
      esc(lot.lot_code),
      esc(lot.batch_name),
      esc(lot.product_type),
      esc(lot.operator?.name),
      esc(lot.shift),
      esc(lot.status),
      esc(lot.production_date),
      esc(lot.estimated_units),
      esc(new Date(lot.created_at).toLocaleString('id-ID')),
      esc(r?.final_grade),
      esc(r?.avg_confidence   != null ? (r.avg_confidence   * 100).toFixed(1) + '%' : ''),
      esc(r?.avg_rot_level    != null ? r.avg_rot_level.toFixed(1)             + '%' : ''),
      esc(r?.final_anomaly_score?.toFixed(4)),
      esc(r?.total_objects_scanned),
      esc(r?.pass_count),
      esc(r?.fail_count),
      esc(r?.total_defects),
      esc(r?.inspection_duration != null ? Math.round(r.inspection_duration / 60) : ''),
      esc(r?.dominant_color_category),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const filename = `aromvision-lots-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

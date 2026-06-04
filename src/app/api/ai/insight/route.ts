import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { makeApiError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');
  if (user.role === 'Operator') return makeApiError(403, 'FORBIDDEN', 'Access denied');

  if (!process.env.GROQ_API_KEY) {
    return makeApiError(503, 'AI_UNAVAILABLE', 'GROQ_API_KEY not configured');
  }

  const body = await request.json().catch(() => null);
  const lotId: string | undefined = body?.lot_id;
  if (!lotId) return makeApiError(400, 'VALIDATION_ERROR', 'lot_id required');

  // Fetch lot + report
  const { data: lotRaw } = await supabaseAdmin
    .from('lots')
    .select('*, operator:operator_id(name), inspection_reports(*), decisions(*)')
    .eq('id', lotId)
    .single();

  if (!lotRaw) return makeApiError(404, 'NOT_FOUND', 'Lot not found');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lot = lotRaw as any;

  // Fetch recent history for same product_type (last 5 lots, excluding current)
  const { data: historyRaw } = await supabaseAdmin
    .from('lots')
    .select('status, created_at, inspection_reports(avg_rot_level, final_grade, pass_count, fail_count, total_objects_scanned)')
    .eq('product_type', lot.product_type)
    .neq('id', lotId)
    .in('status', ['APPROVED', 'REJECTED', 'QUARANTINED'])
    .order('created_at', { ascending: false })
    .limit(5);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (historyRaw ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = (lot.inspection_reports as any[])?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decision = (lot.decisions as any[])?.[0];

  const histStats = history.map((h) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (h.inspection_reports as any[])?.[0];
    return {
      status: h.status,
      avg_rot_level: r?.avg_rot_level?.toFixed(1) ?? 'N/A',
      grade: r?.final_grade ?? 'N/A',
    };
  });

  const lang = body?.lang === 'en' ? 'English' : 'Indonesian (Bahasa Indonesia)';

  const prompt = `You are a quality control expert for SIMA Arôme, a natural aromatic ingredients manufacturer in Pandaan, East Java, Indonesia. They process fresh fruits and botanicals into essential oils and extracts. Their QC platform uses AI vision to inspect incoming raw materials.

Analyze this inspection lot and generate a concise quality insight in ${lang}:

**Lot Info:**
- Lot Code: ${lot.lot_code}
- Product: ${lot.product_type}
- Batch: ${lot.batch_name}
- Shift: ${lot.shift}
- Estimated Units: ${lot.estimated_units}
- Status: ${lot.status}

**Inspection Results:**
- Final Grade: ${report?.final_grade ?? 'N/A'}
- Avg Rot Level: ${report?.avg_rot_level?.toFixed(1) ?? 'N/A'}%
- Avg Confidence: ${report ? (report.avg_confidence * 100).toFixed(1) : 'N/A'}%
- Pass Rate: ${report?.total_objects_scanned > 0 ? ((report.pass_count / report.total_objects_scanned) * 100).toFixed(1) : 'N/A'}%
- Total Objects Scanned: ${report?.total_objects_scanned ?? 'N/A'}
- Total Defects: ${report?.total_defects ?? 'N/A'}
- Dominant Color Category: ${report?.dominant_color_category ?? 'N/A'}
- Anomaly Score: ${report?.final_anomaly_score?.toFixed(3) ?? 'N/A'}

**Manager Decision:** ${decision?.decision ?? 'Pending'} ${decision?.override_reason ? `(Reason: ${decision.override_reason})` : ''}

**Recent History for ${lot.product_type} (last ${histStats.length} lots):**
${histStats.length > 0
  ? histStats.map((h, i) => `  ${i + 1}. Status: ${h.status}, Rot: ${h.avg_rot_level}%, Grade: ${h.grade}`).join('\n')
  : '  No prior data available for this product type.'}

Write 2–4 sentences that:
1. Describe the quality finding for this specific lot
2. Compare to the historical trend if data is available
3. Give one actionable recommendation for the QC team or procurement department
Use professional manufacturing and supply chain language appropriate for ISO 9001 documentation. Be direct and specific.`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const insight = completion.choices[0]?.message?.content ?? '';

    return Response.json({
      lot_id: lotId,
      lot_code: lot.lot_code,
      product_type: lot.product_type,
      insight,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown AI error';
    return makeApiError(500, 'AI_ERROR', `AI insight generation failed: ${msg}`);
  }
}

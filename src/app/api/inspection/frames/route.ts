import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';
import { makeApiError } from '@/lib/utils';
import { runSessionCompletionCheck } from '@/lib/inspection-hooks';

const frameSchema = z.object({
  lot_id:           z.string().uuid(),
  session_id:       z.string().uuid(),
  object_class:     z.string().min(1),
  confidence_score: z.number().min(0).max(1),
  rot_level:        z.number().min(0).max(100),
  color_rgb:        z.object({ r: z.number(), g: z.number(), b: z.number() }),
  color_deviation:  z.number(),
  color_category:   z.enum(['Normal', 'Pucat', 'Terlalu Matang', 'Abnormal']),
  defect_types:     z.array(z.string()),
  defect_count:     z.number().int().min(0),
  defect_severity:  z.enum(['Minor', 'Moderate', 'Severe']),
  anomaly_score:    z.number().min(0).max(1),
  bbox_coordinates: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  frame_timestamp:  z.string().optional(),
});

export async function POST(request: NextRequest) {
  const token         = request.headers.get('x-internal-token');
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  // Valid paths: (1) matching internal service token, (2) authenticated operator session
  const hasValidInternalToken = !!expectedToken && token === expectedToken;

  let sessionOperatorId: string | null = null;
  if (!hasValidInternalToken) {
    const user = await getServerSession();
    if (user?.role === 'Operator') {
      sessionOperatorId = user.id;
    } else {
      // Internal token is configured but not matched, and no valid operator session
      return makeApiError(401, 'UNAUTHORIZED', 'Invalid token or unauthorized session');
    }
  }

  const body   = await request.json().catch(() => null);
  const parsed = frameSchema.safeParse(body);
  if (!parsed.success) return makeApiError(400, 'VALIDATION_ERROR', 'Invalid frame data');

  // If browser session auth, verify operator owns the lot
  if (sessionOperatorId) {
    const { data: lot } = await supabaseAdmin
      .from('lots')
      .select('operator_id')
      .eq('id', parsed.data.lot_id)
      .single();
    if (lot?.operator_id !== sessionOperatorId) {
      return makeApiError(403, 'FORBIDDEN', 'Access denied');
    }
  }

  const frame = {
    ...parsed.data,
    frame_timestamp: parsed.data.frame_timestamp ?? new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('frame_data').insert(frame);
  if (error) return makeApiError(500, 'INTERNAL_ERROR', error.message);

  // Async check — non-blocking
  runSessionCompletionCheck(parsed.data.session_id, parsed.data.lot_id).catch(console.error);

  return Response.json({ ok: true }, { status: 201 });
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';
import { makeApiError, getClientIp } from '@/lib/utils';
import { writeAuditLog } from '@/lib/audit';
import { isValidTransition } from '@/lib/state-machine';
import { dispatchNotification } from '@/lib/notifications';
import type { LotStatus } from '@/lib/types';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('lots')
    .select('*, operator:operator_id(id,name,email)')
    .eq('id', id)
    .single();

  if (error || !data) return makeApiError(404, 'NOT_FOUND', 'Lot not found');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lot = data as any;

  if (user.role === 'Operator' && lot.operator_id !== user.id) {
    return makeApiError(403, 'FORBIDDEN', 'Access denied');
  }

  return Response.json(data);
}

const patchSchema = z.object({
  status: z.enum(['INSPECTION_RUNNING', 'MANAGER_REVIEW', 'APPROVED', 'REJECTED', 'QUARANTINED', 'ESCALATED']).optional(),
  batch_name: z.string().min(1).max(200).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return makeApiError(401, 'UNAUTHORIZED', 'Unauthenticated');

  const { id } = await params;
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('lots')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) return makeApiError(404, 'NOT_FOUND', 'Lot not found');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentLot = current as any;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return makeApiError(400, 'VALIDATION_ERROR', 'Invalid input');

  // Operator can only submit their own INSPECTION_RUNNING lot → MANAGER_REVIEW
  if (user.role === 'Operator') {
    if (currentLot.operator_id !== user.id) {
      return makeApiError(403, 'FORBIDDEN', 'Access denied');
    }
    if (currentLot.status !== 'INSPECTION_RUNNING') {
      return makeApiError(403, 'FORBIDDEN', 'Hanya bisa mengakhiri inspeksi yang sedang berjalan');
    }
    if (parsed.data.status !== 'MANAGER_REVIEW') {
      return makeApiError(403, 'FORBIDDEN', 'Operator hanya bisa mengirim lot untuk review manager');
    }
  }

  if (parsed.data.status) {
    if (!isValidTransition(currentLot.status as LotStatus, parsed.data.status as LotStatus)) {
      return makeApiError(409, 'CONFLICT', `Invalid status transition: ${currentLot.status} → ${parsed.data.status}`);
    }
  }

  const updates = {
    ...parsed.data,
    ...(parsed.data.status ? { status_changed_at: new Date().toISOString() } : {}),
  };

  const { data: updated, error } = await supabaseAdmin
    .from('lots')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) return makeApiError(500, 'INTERNAL_ERROR', error.message);

  await writeAuditLog({
    actor_id: user.id,
    action_type: 'LOT_UPDATED',
    target_type: 'lots',
    target_id: id,
    value_before: { status: currentLot.status },
    value_after: updates,
    ip_address: getClientIp(request),
  });

  // Notify all active managers when lot enters review queue
  if (parsed.data.status === 'MANAGER_REVIEW') {
    const { data: managers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'Manager')
      .eq('status', 'ACTIVE');

    for (const manager of managers ?? []) {
      await dispatchNotification({
        user_id: manager.id,
        type: 'LOT_READY_FOR_REVIEW',
        title: 'Lot Siap Direview',
        message: `Lot "${currentLot.batch_name}" (${currentLot.product_type}) menunggu keputusan QC Anda.`,
        reference_type: 'lots',
        reference_id: id,
      });
    }
  }

  return Response.json(updated);
}

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PrintReportClient } from './print-client';

export default async function PrintReportPage({ params }: { params: Promise<{ lotId: string }> }) {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role === 'Operator') redirect('/operator');

  const { lotId } = await params;

  const { data: lot } = await supabaseAdmin
    .from('lots')
    .select(`
      *,
      operator:operator_id(name, email),
      inspection_reports(*),
      decisions(*, decider:decided_by(name, email))
    `)
    .eq('id', lotId)
    .single();

  if (!lot) redirect('/manager/reports');

  return <PrintReportClient lot={lot} viewer={user} />;
}

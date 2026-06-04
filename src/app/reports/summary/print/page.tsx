import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { SummaryPrintClient } from './summary-print-client';

export default async function SummaryPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; period?: string }>;
}) {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role === 'Operator') redirect('/operator/dashboard');

  const { from, to, period } = await searchParams;

  const { data: lotsRaw } = await supabaseAdmin
    .from('lots')
    .select(`
      lot_code, product_type, status, created_at,
      inspection_reports(
        final_grade, avg_rot_level, avg_confidence,
        pass_count, fail_count, total_objects_scanned, total_defects
      ),
      decisions(decision, is_system_decision)
    `)
    .gte('created_at', from ?? '')
    .lte('created_at', to ?? '')
    .order('created_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lots = (lotsRaw ?? []) as any[];

  return (
    <SummaryPrintClient
      lots={lots}
      from={from ?? ''}
      to={to ?? ''}
      period={period ?? 'custom'}
      viewer={{ name: user.name, role: user.role }}
    />
  );
}

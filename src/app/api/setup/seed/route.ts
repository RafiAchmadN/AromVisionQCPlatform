import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { makeApiError } from '@/lib/utils';

const DEMO_USERS = [
  { name: 'Admin Demo', email: 'admin@aromai.demo', password: 'AromAI2026!', role: 'Admin' as const },
  { name: 'Manager Demo', email: 'manager@aromai.demo', password: 'AromAI2026!', role: 'Manager' as const },
  { name: 'Operator Demo', email: 'operator@aromai.demo', password: 'AromAI2026!', role: 'Operator' as const },
];

export async function POST(request: NextRequest) {
  // Protect: only allow when a seed token matches env, or in dev
  const body = await request.json().catch(() => ({}));
  const token = body?.token ?? '';
  const expected = process.env.SEED_SECRET ?? 'aromai-demo-seed';
  if (token !== expected) {
    return makeApiError(403, 'FORBIDDEN', 'Invalid seed token');
  }

  const createdUsers: Record<string, string> = {}; // email -> id

  // ── Step 1: Create / fetch auth + public users ──────────────
  for (const u of DEMO_USERS) {
    // Check if already exists in public.users
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', u.email.toLowerCase())
      .maybeSingle();

    if (existing) {
      createdUsers[u.email] = existing.id;
      continue;
    }

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });

    if (authErr || !authData.user) {
      return makeApiError(500, 'INTERNAL_ERROR', `Failed to create ${u.role}: ${authErr?.message}`);
    }

    const uid = authData.user.id;

    await supabaseAdmin.from('users').insert({
      id: uid,
      name: u.name,
      email: u.email.toLowerCase(),
      role: u.role,
      status: 'ACTIVE',
      shift: u.role === 'Operator' ? 'Pagi' : undefined,
    });

    createdUsers[u.email] = uid;
  }

  const operatorId = createdUsers['operator@aromai.demo'];
  const managerId = createdUsers['manager@aromai.demo'];

  if (!operatorId || !managerId) {
    return makeApiError(500, 'INTERNAL_ERROR', 'Could not resolve demo user IDs');
  }

  // ── Step 2: Shift assignment ────────────────────────────────
  const { data: existingShift } = await supabaseAdmin
    .from('shift_assignments')
    .select('id')
    .eq('operator_id', operatorId)
    .maybeSingle();

  if (!existingShift) {
    await supabaseAdmin.from('shift_assignments').insert({
      shift_name: 'Pagi',
      operator_id: operatorId,
      manager_id: managerId,
      effective_date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  }

  // ── Step 3: Demo lots ──────────────────────────────────────

  // Check if demo data already seeded
  const { data: existingLots } = await supabaseAdmin
    .from('lots')
    .select('id')
    .eq('operator_id', operatorId)
    .limit(1);

  if (existingLots && existingLots.length > 0) {
    return Response.json({
      message: 'Demo data already seeded.',
      credentials: DEMO_USERS.map(({ name, email, password, role }) => ({ name, email, password, role })),
    });
  }

  const today = new Date().toISOString().split('T')[0];

  const lotsPayload = [
    {
      lot_code: 'LOT-DEMO-001',
      batch_name: 'Batch Jahe Merah A',
      product_type: 'Jahe Merah',
      estimated_units: 120,
      production_date: today,
      shift: 'Pagi' as const,
      operator_id: operatorId,
      status: 'INSPECTION_RUNNING' as const,
    },
    {
      lot_code: 'LOT-DEMO-002',
      batch_name: 'Batch Kunyit B',
      product_type: 'Kunyit',
      estimated_units: 80,
      production_date: today,
      shift: 'Pagi' as const,
      operator_id: operatorId,
      status: 'MANAGER_REVIEW' as const,
    },
    {
      lot_code: 'LOT-DEMO-003',
      batch_name: 'Batch Temulawak C',
      product_type: 'Temulawak',
      estimated_units: 200,
      production_date: today,
      shift: 'Siang' as const,
      operator_id: operatorId,
      status: 'APPROVED' as const,
    },
    {
      lot_code: 'LOT-DEMO-004',
      batch_name: 'Batch Lengkuas D',
      product_type: 'Lengkuas',
      estimated_units: 60,
      production_date: today,
      shift: 'Siang' as const,
      operator_id: operatorId,
      status: 'REJECTED' as const,
    },
    {
      lot_code: 'LOT-DEMO-005',
      batch_name: 'Batch Kencur E',
      product_type: 'Kencur',
      estimated_units: 150,
      production_date: today,
      shift: 'Malam' as const,
      operator_id: operatorId,
      status: 'QUARANTINED' as const,
    },
  ];

  const { data: insertedLots, error: lotsErr } = await supabaseAdmin
    .from('lots')
    .insert(lotsPayload)
    .select('id, lot_code, status');

  if (lotsErr || !insertedLots) {
    return makeApiError(500, 'INTERNAL_ERROR', `Failed to insert lots: ${lotsErr?.message}`);
  }

  // ── Step 4: Inspection sessions + reports + decisions for completed lots
  const completedLots = insertedLots.filter((l) =>
    ['MANAGER_REVIEW', 'APPROVED', 'REJECTED', 'QUARANTINED'].includes(l.status)
  );

  for (const lot of completedLots) {
    const sessionStart = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const sessionEnd = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const { data: session, error: sessErr } = await supabaseAdmin
      .from('inspection_sessions')
      .insert({
        lot_id: lot.id,
        operator_id: operatorId,
        started_at: sessionStart,
        ended_at: sessionEnd,
        status: 'COMPLETED' as const,
        end_reason: 'MANUAL' as const,
      })
      .select('id')
      .single();

    if (sessErr || !session) continue;

    const isGood = ['APPROVED'].includes(lot.status);
    const isBad = ['REJECTED'].includes(lot.status);

    const avgConf = isGood ? 0.92 : isBad ? 0.55 : 0.74;
    const avgRot = isGood ? 5.2 : isBad ? 72.4 : 38.1;
    const anomaly = isGood ? 0.12 : isBad ? 0.88 : 0.62;
    const grade = isGood ? ('A' as const) : isBad ? ('Reject' as const) : ('C' as const);
    const passCount = isGood ? 95 : isBad ? 20 : 55;
    const total = 100;

    const { data: report, error: repErr } = await supabaseAdmin
      .from('inspection_reports')
      .insert({
        lot_id: lot.id,
        session_id: session.id,
        final_grade: grade,
        avg_confidence: avgConf,
        avg_rot_level: avgRot,
        final_anomaly_score: anomaly,
        dominant_color_category: isGood ? 'Normal' : isBad ? 'Terlalu Matang' : ('Pucat' as const),
        total_defects: isGood ? 3 : isBad ? 45 : 18,
        defect_distribution: { busuk: isGood ? 1 : isBad ? 30 : 10, memar: isGood ? 2 : isBad ? 15 : 8 },
        total_objects_scanned: total,
        pass_count: passCount,
        fail_count: total - passCount,
        inspection_duration: 3600,
        snapshot_urls: [],
      })
      .select('id')
      .single();

    if (repErr || !report) continue;

    if (lot.status !== 'MANAGER_REVIEW') {
      const decision = lot.status as 'APPROVED' | 'REJECTED' | 'QUARANTINED';
      await supabaseAdmin.from('decisions').insert({
        lot_id: lot.id,
        inspection_report_id: report.id,
        decision,
        decided_by: managerId,
        is_system_decision: false,
        rules_evaluated: [
          { rule: 'avg_confidence >= confidence_min', passed: avgConf >= 0.7, expected: '>= 0.7', actual: String(avgConf) },
          { rule: 'final_anomaly_score < anomaly_quarantine_threshold', passed: anomaly < 0.8, expected: '< 0.8', actual: String(anomaly) },
        ],
        override_reason: decision === 'APPROVED' ? null : 'Auto-decision berdasarkan threshold QC',
        decided_at: sessionEnd,
      });
    }
  }

  return Response.json({
    message: 'Demo seed complete.',
    credentials: DEMO_USERS.map(({ name, email, password, role }) => ({ name, email, password, role })),
    lots_created: insertedLots.length,
  });
}

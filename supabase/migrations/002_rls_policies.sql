-- ============================================================
-- AromAI QC Platform — Row Level Security Policies
-- No helper function — all role checks use inline subqueries
-- to avoid search_path issues at function creation time.
-- supabaseAdmin (service-role key) bypasses ALL policies.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- users
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "users_select_manager"
  ON public.users FOR SELECT
  USING (
    role = 'Operator'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Manager' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "users_update_own_name"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- lots
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lots_select_operator"
  ON public.lots FOR SELECT
  USING (operator_id = auth.uid());

CREATE POLICY "lots_select_manager_admin"
  ON public.lots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "lots_insert_operator"
  ON public.lots FOR INSERT
  WITH CHECK (
    operator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Operator' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "lots_update_operator"
  ON public.lots FOR UPDATE
  USING (
    operator_id = auth.uid()
    AND status = 'INSPECTION_RUNNING'
  );

CREATE POLICY "lots_update_manager_admin"
  ON public.lots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "lots_delete_admin"
  ON public.lots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- inspection_sessions
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_operator"
  ON public.inspection_sessions FOR SELECT
  USING (operator_id = auth.uid());

CREATE POLICY "sessions_select_manager_admin"
  ON public.inspection_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "sessions_insert_operator"
  ON public.inspection_sessions FOR INSERT
  WITH CHECK (
    operator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Operator' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "sessions_update_operator"
  ON public.inspection_sessions FOR UPDATE
  USING (operator_id = auth.uid() AND status = 'RUNNING');

CREATE POLICY "sessions_update_admin"
  ON public.inspection_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- frame_data
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.frame_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frames_select_operator"
  ON public.frame_data FOR SELECT
  USING (
    lot_id IN (
      SELECT id FROM public.lots WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "frames_select_manager_admin"
  ON public.frame_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "frames_insert_operator"
  ON public.frame_data FOR INSERT
  WITH CHECK (
    lot_id IN (
      SELECT id FROM public.lots WHERE operator_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Operator' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- inspection_reports
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_operator"
  ON public.inspection_reports FOR SELECT
  USING (
    lot_id IN (
      SELECT id FROM public.lots WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "reports_select_manager_admin"
  ON public.inspection_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- decisions
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decisions_select_manager_admin"
  ON public.decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "decisions_insert_manager_admin"
  ON public.decisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "decisions_update_manager_admin"
  ON public.decisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- notifications
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- system_config
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_authenticated"
  ON public.system_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "config_update_admin"
  ON public.system_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- thresholds
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thresholds_select_authenticated"
  ON public.thresholds FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "thresholds_insert_admin"
  ON public.thresholds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "thresholds_update_admin"
  ON public.thresholds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "thresholds_delete_admin"
  ON public.thresholds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- shift_assignments
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shifts_select_own"
  ON public.shift_assignments FOR SELECT
  USING (operator_id = auth.uid() OR manager_id = auth.uid());

CREATE POLICY "shifts_select_admin"
  ON public.shift_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "shifts_insert_manager_admin"
  ON public.shift_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "shifts_update_manager_admin"
  ON public.shift_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Manager', 'Admin') AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY "shifts_delete_admin"
  ON public.shift_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- audit_logs  (immutability enforced via trigger in 001)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_admin"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'Admin' AND u.status = 'ACTIVE'
    )
  );

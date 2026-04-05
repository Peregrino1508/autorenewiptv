
-- 1. Add created_by to iptv_panels
ALTER TABLE public.iptv_panels ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Add created_by to plans  
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS created_by uuid;

-- 3. Add created_by to monthly_statements
ALTER TABLE public.monthly_statements ADD COLUMN IF NOT EXISTS created_by uuid;

-- 4. Add created_by to spreadsheet_settings
ALTER TABLE public.spreadsheet_settings ADD COLUMN IF NOT EXISTS created_by uuid;

-- 5. Set existing data to super admin's user_id
UPDATE public.iptv_panels SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;
UPDATE public.plans SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;
UPDATE public.iptv_users SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;
UPDATE public.payments SET admin_id = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE admin_id IS NULL;
UPDATE public.customer_records SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;
UPDATE public.monthly_statements SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;
UPDATE public.spreadsheet_settings SET created_by = (SELECT user_id FROM public.admin_profiles WHERE is_super_admin = true LIMIT 1) WHERE created_by IS NULL;

-- 6. Drop old RLS policies and create new ones for iptv_panels
DROP POLICY IF EXISTS "Service role manages panels" ON public.iptv_panels;

CREATE POLICY "Admins can manage own panels" ON public.iptv_panels
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 7. Drop old RLS policies and create new ones for plans
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Admins can manage own plans" ON public.plans
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 8. Update iptv_users RLS
DROP POLICY IF EXISTS "Admins can manage iptv_users" ON public.iptv_users;

CREATE POLICY "Admins can manage own iptv_users" ON public.iptv_users
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 9. Update payments RLS - admins see only their payments
DROP POLICY IF EXISTS "Anyone can select their payment by mp_payment_id" ON public.payments;
DROP POLICY IF EXISTS "Service role can update payments" ON public.payments;

CREATE POLICY "Admins can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view payments by mp_payment_id" ON public.payments
  FOR SELECT TO anon, authenticated
  USING (mp_payment_id IS NOT NULL);

CREATE POLICY "Service role and admins can update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 10. Update customer_records RLS
DROP POLICY IF EXISTS "Admins can manage all customer records" ON public.customer_records;

CREATE POLICY "Admins can manage own customer records" ON public.customer_records
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 11. Update monthly_statements RLS
DROP POLICY IF EXISTS "Admins can manage monthly statements" ON public.monthly_statements;

CREATE POLICY "Admins can manage own monthly statements" ON public.monthly_statements
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 12. Update spreadsheet_settings RLS
DROP POLICY IF EXISTS "Admins can manage spreadsheet settings" ON public.spreadsheet_settings;

CREATE POLICY "Admins can manage own spreadsheet settings" ON public.spreadsheet_settings
  FOR ALL TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

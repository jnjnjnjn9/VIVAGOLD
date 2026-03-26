
-- Block all direct client access to pix_transactions.
-- Edge functions use the service_role key which bypasses RLS.

-- Deny SELECT for anon and authenticated roles
CREATE POLICY "Deny all select" ON public.pix_transactions
  FOR SELECT TO anon, authenticated USING (false);

-- Deny INSERT for anon and authenticated roles
CREATE POLICY "Deny all insert" ON public.pix_transactions
  FOR INSERT TO anon, authenticated WITH CHECK (false);

-- Deny UPDATE for anon and authenticated roles
CREATE POLICY "Deny all update" ON public.pix_transactions
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- Deny DELETE for anon and authenticated roles
CREATE POLICY "Deny all delete" ON public.pix_transactions
  FOR DELETE TO anon, authenticated USING (false);

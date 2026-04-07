CREATE POLICY "Anyone can read maintenance mode"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (key = 'maintenance_mode');
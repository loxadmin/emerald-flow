
-- Ensure user_roles table has RLS enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own role
-- Note: 'Users can view own roles' might already exist from previous migrations,
-- but we ensure it's there or similar to the requested one.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_roles' AND policyname = 'Allow users to read their role'
    ) THEN
        CREATE POLICY "Allow users to read their role"
        ON public.user_roles
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

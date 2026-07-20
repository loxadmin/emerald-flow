-- Admin users should not also carry the 'user' role
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'adahosabex@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'user';
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: strip 'user' role from anyone who is already an admin
DELETE FROM public.user_roles ur
WHERE ur.role = 'user'
  AND EXISTS (
    SELECT 1 FROM public.user_roles a
    WHERE a.user_id = ur.user_id AND a.role = 'admin'
  );
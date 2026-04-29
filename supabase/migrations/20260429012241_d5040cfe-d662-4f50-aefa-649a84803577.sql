-- Create a private schema not exposed by PostgREST
CREATE SCHEMA IF NOT EXISTS app_private;

-- Recreate helpers in the private schema
CREATE OR REPLACE FUNCTION app_private.current_external_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
$$;

CREATE OR REPLACE FUNCTION app_private.has_role(_profile_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE profile_id = _profile_id
      AND role = _role
  )
$$;

-- Grant execute only to the roles that RLS runs as
REVOKE ALL ON FUNCTION app_private.current_external_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_external_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(UUID, public.app_role) TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

-- Rebuild policies to use the private-schema helpers
DROP POLICY IF EXISTS "profiles_update_own_clerk" ON public.profiles;
CREATE POLICY "profiles_update_own_clerk"
ON public.profiles
FOR UPDATE
USING (
  account_type = 'clerk'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id = app_private.current_external_id()
)
WITH CHECK (
  account_type = 'clerk'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id = app_private.current_external_id()
);

DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = app_private.current_external_id()
      AND app_private.has_role(p.id, 'admin')
  )
);

DROP POLICY IF EXISTS "user_roles_admin_update" ON public.user_roles;
CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = app_private.current_external_id()
      AND app_private.has_role(p.id, 'admin')
  )
);

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = app_private.current_external_id()
      AND app_private.has_role(p.id, 'admin')
  )
);

-- Drop the now-unused public copies
DROP FUNCTION IF EXISTS public.current_external_id();
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
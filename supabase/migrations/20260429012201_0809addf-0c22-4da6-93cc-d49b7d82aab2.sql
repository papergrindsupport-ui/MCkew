-- ========================================================================
-- Phase 1: profiles + user_roles + helpers
-- ========================================================================

-- Enum: account types
CREATE TYPE public.account_type AS ENUM ('clerk', 'anonymous', 'guest');

-- Enum: roles (kept separate from profile to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ----------------------------------------------------------------
-- profiles table
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type    public.account_type NOT NULL,
  public_id       TEXT NOT NULL UNIQUE,       -- anon-xxxx, guest-uuid, or clerk user id
  clerk_user_id   TEXT UNIQUE,                -- only for account_type = 'clerk'
  username        TEXT UNIQUE,
  display_name    TEXT,
  email           TEXT,
  phone           TEXT,
  image_url       TEXT,
  bio             TEXT,
  anon_password_hash TEXT,                    -- only for account_type = 'anonymous' (optional)
  secret_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_clerk_user_id ON public.profiles (clerk_user_id);
CREATE INDEX idx_profiles_username ON public.profiles (LOWER(username));
CREATE INDEX idx_profiles_account_type ON public.profiles (account_type);

-- ----------------------------------------------------------------
-- user_roles table (separate to prevent privilege escalation)
-- ----------------------------------------------------------------
CREATE TABLE public.user_roles (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, role)
);

CREATE INDEX idx_user_roles_profile_id ON public.user_roles (profile_id);

-- ----------------------------------------------------------------
-- Helper: read clerk user id (sub claim) from incoming JWT
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_external_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', ''),
    NULL
  )
$$;

-- ----------------------------------------------------------------
-- Helper: has_role — non-recursive role check
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_profile_id UUID, _role public.app_role)
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

-- ----------------------------------------------------------------
-- Helper: timestamp bumper
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================================
-- Row Level Security
-- ========================================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- profiles: public-readable (needed for /profile/{username} & leaderboard)
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
USING (true);

-- profiles: a Clerk user can update only their own row.
-- Anonymous/guest updates are routed through edge functions (service role).
CREATE POLICY "profiles_update_own_clerk"
ON public.profiles
FOR UPDATE
USING (
  account_type = 'clerk'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id = public.current_external_id()
)
WITH CHECK (
  account_type = 'clerk'
  AND clerk_user_id IS NOT NULL
  AND clerk_user_id = public.current_external_id()
);

-- profiles: insert is NOT allowed from clients — all profile creation
-- (Clerk, anonymous, guest) flows through edge functions using service role.
-- (No INSERT policy is defined, so client inserts are denied by default.)

-- user_roles: anyone can read roles (used to display badges)
CREATE POLICY "user_roles_select_all"
ON public.user_roles
FOR SELECT
USING (true);

-- user_roles: only admins can mutate roles
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = public.current_external_id()
      AND public.has_role(p.id, 'admin')
  )
);

CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = public.current_external_id()
      AND public.has_role(p.id, 'admin')
  )
);

CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.clerk_user_id = public.current_external_id()
      AND public.has_role(p.id, 'admin')
  )
);
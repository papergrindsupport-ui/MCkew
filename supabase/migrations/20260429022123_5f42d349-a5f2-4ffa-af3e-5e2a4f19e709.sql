
-- =====================================================================
-- Phase 1: Profiles + Gamification Core
-- ---------------------------------------------------------------------
-- Auth model: Clerk JWT bridge. The browser sends a Clerk-signed JWT
-- (template "supabase") whose `sub` claim is the Clerk user id (string,
-- e.g. "user_2abc..."). Standard Supabase RLS uses auth.uid() which
-- assumes a UUID — but with the Clerk JWT, auth.jwt()->>'sub' returns
-- the Clerk user id string. We key everything off that.
--
-- Guests/anons (no Clerk session) fall back to a server-issued
-- public_id; those rows are managed by server-only routes using the
-- service-role key, so RLS only needs to handle authenticated Clerk
-- users here. Server routes bypass RLS for guest writes.
-- =====================================================================

-- Helper: extract Clerk user id from JWT
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    ''
  )
$$;

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL CHECK (account_type IN ('clerk','anonymous','guest')),
  public_id TEXT NOT NULL UNIQUE,
  clerk_user_id TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  image_url TEXT,
  bio TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_clerk_user_id ON public.profiles(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX idx_profiles_public_id ON public.profiles(public_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public can see basic profile info (for /profile/$username pages, leaderboards)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Clerk users can update their own profile
CREATE POLICY "Clerk users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> '');

-- Inserts go through server routes (service role); no client insert policy needed
-- but we provide one for self-insert by Clerk users as fallback.
CREATE POLICY "Clerk users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> '');

-- =========================================================
-- updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- streaks_state — current live streak per profile
-- =========================================================
CREATE TABLE public.streaks_state (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  last_ts BIGINT NOT NULL DEFAULT 0,
  current_subjects JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read streak state"
  ON public.streaks_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can upsert streak state"
  ON public.streaks_state FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update streak state"
  ON public.streaks_state FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE TRIGGER streaks_state_touch_updated_at
  BEFORE UPDATE ON public.streaks_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- streaks_history — completed streak records
-- =========================================================
CREATE TABLE public.streaks_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  points INTEGER NOT NULL,
  pencils INTEGER NOT NULL,
  ended_at BIGINT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_streaks_history_profile_day ON public.streaks_history(profile_id, day);

ALTER TABLE public.streaks_history ENABLE ROW LEVEL SECURITY;

-- Public read for leaderboards
CREATE POLICY "Streak history publicly readable"
  ON public.streaks_history FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert streak history"
  ON public.streaks_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

-- =========================================================
-- daily_goals — current goal targets + onboarded flag
-- =========================================================
CREATE TABLE public.daily_goals (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  questions_goal INTEGER NOT NULL DEFAULT 10,
  papers_goal INTEGER NOT NULL DEFAULT 3,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  celebrated_questions JSONB NOT NULL DEFAULT '{}'::jsonb,
  celebrated_papers JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read daily goals"
  ON public.daily_goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can upsert daily goals"
  ON public.daily_goals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update daily goals"
  ON public.daily_goals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE TRIGGER daily_goals_touch_updated_at
  BEFORE UPDATE ON public.daily_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- daily_goal_history — per-day progress snapshots
-- =========================================================
CREATE TABLE public.daily_goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  questions_goal INTEGER NOT NULL,
  papers_goal INTEGER NOT NULL,
  correct_questions INTEGER NOT NULL DEFAULT 0,
  passed_papers INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, day)
);

CREATE INDEX idx_dgh_profile_day ON public.daily_goal_history(profile_id, day);

ALTER TABLE public.daily_goal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read goal history"
  ON public.daily_goal_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can upsert goal history"
  ON public.daily_goal_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update goal history"
  ON public.daily_goal_history FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE TRIGGER dgh_touch_updated_at
  BEFORE UPDATE ON public.daily_goal_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- wallet — pencil totals + idempotency
-- =========================================================
CREATE TABLE public.wallet (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total INTEGER NOT NULL DEFAULT 0,
  credited_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;

-- Public read total only via leaderboard endpoint; for direct reads, owner-only is fine
CREATE POLICY "Owner can read wallet"
  ON public.wallet FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can upsert wallet"
  ON public.wallet FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update wallet"
  ON public.wallet FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE TRIGGER wallet_touch_updated_at
  BEFORE UPDATE ON public.wallet
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- pencil_awards — append-only ledger of pencil grants
-- =========================================================
CREATE TABLE public.pencil_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ts BIGINT NOT NULL,
  amount INTEGER NOT NULL,
  reason JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pencil_awards_profile_ts ON public.pencil_awards(profile_id, ts DESC);

ALTER TABLE public.pencil_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read pencil awards"
  ON public.pencil_awards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can insert pencil awards"
  ON public.pencil_awards FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

-- =========================================================
-- desk_state — entire desk (folders/items/pinned) as one JSONB doc per profile
-- (Will be normalized in a later phase; this gives instant cloud persistence.)
-- =========================================================
CREATE TABLE public.desk_state (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"folders":[],"items":[],"pinnedPapers":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.desk_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read desk"
  ON public.desk_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can upsert desk"
  ON public.desk_state FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update desk"
  ON public.desk_state FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> ''
  ));

CREATE TRIGGER desk_touch_updated_at
  BEFORE UPDATE ON public.desk_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE TABLE public.analytics_state (
  profile_id UUID PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{"attempts":[],"papers":[],"attemptedPapers":{},"recordedQuestions":{}}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read analytics" ON public.analytics_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = analytics_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);
CREATE POLICY "Owner can upsert analytics" ON public.analytics_state FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = analytics_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);
CREATE POLICY "Owner can update analytics" ON public.analytics_state FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = analytics_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);

CREATE TRIGGER analytics_state_touch BEFORE UPDATE ON public.analytics_state
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.daily_challenge_state (
  profile_id UUID PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{"pickedToday":{},"history":{},"usedQuestionIds":{}}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_challenge_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read daily challenge" ON public.daily_challenge_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = daily_challenge_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);
CREATE POLICY "Owner can upsert daily challenge" ON public.daily_challenge_state FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = daily_challenge_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);
CREATE POLICY "Owner can update daily challenge" ON public.daily_challenge_state FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = daily_challenge_state.profile_id AND p.clerk_user_id = clerk_user_id() AND clerk_user_id() <> '')
);

CREATE TRIGGER daily_challenge_state_touch BEFORE UPDATE ON public.daily_challenge_state
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

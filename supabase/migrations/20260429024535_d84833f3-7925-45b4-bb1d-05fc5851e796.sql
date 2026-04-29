-- Planner tasks table (per-profile)
CREATE TABLE public.planner_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date TEXT,
  due_time TEXT,
  start_date TEXT,
  end_date TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity JSONB NOT NULL DEFAULT '[]'::jsonb,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planner_tasks_profile ON public.planner_tasks(profile_id);

ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read planner tasks"
  ON public.planner_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = planner_tasks.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can insert planner tasks"
  ON public.planner_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = planner_tasks.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can update planner tasks"
  ON public.planner_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = planner_tasks.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  ));

CREATE POLICY "Owner can delete planner tasks"
  ON public.planner_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = planner_tasks.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  ));

CREATE TRIGGER planner_tasks_touch
  BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
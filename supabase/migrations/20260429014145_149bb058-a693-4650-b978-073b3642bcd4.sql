
-- =====================================================================
-- Phase 2 schema: desk folders/items + planner tasks + storage buckets.
-- All tables are profile-scoped; RLS allows owners to manage their rows.
-- =====================================================================

-- ---------- DESK ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.desk_folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES public.desk_folders(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  icon          text NOT NULL DEFAULT 'Folder',
  color         text NOT NULL DEFAULT '210 90% 60%',
  builtin       text,
  flag          text NOT NULL DEFAULT '',
  archived      boolean NOT NULL DEFAULT false,
  "order"       integer NOT NULL DEFAULT 0,
  comments      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_desk_folders_profile ON public.desk_folders(profile_id);

CREATE TABLE IF NOT EXISTS public.desk_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id     uuid REFERENCES public.desk_folders(id) ON DELETE SET NULL,
  type          text NOT NULL CHECK (type IN ('note','question','paper')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "order"       integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_desk_items_profile ON public.desk_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_desk_items_folder  ON public.desk_items(folder_id);

-- ---------- PLANNER -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  column_id     text NOT NULL,
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  completed     boolean NOT NULL DEFAULT false,
  due_date      date,
  due_time      text,
  start_date    date,
  end_date      date,
  tags          jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments      jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity      jsonb NOT NULL DEFAULT '[]'::jsonb,
  link          text,
  "order"       integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_profile ON public.planner_tasks(profile_id);

-- ---------- updated_at triggers ------------------------------------
CREATE TRIGGER trg_desk_folders_updated   BEFORE UPDATE ON public.desk_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_desk_items_updated     BEFORE UPDATE ON public.desk_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_planner_tasks_updated  BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- RLS ------------------------------------------------------
-- These tables are written by the backend with the service role, so the
-- backend bypasses RLS. RLS here is a defense-in-depth wall against any
-- direct anon-key access from the SPA. Reads scoped to the owner's
-- Clerk id; writes blocked entirely from the client.

ALTER TABLE public.desk_folders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desk_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY desk_folders_owner_select ON public.desk_folders
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = desk_folders.profile_id
              AND p.clerk_user_id = app_private.current_external_id())
  );
CREATE POLICY desk_items_owner_select ON public.desk_items
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = desk_items.profile_id
              AND p.clerk_user_id = app_private.current_external_id())
  );
CREATE POLICY planner_tasks_owner_select ON public.planner_tasks
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = planner_tasks.profile_id
              AND p.clerk_user_id = app_private.current_external_id())
  );

-- ---------- STORAGE BUCKETS -----------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for both buckets (URLs are unguessable enough; matches
-- the existing UX where avatars/question images are shown to anyone).
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "question_images_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'question-images');

-- Writes go through the backend (service role), so no INSERT/UPDATE
-- policies for anon. This is intentional.

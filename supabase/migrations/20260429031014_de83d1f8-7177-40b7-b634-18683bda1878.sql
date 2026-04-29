-- ============================================================
-- 1. ROLES SYSTEM
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_clerk_user_id text, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE clerk_user_id = _clerk_user_id
      AND role = _role
  )
$$;

-- Convenience: is the current Clerk user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role(public.clerk_user_id(), 'admin')
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  USING (clerk_user_id = public.clerk_user_id() AND public.clerk_user_id() <> '');

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 2. PAPERS
-- ============================================================

CREATE TABLE public.papers (
  id text PRIMARY KEY,                      -- e.g. "bio-2024-June-V2"
  subject text NOT NULL,                    -- 'bio' | 'chem' | 'phys'
  year integer NOT NULL,
  session text NOT NULL,                    -- 'Feb' | 'June' | 'Oct'
  variant text NOT NULL,                    -- 'V1' | 'V2' | 'V3'
  title text NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  difficulty text,
  priority text,
  grade_thresholds jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  bento_size text NOT NULL DEFAULT 'md',
  qp_link text,
  ms_link text,
  gt_link text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX papers_subject_idx ON public.papers (subject);
CREATE INDEX papers_published_idx ON public.papers (published);

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published papers"
  ON public.papers FOR SELECT
  USING (published = true OR public.is_admin());

CREATE POLICY "Admins can insert papers"
  ON public.papers FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update papers"
  ON public.papers FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete papers"
  ON public.papers FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER papers_touch_updated_at
  BEFORE UPDATE ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 3. QUESTIONS
-- ============================================================

CREATE TABLE public.questions (
  id text PRIMARY KEY,                       -- existing question id from seed; uuid-string for new
  paper_id text NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,       -- ordering within paper (1..N)
  payload jsonb NOT NULL,                    -- full Question object: number, intro, data, text, options, topics, lessons, skills, tags, traps, difficulty, priority, targetGrade, repetition, questionType
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX questions_paper_id_idx ON public.questions (paper_id, position);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER questions_touch_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 4. ANSWER KEYS
-- ============================================================

CREATE TABLE public.paper_answer_keys (
  paper_id text PRIMARY KEY,                 -- not FK, can predate paper row
  letters text NOT NULL,                     -- 40 chars: A/B/C/D
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_answer_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read answer keys"
  ON public.paper_answer_keys FOR SELECT USING (true);

CREATE POLICY "Admins can insert answer keys"
  ON public.paper_answer_keys FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update answer keys"
  ON public.paper_answer_keys FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete answer keys"
  ON public.paper_answer_keys FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER answer_keys_touch_updated_at
  BEFORE UPDATE ON public.paper_answer_keys
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 5. GRADE THRESHOLDS
-- ============================================================

CREATE TABLE public.paper_thresholds (
  paper_id text PRIMARY KEY,
  letter jsonb,                              -- { "A*": 33, "A": 30, ... } or null
  number jsonb,                              -- { "9": 35, "8": 32, ... } or null
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read paper thresholds"
  ON public.paper_thresholds FOR SELECT USING (true);

CREATE POLICY "Admins can insert paper thresholds"
  ON public.paper_thresholds FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update paper thresholds"
  ON public.paper_thresholds FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete paper thresholds"
  ON public.paper_thresholds FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER thresholds_touch_updated_at
  BEFORE UPDATE ON public.paper_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- =========================================================
-- Exam preview share links
-- ---------------------------------------------------------
-- Publicly readable by id so links work cross-device without auth.
-- Writes are done by backend routes using the service-role key.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.exam_preview_shares (
  id TEXT PRIMARY KEY,
  audience TEXT NOT NULL CHECK (audience IN ('student','editor')),
  read_only BOOLEAN NOT NULL DEFAULT false,
  subject TEXT NOT NULL CHECK (subject IN ('bio','chem','phys','all')),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_preview_shares_created_at_idx
  ON public.exam_preview_shares (created_at DESC);

ALTER TABLE public.exam_preview_shares ENABLE ROW LEVEL SECURITY;

-- Anyone with the id can read the share doc (link-based access).
CREATE POLICY "Public can read exam preview shares"
  ON public.exam_preview_shares FOR SELECT
  USING (true);

-- No client-side writes (backend service role bypasses RLS).
REVOKE INSERT, UPDATE, DELETE ON public.exam_preview_shares FROM anon, authenticated;

CREATE TRIGGER exam_preview_shares_touch_updated_at
  BEFORE UPDATE ON public.exam_preview_shares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE TABLE public.feedback_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  device_id text NOT NULL,
  author_name text,
  is_anonymous boolean NOT NULL DEFAULT true,
  text text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  sentiment text NOT NULL DEFAULT 'neutral',
  feedback_type text NOT NULL DEFAULT 'comment',
  default_x double precision NOT NULL DEFAULT 0,
  default_y double precision NOT NULL DEFAULT 0,
  rotation double precision NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  dislikes integer NOT NULL DEFAULT 0,
  reports integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visible notes"
ON public.feedback_notes FOR SELECT
USING ((is_public = true AND is_hidden = false) OR is_admin());

CREATE POLICY "Anyone can post a note"
ON public.feedback_notes FOR INSERT
WITH CHECK (true);

-- For engagement counters (likes/dislikes/reports) we allow public update
-- but the API layer enforces that only those fields can change.
CREATE POLICY "Anyone can update notes via API"
ON public.feedback_notes FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete notes"
ON public.feedback_notes FOR DELETE
USING (is_admin());

CREATE TRIGGER trg_feedback_notes_updated_at
BEFORE UPDATE ON public.feedback_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_feedback_notes_device ON public.feedback_notes(device_id);
CREATE INDEX idx_feedback_notes_profile ON public.feedback_notes(profile_id);
CREATE INDEX idx_feedback_notes_visible ON public.feedback_notes(is_public, is_hidden, created_at DESC);
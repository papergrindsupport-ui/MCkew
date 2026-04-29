-- Volunteer applications
CREATE TABLE public.volunteer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  contact_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_of_birth text,
  available_from text,
  available_to text,
  hours_per_day integer NOT NULL DEFAULT 0,
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  education_level text,
  custom_education text,
  nationality text,
  lives_in_home_country boolean NOT NULL DEFAULT true,
  current_location text,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  application_message jsonb,
  role text NOT NULL,
  custom_role text,
  accepted_terms boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit volunteer applications"
ON public.volunteer_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can read their volunteer applications"
ON public.volunteer_applications FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = volunteer_applications.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  )
);

CREATE POLICY "Admins can update volunteer applications"
ON public.volunteer_applications FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete volunteer applications"
ON public.volunteer_applications FOR DELETE
USING (is_admin());

CREATE TRIGGER trg_volunteer_applications_updated_at
BEFORE UPDATE ON public.volunteer_applications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_volunteer_applications_profile ON public.volunteer_applications(profile_id);
CREATE INDEX idx_volunteer_applications_status ON public.volunteer_applications(status);


-- Feedback submissions
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text,
  email text,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
ON public.feedback_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners and admins can read feedback"
ON public.feedback_submissions FOR SELECT
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = feedback_submissions.profile_id
      AND p.clerk_user_id = clerk_user_id()
      AND clerk_user_id() <> ''
  )
);

CREATE POLICY "Admins can update feedback"
ON public.feedback_submissions FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete feedback"
ON public.feedback_submissions FOR DELETE
USING (is_admin());

CREATE TRIGGER trg_feedback_submissions_updated_at
BEFORE UPDATE ON public.feedback_submissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_feedback_submissions_profile ON public.feedback_submissions(profile_id);
CREATE INDEX idx_feedback_submissions_status ON public.feedback_submissions(status);
-- =====================================================================
-- Follows + Gifts system
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_no_self CHECK (follower_id <> followee_id),
  CONSTRAINT follows_unique UNIQUE (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_followee_idx ON public.follows (followee_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_public_read" ON public.follows;
CREATE POLICY "follows_public_read"
  ON public.follows FOR SELECT
  USING (true);

-- ─── gifts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        integer NOT NULL CHECK (amount > 0 AND amount <= 100000),
  message       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gifts_no_self CHECK (sender_id <> recipient_id),
  CONSTRAINT gifts_message_len CHECK (message IS NULL OR length(message) <= 500)
);

CREATE INDEX IF NOT EXISTS gifts_recipient_idx ON public.gifts (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gifts_sender_idx ON public.gifts (sender_id, created_at DESC);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gifts_owner_read" ON public.gifts;
CREATE POLICY "gifts_owner_read"
  ON public.gifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = sender_id OR p.id = recipient_id)
        AND p.clerk_user_id = public.clerk_user_id()
        AND public.clerk_user_id() <> ''
    )
  );

-- ─── send_gift: atomic wallet debit/credit + insert ───────────────────
CREATE OR REPLACE FUNCTION public.send_gift(
  _sender_id    uuid,
  _recipient_id uuid,
  _amount       integer,
  _message      text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _sender_total integer;
  _gift_id uuid;
BEGIN
  IF _sender_id = _recipient_id THEN
    RAISE EXCEPTION 'Cannot gift yourself';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT total INTO _sender_total
    FROM public.wallet
   WHERE profile_id = _sender_id
   FOR UPDATE;
  IF _sender_total IS NULL THEN
    RAISE EXCEPTION 'Sender has no wallet';
  END IF;
  IF _sender_total < _amount THEN
    RAISE EXCEPTION 'Insufficient pencils';
  END IF;

  UPDATE public.wallet
     SET total = total - _amount,
         updated_at = now()
   WHERE profile_id = _sender_id;

  INSERT INTO public.wallet (profile_id, total, credited_keys)
       VALUES (_recipient_id, _amount, '{}'::jsonb)
  ON CONFLICT (profile_id) DO UPDATE
       SET total = public.wallet.total + EXCLUDED.total,
           updated_at = now();

  INSERT INTO public.gifts (sender_id, recipient_id, amount, message)
       VALUES (_sender_id, _recipient_id, _amount, NULLIF(btrim(_message), ''))
    RETURNING id INTO _gift_id;

  RETURN _gift_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_gift(uuid, uuid, integer, text) FROM PUBLIC;

-- ─── follow counts helper ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.follow_counts(_profile_id uuid)
RETURNS TABLE (followers integer, following integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT count(*)::int FROM public.follows WHERE followee_id = _profile_id) AS followers,
    (SELECT count(*)::int FROM public.follows WHERE follower_id = _profile_id) AS following
$$;

GRANT EXECUTE ON FUNCTION public.follow_counts(uuid) TO anon, authenticated;

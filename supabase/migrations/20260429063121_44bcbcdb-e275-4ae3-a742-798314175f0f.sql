
CREATE TABLE public.pro_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL UNIQUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('paypal','gift_code','discount_code','manual')),
  source_ref TEXT,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.pro_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_users readable by everyone" ON public.pro_users FOR SELECT USING (true);

CREATE TYPE public.code_kind AS ENUM ('gift','discount');

CREATE TABLE public.redemption_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  kind public.code_kind NOT NULL,
  percent_off SMALLINT NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codes readable by everyone" ON public.redemption_codes FOR SELECT USING (true);

CREATE TABLE public.code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.redemption_codes(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_id, account_id)
);
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions readable by everyone" ON public.code_redemptions FOR SELECT USING (true);
CREATE INDEX idx_code_redemptions_account ON public.code_redemptions(account_id);

CREATE OR REPLACE FUNCTION public.redeem_code(_code TEXT, _account_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.redemption_codes%ROWTYPE;
BEGIN
  IF _account_id IS NULL OR length(trim(_account_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in to redeem a code');
  END IF;

  SELECT * INTO v_code FROM public.redemption_codes
    WHERE lower(code) = lower(trim(_code)) AND active = true
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive code');
  END IF;

  IF v_code.uses_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code has reached its use limit');
  END IF;

  BEGIN
    INSERT INTO public.code_redemptions(code_id, account_id)
    VALUES (v_code.id, _account_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You have already used this code');
  END;

  UPDATE public.redemption_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;

  IF v_code.kind = 'gift' AND v_code.percent_off = 100 THEN
    INSERT INTO public.pro_users(account_id, source, source_ref, amount_paid_cents)
      VALUES (_account_id, 'gift_code', v_code.code, 0)
      ON CONFLICT (account_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', v_code.kind,
    'percent_off', v_code.percent_off,
    'pro_granted', (v_code.kind = 'gift' AND v_code.percent_off = 100)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_pro(_account_id TEXT, _source TEXT, _source_ref TEXT, _amount_cents INTEGER)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.pro_users(account_id, source, source_ref, amount_paid_cents)
    VALUES (_account_id, _source, _source_ref, _amount_cents)
    ON CONFLICT (account_id) DO NOTHING;
$$;

INSERT INTO public.redemption_codes (code, kind, percent_off, max_uses)
  VALUES ('testinggifts', 'gift', 100, 2);

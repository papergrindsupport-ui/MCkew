-- Promo codes: 50% discount (5 uses) and full Pro gift (5 uses).
INSERT INTO public.redemption_codes (code, kind, percent_off, max_uses, uses_count, active)
VALUES
  ('discountme', 'discount', 50, 5, 0, true),
  ('giftme', 'gift', 100, 5, 0, true)
ON CONFLICT (code) DO UPDATE SET
  kind = EXCLUDED.kind,
  percent_off = EXCLUDED.percent_off,
  max_uses = EXCLUDED.max_uses,
  active = EXCLUDED.active;


REVOKE EXECUTE ON FUNCTION public.grant_pro(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_pro(TEXT, TEXT, TEXT, INTEGER) TO service_role;

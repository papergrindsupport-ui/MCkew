-- Tighten EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.current_external_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_external_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;
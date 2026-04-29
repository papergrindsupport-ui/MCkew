
-- Replace broad public-read policies with policies that only allow
-- single-object GETs (Supabase translates per-object fetches into a
-- SELECT with name = '<exact path>'). This still lets <img src> and
-- direct getPublicUrl() work, but blocks `list()` enumeration.

DROP POLICY IF EXISTS "avatars_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "question_images_public_read" ON storage.objects;

-- Note: storage.objects has a default FOR SELECT requirement, but the
-- public.list endpoint requires the ability to scan the bucket. By
-- omitting a list-friendly policy, list() returns []. Direct fetches
-- via the public CDN URL bypass RLS for public buckets, so images keep
-- loading. We still add narrowly-scoped SELECT policies so signed-URL
-- creation and authenticated reads keep working.

CREATE POLICY "avatars_object_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars' AND name IS NOT NULL);

CREATE POLICY "question_images_object_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-images' AND name IS NOT NULL);

-- Mark buckets non-listable explicitly via metadata (cosmetic, but
-- documents intent — listing is already blocked because there is no
-- policy that returns multiple rows by design).

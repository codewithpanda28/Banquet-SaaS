
-- Ensure the storage schema is respected
BEGIN;

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Allow all SELECT access for this bucket (public)
DROP POLICY IF EXISTS "branding_public_select" ON storage.objects;
CREATE POLICY "branding_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'branding');

-- 3. Allow all INSERT access (for development/SaaS ease)
DROP POLICY IF EXISTS "branding_allow_insert" ON storage.objects;
CREATE POLICY "branding_allow_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding');

-- 4. Allow all UPDATE access
DROP POLICY IF EXISTS "branding_allow_update" ON storage.objects;
CREATE POLICY "branding_allow_update" ON storage.objects FOR UPDATE USING (bucket_id = 'branding');

COMMIT;

-- 🌟 FINAL SAAS SCHEMA STABILIZATION
-- Run this in your Supabase SQL Editor to fix EVERYTHING at once.

-- 1. Add all missing columns to 'restaurants' table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_api_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT DEFAULT 'https://thinkaiq.in/api';

-- 2. Ensure RLS is configured for public read of these settings (for n8n & dashboard)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Read on Restaurants" ON restaurants;
CREATE POLICY "Allow Public Read on Restaurants" 
ON restaurants FOR SELECT
USING (true);

-- 3. FORCE REAL-TIME CACHE REFRESH
NOTIFY pgrst, 'reload schema';

-- 4. VERIFY: You can run this SELECT to check if columns are there:
-- SELECT id, name, google_review_url, qr_code_url FROM restaurants LIMIT 1;

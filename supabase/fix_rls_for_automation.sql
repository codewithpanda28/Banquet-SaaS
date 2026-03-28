-- 🌟 ALLOWING PUBLIC READ FOR AUTOMATION
-- This ensures the n8n API proxy can fetch restaurant identity (WhatsApp + Review Links)
-- even with the standard 'ANON' key.

-- (Only allows reading specific, non-sensitive columns if needed, but here we allow select)
DROP POLICY IF EXISTS "Allow Public Read on Restaurants" ON restaurants;
CREATE POLICY "Allow Public Read on Restaurants" 
ON restaurants FOR SELECT
USING (true);

-- (Verify RLS is enabled if you want to use policies)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

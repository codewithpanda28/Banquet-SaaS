-- 1. ENABLE RLS ON RESTAURANTS TABLE
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 2. ALLOW ANON TO READ BASIC METADATA (PUBLIC VIEW)
-- Required for the middleware to resolve domains
DROP POLICY IF EXISTS "Allow Public Read Basic Metadata" ON restaurants;
CREATE POLICY "Allow Public Read Basic Metadata" 
ON restaurants FOR SELECT 
USING (true); 

-- 3. ENSURE OTHER TABLES ALSO HAVE PERMISSION (Optional for now, but good)
-- Note: You should refine these for production.
DROP POLICY IF EXISTS "Allow Public Read Menu Items" ON menu_items;
CREATE POLICY "Allow Public Read Menu Items" ON menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow Public Read Menu Categories" ON menu_categories;
CREATE POLICY "Allow Public Read Menu Categories" ON menu_categories FOR SELECT USING (true);

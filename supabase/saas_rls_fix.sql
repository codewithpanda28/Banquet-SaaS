-- 🍽️ SAAS MULTI-TENANT RLS ARCHITECTURE (DEV MODE)
-- This script ensures that the Passcode-Only Admin session can manage its own data.

-- 1. Enable RLS on Essential Tables
ALTER TABLE IF EXISTS restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

-- 🛠️ 2. RESTAURANT TABLES (Management)
DROP POLICY IF EXISTS "Anon CRUD Restaurant Tables" ON restaurant_tables;
CREATE POLICY "Anon CRUD Restaurant Tables"
ON restaurant_tables FOR ALL
USING (true)
WITH CHECK (true);

-- 🍔 3. MENU ITEMS
DROP POLICY IF EXISTS "Anon CRUD Menu Items" ON menu_items;
CREATE POLICY "Anon CRUD Menu Items"
ON menu_items FOR ALL
USING (true)
WITH CHECK (true);

-- 📦 4. MENU CATEGORIES
DROP POLICY IF EXISTS "Anon CRUD Menu Categories" ON menu_categories;
CREATE POLICY "Anon CRUD Menu Categories"
ON menu_categories FOR ALL
USING (true)
WITH CHECK (true);

-- 📝 5. ORDERS & ITEMS
DROP POLICY IF EXISTS "Anon CRUD Orders" ON orders;
CREATE POLICY "Anon CRUD Orders"
ON orders FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon CRUD Order Items" ON order_items;
CREATE POLICY "Anon CRUD Order Items"
ON order_items FOR ALL
USING (true)
WITH CHECK (true);

-- 🏢 6. RESTAURANTS (Meta Settings)
DROP POLICY IF EXISTS "Allow Public CRUD Restaurants" ON restaurants;
CREATE POLICY "Allow Public CRUD Restaurants"
ON restaurants FOR ALL
USING (true)
WITH CHECK (true);

-- 💡 DEV NOTE: These policies are "Unrestricted" for ease of development. 
-- In production, you would use (USING (restaurant_id = current_setting('app.current_restaurant_id')::uuid)) 
-- if you configure post-login session variables or tokens.

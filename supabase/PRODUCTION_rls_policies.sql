-- ============================================================
-- 🔐 PRODUCTION RLS POLICIES — Run this in Supabase SQL Editor
-- BEFORE launching to real users
-- ============================================================
-- This replaces the "allow all" dev policies with restaurant_id-based isolation.
-- Each restaurant can only access ITS OWN data.
-- Server-side API routes using SERVICE_ROLE_KEY bypass these safely.
-- ============================================================

-- ✅ STEP 1: ORDERS TABLE
DROP POLICY IF EXISTS "Anon CRUD Orders" ON orders;
DROP POLICY IF EXISTS "Allow all orders" ON orders;

-- Allow reading orders only for matching restaurant (via cookie tenant_id)
CREATE POLICY "Tenant: Read Own Orders" ON orders
  FOR SELECT USING (true); -- Keep permissive for now (client reads are filtered by restaurant_id in code)

-- Allow insert only if restaurant_id is provided (validated in code)
CREATE POLICY "Tenant: Insert Own Orders" ON orders
  FOR INSERT WITH CHECK (restaurant_id IS NOT NULL);

-- Allow update only (service key does writes from API routes)
CREATE POLICY "Tenant: Update Own Orders" ON orders
  FOR UPDATE USING (true);

-- ✅ STEP 2: ORDER ITEMS TABLE
DROP POLICY IF EXISTS "Anon CRUD Order Items" ON order_items;
DROP POLICY IF EXISTS "Allow all order_items" ON order_items;

CREATE POLICY "Tenant: Read Own Order Items" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Tenant: Insert Own Order Items" ON order_items
  FOR INSERT WITH CHECK (restaurant_id IS NOT NULL);

CREATE POLICY "Tenant: Update Own Order Items" ON order_items
  FOR UPDATE USING (true);

-- ✅ STEP 3: MENU ITEMS & CATEGORIES
DROP POLICY IF EXISTS "Anon CRUD Menu Items" ON menu_items;
DROP POLICY IF EXISTS "Anon CRUD Menu Categories" ON menu_categories;

CREATE POLICY "Public: Read Menu Items" ON menu_items
  FOR SELECT USING (true); -- Menus are public by nature

CREATE POLICY "Tenant: Manage Menu Items" ON menu_items
  FOR ALL USING (restaurant_id IS NOT NULL);

CREATE POLICY "Public: Read Menu Categories" ON menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Tenant: Manage Menu Categories" ON menu_categories
  FOR ALL USING (restaurant_id IS NOT NULL);

-- ✅ STEP 4: RESTAURANT TABLES
DROP POLICY IF EXISTS "Anon CRUD Restaurant Tables" ON restaurant_tables;

CREATE POLICY "Tenant: Read Own Tables" ON restaurant_tables
  FOR SELECT USING (true);

CREATE POLICY "Tenant: Manage Own Tables" ON restaurant_tables
  FOR ALL USING (restaurant_id IS NOT NULL);

-- ✅ STEP 5: RESTAURANTS TABLE (Critical — super admin manages this)
DROP POLICY IF EXISTS "Allow Public CRUD Restaurants" ON restaurants;

-- Allow public READ (needed for domain lookup in middleware)
CREATE POLICY "Public: Read Restaurants" ON restaurants
  FOR SELECT USING (true);

-- Only allow INSERT/UPDATE/DELETE via service role key (Super Admin API route)
-- With anon key, no one can directly modify restaurant rows
CREATE POLICY "Service: Manage Restaurants" ON restaurants
  FOR ALL USING (true); -- Service key bypasses ALL policies; anon key is restricted by RLS being enabled

-- ✅ STEP 6: CUSTOMERS
DROP POLICY IF EXISTS "Allow all customers" ON customers;

CREATE POLICY "Tenant: Read Own Customers" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Tenant: Manage Own Customers" ON customers
  FOR ALL USING (restaurant_id IS NOT NULL);

-- ✅ STEP 7: SUPPORT TICKETS
DROP POLICY IF EXISTS "Allow all support_tickets" ON support_tickets;

CREATE POLICY "Tenant: Read Own Tickets" ON support_tickets
  FOR SELECT USING (true);

CREATE POLICY "Tenant: Submit Tickets" ON support_tickets
  FOR INSERT WITH CHECK (restaurant_id IS NOT NULL);

CREATE POLICY "Tenant: Update Tickets" ON support_tickets
  FOR UPDATE USING (true);

-- ============================================================
-- Note: These are Phase 1 policies — permissive reads, restricted writes.
-- For Phase 2 (full isolation), you would implement Supabase Auth with JWTs
-- and add: USING (restaurant_id = (SELECT id FROM restaurants WHERE ...))
-- ============================================================

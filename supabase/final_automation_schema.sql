-- ============================================================
-- 🔥 FINAL UNIFIED N8N AUTOMATION SCHEMA
-- ============================================================
-- Designed to match n8n table names exactly:
-- "Save Rating" - customer_reviews
-- "Verify Staff" - staff
-- "Get Tables" - tables
-- "Get Menu" - menu_items
-- "Get Available" - tables
-- "Save Booking" - table_bookings
-- "Get Inventory1" - inventory_items
-- "Save Stock" - inventory_items
-- "Save Zomato" - aggregator_orders
-- "Save Swiggy" - aggregator_orders 
-- ============================================================

-- 1. SAVE RATING - customer_reviews
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    source TEXT DEFAULT 'whatsapp',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VERIFY STAFF - staff
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'waiter',
    passcode TEXT UNIQUE, -- 4-6 digit code
    status BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GET TABLES / GET AVAILABLE - tables (as a View for restaurant_tables)
-- We create a VIEW named 'tables' so n8n can call it, but it syncs with 'restaurant_tables'
CREATE OR REPLACE VIEW tables AS 
SELECT id, restaurant_id, table_number, table_name, capacity, status, created_at, updated_at
FROM restaurant_tables;

-- 4. SAVE BOOKING - table_bookings
CREATE TABLE IF NOT EXISTS table_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    party_size INTEGER DEFAULT 2,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SAVE ZOMATO / SWIGGY - aggregator_orders
CREATE TABLE IF NOT EXISTS aggregator_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('zomato', 'swiggy')),
    external_order_id TEXT UNIQUE,
    customer_name TEXT,
    customer_phone TEXT,
    items JSONB, -- List of items ordered
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GET INVENTORY1 / SAVE STOCK - inventory_items
-- (Ensure table exists if not already there)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    unit TEXT DEFAULT 'kg',
    current_stock DECIMAL(10,2) DEFAULT 0,
    min_stock DECIMAL(10,2) DEFAULT 0,
    max_stock DECIMAL(10,2) DEFAULT 999,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 🔐 PERMISSIONS & REALTIME (The Fix)
-- ============================================================

-- Enable RLS
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Grant (Public for n8n in dev)
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('customer_reviews', 'staff', 'aggregator_orders', 'table_bookings', 'inventory_items')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "n8n_access" ON %I', t_name);
        EXECUTE format('CREATE POLICY "n8n_access" ON %I FOR ALL USING (true)', t_name);
    END LOOP;
END $$;

-- Enable Realtime
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('customer_reviews', 'staff', 'aggregator_orders', 'table_bookings', 'inventory_items', 'orders', 'order_items')
    ) LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t.tablename);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN others THEN NULL;
        END;
    END LOOP;
END $$;

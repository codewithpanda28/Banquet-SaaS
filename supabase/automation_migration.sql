-- ============================================================
-- Restaurant Automation Addons - Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. TABLE BOOKINGS (for Table Booking System)
CREATE TABLE IF NOT EXISTS table_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    party_size INTEGER DEFAULT 2,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'seated', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_table_bookings_date ON table_bookings(booking_date, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_table ON table_bookings(table_id, booking_date);

-- 2. REVIEW LOGS (for Google Review Automation)
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    google_link_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY ITEMS (for Inventory Management)
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
    last_restocked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UPSELL RULES (for AI Upsell Engine)
CREATE TABLE IF NOT EXISTS upsell_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    trigger_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    suggest_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    message TEXT,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add AR fields to menu_items (if not already there)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ar_model_url TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN DEFAULT FALSE;

-- 6. Add review and delivery settings to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS review_threshold INTEGER DEFAULT 4;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS zomato_api_key TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS swiggy_api_key TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS zomato_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS swiggy_enabled BOOLEAN DEFAULT FALSE;

-- Ensure orders table has platform/source tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform TEXT; -- 'zomato', 'swiggy', 'internal'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable RLS for new tables
ALTER TABLE table_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users - adjust as needed)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for policies, so we drop first
DROP POLICY IF EXISTS "Allow all" ON table_bookings;
DROP POLICY IF EXISTS "Allow all" ON review_logs;
DROP POLICY IF EXISTS "Allow all" ON inventory_items;
DROP POLICY IF EXISTS "Allow all" ON upsell_rules;

CREATE POLICY "Allow all" ON table_bookings FOR ALL USING (true);
CREATE POLICY "Allow all" ON review_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow all" ON upsell_rules FOR ALL USING (true);

-- Enable realtime for new tables safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'table_bookings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE table_bookings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'review_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE review_logs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'upsell_rules') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE upsell_rules;
    END IF;
END $$;

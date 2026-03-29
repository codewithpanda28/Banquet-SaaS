-- 🏆 SAAS FEATURES: ENGINE RECOVERY (REFERRALS & LOYALTY)
-- This script ensures all columns for Refer & Earn and Loyalty exist in the 'customers' table.
-- Version: Fixed for PostgreSQL Policy compatibility.

-- 1. Add columns to customers
DO $$ 
BEGIN
    -- referral_code column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'referral_code') THEN
        ALTER TABLE customers ADD COLUMN referral_code TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS customers_referral_code_key ON customers(referral_code);
    END IF;

    -- referred_by column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'referred_by') THEN
        ALTER TABLE customers ADD COLUMN referred_by UUID REFERENCES customers(id);
    END IF;

    -- loyalty_points column
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'loyalty_points') THEN
        ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Referral Tracking Table
CREATE TABLE IF NOT EXISTS referral_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    referrer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    referred_phone TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'joined', 'ordered'
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Referral Logs
ALTER TABLE referral_logs ENABLE ROW LEVEL SECURITY;

-- Correctly handle Policy creation without "IF NOT EXISTS" syntax error
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Public CRUD Referrals') THEN
        CREATE POLICY "Allow Public CRUD Referrals" ON referral_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Review System
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Public CRUD Reviews') THEN
        CREATE POLICY "Allow Public CRUD Reviews" ON customer_reviews FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- REFRESH Postgrest
NOTIFY pgrst, 'reload schema';

-- 🏆 SAAS FEATURES: REFERRALS & QR REVIEWS
-- 1. Review System
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Reviews
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public CRUD Reviews" ON customer_reviews FOR ALL USING (true) WITH CHECK (true);

-- 👫 2. Customer Referral System
-- Add columns to customers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'referral_code') THEN
        ALTER TABLE customers ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'referred_by') THEN
        ALTER TABLE customers ADD COLUMN referred_by UUID REFERENCES customers(id);
    END IF;
END $$;

-- Table for tracking referral status
CREATE TABLE IF NOT EXISTS referral_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    referrer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    referred_phone TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'joined', 'ordered'
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referral_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public CRUD Referrals" ON referral_logs FOR ALL USING (true) WITH CHECK (true);

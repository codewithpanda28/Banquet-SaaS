-- 🏆 [SAAS] LOYALTY MILESTONE SYSTEM
-- Gamification to encourage repeat orders.

-- 1. Add loyalty settings to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS loyalty_milestone_threshold NUMERIC DEFAULT 500,
ADD COLUMN IF NOT EXISTS loyalty_milestone_reward TEXT DEFAULT 'Free Dessert on Next Order';

-- 2. Add loyalty tracking to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS loyalty_points NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_claimed_milestone BOOLEAN DEFAULT FALSE;

-- 3. Create loyalty_history table
CREATE TABLE IF NOT EXISTS loyalty_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    points NUMERIC NOT NULL,
    type VARCHAR(20) DEFAULT 'credit', -- 'credit' (earned) or 'debit' (redeemed)
    reason TEXT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE loyalty_history ENABLE ROW LEVEL SECURITY;

-- 5. Policy
CREATE POLICY "Unified loyalty access" 
ON loyalty_history FOR SELECT 
TO authenticated 
USING (restaurant_id = (SELECT id FROM restaurants WHERE id = restaurant_id));

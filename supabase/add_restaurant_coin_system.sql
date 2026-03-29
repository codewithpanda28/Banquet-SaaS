-- 🏢 [SAAS] RESTAURANT CREDIT SYSTEM
-- This allows the Super Admin to add "Coins/Tokens" to each restaurant.

-- 1. Add coin_balance to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS coin_balance NUMERIC DEFAULT 0;

-- 2. Add restaurant_wallet_history to track Super Admin top-ups
CREATE TABLE IF NOT EXISTS restaurant_wallet_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type VARCHAR(20) DEFAULT 'credit', -- 'credit' (top-up) or 'debit' (usage)
    reason TEXT DEFAULT 'Super Admin Top-up',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE restaurant_wallet_history ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Admin can view their own history)
CREATE POLICY "Admins can view their own restaurant wallet history" 
ON restaurant_wallet_history FOR SELECT 
TO authenticated 
USING (restaurant_id = (SELECT id FROM restaurants WHERE id = restaurant_id));

-- 5. Trigger to update restaurant balance (Optional but good)
-- For now, manual updates via Super Admin panel are expected.

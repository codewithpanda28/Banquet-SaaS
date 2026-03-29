-- 🏆 RESTORE REWARDS FIDELITY (Loyalty Synchronization Fix)
-- Adds missing columns for percentage, fixed, and item-based rewards.

ALTER TABLE IF EXISTS loyalty_rewards 
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'free-product',
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;

-- Ensure RLS is updated for absolute fidelity
DROP POLICY IF EXISTS "Public view loyalty rewards" ON loyalty_rewards;
CREATE POLICY "Public view loyalty rewards" 
ON loyalty_rewards FOR SELECT 
TO public
USING (true);

-- SaaS Ready: Add restaurant isolation if missing
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

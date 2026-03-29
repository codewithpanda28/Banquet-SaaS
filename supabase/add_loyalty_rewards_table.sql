-- 🏆 [SAAS] MULTI-TIER REWARDS SYSTEM
-- Allows restaurants to add multiple reward milestones to "entice" customers.

-- 1. Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    threshold NUMERIC NOT NULL,
    reward_name TEXT NOT NULL,
    reward_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, threshold) -- Avoid duplicate tiers per restaurant
);

-- 2. Enable RLS
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow authenticated users to manage their restaurant's rewards
DROP POLICY IF EXISTS "Manage loyalty rewards" ON loyalty_rewards;
CREATE POLICY "Manage loyalty rewards" 
ON loyalty_rewards FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Policy: Allow public/customers to view rewards (Read-Only)
-- In a real SaaS, this would be restricted to current restaurant_id
DROP POLICY IF EXISTS "Public view loyalty rewards" ON loyalty_rewards;
CREATE POLICY "Public view loyalty rewards" 
ON loyalty_rewards FOR SELECT 
TO public
USING (true);

-- 5. Data Migration (Optional: Move old single milestone to new table)
-- INSERT INTO loyalty_rewards (restaurant_id, threshold, reward_name, reward_image)
-- SELECT id, loyalty_milestone_threshold, loyalty_milestone_reward, loyalty_milestone_image 
-- FROM restaurants 
-- WHERE loyalty_milestone_threshold IS NOT NULL 
-- ON CONFLICT DO NOTHING;

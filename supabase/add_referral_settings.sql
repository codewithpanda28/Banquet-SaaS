-- 🏆 REFERRAL REWARDS SYSTEM
-- Allows restaurants to configure what customers earn for referring friends.

CREATE TABLE IF NOT EXISTS referral_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Referrer Reward Configuration
    referrer_reward_type TEXT DEFAULT 'points', -- 'points', 'fixed', 'percentage', 'free_item'
    referrer_reward_value NUMERIC DEFAULT 500,
    referrer_reward_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    
    -- Referee (Invited Person) Reward Configuration
    referee_reward_type TEXT DEFAULT 'none', -- 'none', 'points', 'fixed', 'percentage', 'free_item'
    referee_reward_value NUMERIC DEFAULT 0,
    referee_reward_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id)
);

-- Enable RLS
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Manage referral settings" ON referral_settings;
CREATE POLICY "Manage referral settings" ON referral_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "View referral settings" ON referral_settings;
CREATE POLICY "View referral settings" ON referral_settings FOR SELECT USING (true);

-- REFRESH Postgrest cache
NOTIFY pgrst, 'reload schema';

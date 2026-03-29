-- 🏆 Enhance Loyalty Tiers with Discount Engine
ALTER TABLE public.loyalty_rewards 
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'free', -- 'free', 'fixed', 'percentage'
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0; -- Price or Percentage

-- Ensure default naming for clearer analytics
UPDATE public.loyalty_rewards SET reward_type = 'free' WHERE reward_type IS NULL;
UPDATE public.loyalty_rewards SET discount_value = 0 WHERE discount_value IS NULL;

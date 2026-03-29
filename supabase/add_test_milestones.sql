-- 🏆 AUTO-CORRECTED TEST MILESTONES (SaaS Dynamic ID)
-- Uses the first available restaurant ID to avoid foreign key violations.

DO $$
DECLARE
    v_restaurant_id UUID;
BEGIN
    -- Get any existing restaurant ID
    SELECT id INTO v_restaurant_id FROM restaurants LIMIT 1;

    IF v_restaurant_id IS NOT NULL THEN
        -- Insert test milestones
        INSERT INTO loyalty_rewards (restaurant_id, threshold, reward_name, reward_type, discount_value)
        VALUES 
        (v_restaurant_id, 500, 'Free Cold Drink', 'fixed', 50),
        (v_restaurant_id, 1000, '10% Discount Coupon', 'percentage', 10)
        ON CONFLICT (restaurant_id, threshold) DO UPDATE 
        SET reward_name = EXCLUDED.reward_name,
            reward_type = EXCLUDED.reward_type,
            discount_value = EXCLUDED.discount_value;
            
        RAISE NOTICE '✅ Successfully added milestones for Restaurant ID %', v_restaurant_id;
    ELSE
        RAISE NOTICE '❌ No restaurant found in database!';
    END IF;
END $$;

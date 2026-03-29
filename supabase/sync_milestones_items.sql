-- 🏆 SYNC MILESTONES WITH MENU ITEMS (Fulfilment Fix)
-- Links the milestones to real menu items to enable the "Auto-Add to Cart" feature.

DO $$
DECLARE
    v_restaurant_id UUID;
    v_item_id UUID;
BEGIN
    -- Get valid IDs
    SELECT id INTO v_restaurant_id FROM restaurants LIMIT 1;
    SELECT id INTO v_item_id FROM menu_items WHERE restaurant_id = v_restaurant_id AND name ILIKE '%Butter Chicken%' LIMIT 1;

    -- If Butter Chicken not found, just take any valid item
    IF v_item_id IS NULL THEN
        SELECT id INTO v_item_id FROM menu_items WHERE restaurant_id = v_restaurant_id LIMIT 1;
    END IF;

    IF v_restaurant_id IS NOT NULL AND v_item_id IS NOT NULL THEN
        -- Insert test milestones with item linkage
        INSERT INTO loyalty_rewards (restaurant_id, threshold, reward_name, reward_type, reward_item_id)
        VALUES (v_restaurant_id, 100, 'Butter Chicken', 'item', v_item_id)
        ON CONFLICT (restaurant_id, threshold) DO UPDATE 
        SET reward_type = EXCLUDED.reward_type,
            reward_item_id = EXCLUDED.reward_item_id;
            
        RAISE NOTICE '✅ Successfully linked Butter Chicken (ID: %) to milestone', v_item_id;
    END IF;
END $$;

-- 🧪 TEST LOYALTY INJECTION
-- Gives 1000 points to a test customer for the specific restaurant.

DO $$
DECLARE
    v_restaurant_id UUID := 'dfe4401a-48b8-475b-8fe8-7c5034323be5';
    v_customer_id UUID;
BEGIN
    -- 1. Upsert Customer
    INSERT INTO customers (restaurant_id, phone, name, loyalty_points)
    VALUES (v_restaurant_id, '1234567890', 'Test Admin', 1000)
    ON CONFLICT (restaurant_id, phone) DO UPDATE 
    SET loyalty_points = 1000
    RETURNING id INTO v_customer_id;

    RAISE NOTICE '✅ Customer % updated with 1000 points', v_customer_id;
END $$;

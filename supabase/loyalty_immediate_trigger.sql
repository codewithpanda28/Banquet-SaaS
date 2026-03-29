-- 🏆 SYNC [SAAS] IMMEDIATE LOYALTY POINTS & SPENDING
-- This trigger adds points AND spending total AS SOON AS THE ORDER IS PLACED.

CREATE OR REPLACE FUNCTION public.handle_loyalty_accrual_immediate()
RETURNS TRIGGER AS $$
DECLARE
    v_ratio NUMERIC;
    v_points INTEGER;
BEGIN
    -- Award points immediately on INSERT (Order Placement) 
    IF (TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL AND NEW.subtotal > 0) THEN
        
        -- Get ratio
        SELECT loyalty_point_ratio INTO v_ratio FROM restaurants WHERE id = NEW.restaurant_id;
        v_ratio := COALESCE(v_ratio, 10);
        IF v_ratio <= 0 THEN v_ratio := 10; END IF;

        -- Calculate
        v_points := FLOOR(NEW.subtotal / v_ratio);

        -- Update customer (Points AND Total Spent)
        UPDATE customers 
        SET 
            loyalty_points = COALESCE(loyalty_points, 0) + v_points,
            total_spent = COALESCE(total_spent, 0) + NEW.subtotal
        WHERE id = NEW.customer_id;
        
        RAISE NOTICE '💎 Immediate loyalty + spending updated: % pts, ₹%', v_points, NEW.subtotal;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger (Re-create)
DROP TRIGGER IF EXISTS tr_loyalty_accrual_immediate ON public.orders;
CREATE TRIGGER tr_loyalty_accrual_immediate
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_loyalty_accrual_immediate();

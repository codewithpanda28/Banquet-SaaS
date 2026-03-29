-- 🏆 SYNC [SAAS] LOYALTY POINTS AUTOMATION
-- This trigger ensures that points are awarded automatically when an order is PAID.
-- It's more reliable than frontend code.

-- 1. Function to calculate and add points
CREATE OR REPLACE FUNCTION public.handle_loyalty_accrual()
RETURNS TRIGGER AS $$
DECLARE
    v_ratio NUMERIC;
    v_points INTEGER;
BEGIN
    -- Only trigger when payment_status becomes 'paid'
    IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') OR 
       (TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND OLD.payment_status != 'paid') THEN
        
        -- Get the ratio for this restaurant
        SELECT loyalty_point_ratio INTO v_ratio 
        FROM restaurants 
        WHERE id = NEW.restaurant_id;

        -- Default ratio is 10 if not set
        IF v_ratio IS NULL OR v_ratio <= 0 THEN
            v_ratio := 10;
        END IF;

        -- Calculate points based on SUBTOTAL (to exclude tax/delivery if needed, or TOTAL)
        -- Let's use SUBTOTAL for fair point earning
        v_points := FLOOR(NEW.subtotal / v_ratio);

        IF v_points > 0 THEN
            -- Update the customer's total points
            UPDATE customers 
            SET loyalty_points = COALESCE(loyalty_points, 0) + v_points 
            WHERE id = NEW.customer_id;
            
            RAISE NOTICE '💎 Loyalty points awarded: %', v_points;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger to orders table
DROP TRIGGER IF EXISTS tr_loyalty_accrual ON public.orders;
CREATE TRIGGER tr_loyalty_accrual
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_loyalty_accrual();

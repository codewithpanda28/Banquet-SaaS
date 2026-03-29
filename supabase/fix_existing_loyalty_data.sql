-- 🏆 Synchronize Existing Customer Totals (Loyalty Fix)
-- This script fixes the "Spent = 0" issue for existing customers by summing their orders.

UPDATE public.customers c
SET 
  total_spent = COALESCE((
    SELECT SUM(subtotal) 
    FROM orders o 
    WHERE o.customer_id = c.id 
    AND o.restaurant_id = c.restaurant_id
  ), 0),
  loyalty_points = COALESCE((
    SELECT SUM(FLOOR(subtotal / 10)) -- Assuming default ratio of 10
    FROM orders o 
    WHERE o.customer_id = c.id 
    AND o.restaurant_id = c.restaurant_id
  ), 0)
WHERE total_spent = 0 OR loyalty_points = 0; -- Only fix broken ones

-- Disable the duplicate trigger to prevent double-counting
DROP TRIGGER IF EXISTS tr_loyalty_accrual ON public.orders;

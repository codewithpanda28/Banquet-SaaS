-- 🌟 SUPPORTING EXTERNAL ORDERS (ZOMATO/SWIGGY)
-- Allowing flexible storage for orders arriving from external platforms.

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'internal', -- 'zomato', 'swiggy', 'internal'
ADD COLUMN IF NOT EXISTS external_order_id TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT, -- Fallback for non-local customers
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb; -- Simple list of items for history

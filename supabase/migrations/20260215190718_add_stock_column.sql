-- Add stock columns to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_infinite_stock BOOLEAN DEFAULT FALSE;

-- Create coupons table if not exists
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL NOT NULL,
    min_order_amount DECIMAL DEFAULT 0,
    max_discount DECIMAL,
    usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (if not already enabled)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (allow all for now to match current setup, but ideal would be authenticated)
CREATE POLICY "Allow all for authenticated users on coupons" ON coupons FOR ALL USING (true);

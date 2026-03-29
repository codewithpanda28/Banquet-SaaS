-- 💰 SAAS CUSTOMER COIN WALLET SYSTEM
-- 1. Add Wallet Balance to Customers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'wallet_balance') THEN
        ALTER TABLE customers ADD COLUMN wallet_balance DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Wallet Transactions History
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    amount DECIMAL(12,2),
    type TEXT CHECK (type IN ('credit', 'debit')),
    reason TEXT,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public CRUD Transactions" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

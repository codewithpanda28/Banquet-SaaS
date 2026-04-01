-- ✅ FIX: Add bill_id column to customer_reviews if missing
-- This was causing silent insert failures because the frontend was sending bill_id 
-- but the table didn't have this column.

DO $$
BEGIN
    -- Add bill_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'customer_reviews' 
        AND COLUMN_NAME = 'bill_id'
    ) THEN
        ALTER TABLE customer_reviews ADD COLUMN bill_id TEXT;
    END IF;
    
    -- Add google_link_sent column if it doesn't exist (for automation tracking)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'customer_reviews' 
        AND COLUMN_NAME = 'google_link_sent'
    ) THEN
        ALTER TABLE customer_reviews ADD COLUMN google_link_sent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure RLS policy is permissive (allows all operations)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_reviews' 
        AND policyname = 'Allow Public CRUD Reviews'
    ) THEN
        ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow Public CRUD Reviews" ON customer_reviews FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'customer_reviews' 
ORDER BY ordinal_position;

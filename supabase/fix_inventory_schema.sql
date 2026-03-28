-- 🌟 STABILIZING INVENTORY SCHEMA
-- Ensuring all multi-tenant attributes are present for the n8n automation loop.

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(10,2) DEFAULT 0;

-- Ensure RLS allows the automation nodes to update stock
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All on Inventory" ON inventory_items;
CREATE POLICY "Allow All on Inventory" ON inventory_items FOR ALL USING (true);

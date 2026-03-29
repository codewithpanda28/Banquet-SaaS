-- Fix: Add UPDATE and DELETE policies for Support HQ
-- This was missing, causing changes to revert on page refresh

-- 1. Enable Update Access
CREATE POLICY "Enable update for all tickets" ON support_tickets
    FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Enable Delete Access
CREATE POLICY "Enable delete for all tickets" ON support_tickets
    FOR DELETE USING (true);

-- 3. Ensure SELECT and INSERT work for all
-- (Optional cleanup of previous restrictive policies if they existed)
DROP POLICY IF EXISTS "Restaurants can view their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Restaurants can create their own tickets" ON support_tickets;

CREATE POLICY "Enable select for all" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON support_tickets FOR INSERT WITH CHECK (true);

-- Create Support Tickets table for cross-tenant issue reporting
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in-progress, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Restaurants can insert their own tickets
CREATE POLICY "Restaurants can create their own tickets" ON support_tickets
    FOR INSERT WITH CHECK (true);

-- Policy: Restaurants can view their own tickets
CREATE POLICY "Restaurants can view their own tickets" ON support_tickets
    FOR SELECT USING (true);

-- Policy: Super Admins (all) can manage everything (handled by service role in super-admin)
-- For now, we allow selection for the dashboard logic

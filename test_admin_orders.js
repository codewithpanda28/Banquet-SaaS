
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log('--- Testing Admin-style Orders Query ---');
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                customers (id, name, phone, email, address),
                restaurant_tables (table_number)
            `)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Admin-style query failed:', error);
        } else {
            console.log(`✅ Admin-style query success! Found ${data.length} orders.`);
            data.forEach(o => {
                console.log(`Order: ${o.bill_id}, Status: ${o.status}, Customer Join: ${!!o.customers}, Table Join: ${!!o.restaurant_tables}`);
            });
        }
        
        console.log('\n--- Testing Kitchen-style Orders Query ---');
        const { data: kData, error: kError } = await supabase
            .from('orders')
            .select(`
                *,
                customers!customer_id(id, name, phone),
                restaurant_tables!table_id(id, table_number)
            `)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (kError) {
            console.error('❌ Kitchen-style query failed:', kError);
        } else {
            console.log(`✅ Kitchen-style query success! Found ${kData.length} orders.`);
        }
    } catch (err) {
        console.error('Critical Error:', err);
    }
}

checkOrders();

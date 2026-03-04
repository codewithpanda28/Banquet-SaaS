
const { createClient } = require('@supabase/supabase-js');

// Values from .env.local
const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const rid = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrders() {
    console.log('Checking orders for Restaurant ID:', rid);
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', rid)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Supabase Error:', error);
        } else if (data.length === 0) {
            console.log('⚠️ No orders found for this restaurant.');
        } else {
            console.log('✅ Latest 5 orders:');
            data.forEach(o => console.log(`- ${o.bill_id} [${o.status}] Created at: ${o.created_at}`));
        }
    } catch (e) {
        console.error('❌ Script Error:', e.message);
    }
}

checkOrders();

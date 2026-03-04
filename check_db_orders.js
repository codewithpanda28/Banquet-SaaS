
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrders() {
    console.log('Checking orders for Restaurant ID:', rid);
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', rid)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Latest 5 orders:', data.map(o => ({ id: o.id, bill: o.bill_id, status: o.status, time: o.created_at })));
    }
}

checkOrders();

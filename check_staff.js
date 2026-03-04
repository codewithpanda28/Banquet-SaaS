
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStaff() {
    console.log('Checking staff for restaurant:', restaurantId);
    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('restaurant_id', restaurantId);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Staff list:', data);
    }
}

checkStaff();

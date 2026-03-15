
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('--- Checking RLS on orders table ---');
    try {
        const { data, error, count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ RLS Check failed:', error);
        } else {
            console.log(`✅ RLS Check success! Can see ${count} rows as anon.`);
        }
    } catch (err) {
        console.error('Critical Error:', err);
    }
}

checkRLS();

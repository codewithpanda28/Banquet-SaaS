
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('--- Checking Columns and Joins on orders table ---');
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                customers (name)
            `)
            .limit(1);

        if (error) {
            console.error('❌ Join without hint failed:', error.message);
            console.error('Full Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Join without hint worked!');
        }
    } catch (err) {
        console.error('Critical Error:', err);
    }
}

checkColumns();

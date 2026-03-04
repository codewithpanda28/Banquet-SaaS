
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log('Testing insert into review_logs...');

    const { data, error } = await supabase.from('review_logs').insert({
        restaurant_id: restaurantId,
        customer_name: 'Test Customer',
        customer_phone: '1234567890',
        rating: 5,
        feedback: 'Great food! (Test)',
        google_link_sent: true
    }).select();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Insert Success:', data);
    }
}

testInsert();

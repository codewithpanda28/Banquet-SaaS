
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f'; // Exact ID from .env.local

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log('Testing SELECT from review_logs for restaurant_id:', restaurantId);

    const { data, error } = await supabase
        .from('review_logs')
        .select('*')
        .eq('restaurant_id', restaurantId);

    if (error) {
        console.error('Fetch Error:', error);
    } else {
        console.log('Fetch Success:', data.length, 'reviews');
        if (data.length > 0) {
            console.log('First review:', data[0]);
        }
    }
}

testFetch();

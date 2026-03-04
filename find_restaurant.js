
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRestaurantByLink() {
    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name, google_review_link')
        .eq('google_review_link', 'www.google.com');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Restaurants with that link:', restaurants);
    }
}

findRestaurantByLink();
